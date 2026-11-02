#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$Tag = $env:ISNADI_VERSION,
  [switch]$NoTailscale,
  [switch]$NoAutoUpdate,
  [switch]$PrepareOnly,
  # SHA-256 from the signed release manifest, verified by the running server before an update.
  [string]$ExpectedSha256,
  [switch]$MigrateEnvironmentId
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$Repository = if ($env:ISNADI_REMOTE_REPOSITORY) { $env:ISNADI_REMOTE_REPOSITORY } else { "mohammadchehab/isnadibot" }
if ($Repository -ne "mohammadchehab/isnadibot" -and $env:ISNADI_REMOTE_ALLOW_CUSTOM_REPOSITORY -ne "1") { throw "Custom release repositories require ISNADI_REMOTE_ALLOW_CUSTOM_REPOSITORY=1." }

# The pinned Isnadi release key. Keep it identical to scripts/isnadi-release-manifest.pub.
$ManifestPublicKeyBase64 = "MCowBQYDK2VwAyEAPNo7VRdcCSxGKbI8eKLnzQ55YnTTcjLzj84AuAdjNjU="

# Verifies an Ed25519 signature (RFC 8032). Windows PowerShell 5.1 has no Ed25519 and Windows ships no
# openssl, and the archive must not be unpacked to borrow its node.exe before it is verified.
function Test-IsnadiEd25519Signature {
  param([byte[]]$Message, [byte[]]$Signature, [byte[]]$PublicKey)
  Add-Type -AssemblyName System.Numerics
  if ($Signature.Length -ne 64 -or $PublicKey.Length -ne 32) { return $false }
  $Zero = [Numerics.BigInteger]::Zero
  $One = [Numerics.BigInteger]::One
  $Two = [Numerics.BigInteger]::new(2)
  $P = [Numerics.BigInteger]::Pow($Two, 255) - [Numerics.BigInteger]::new(19)
  $L = [Numerics.BigInteger]::Pow($Two, 252) + [Numerics.BigInteger]::Parse("27742317777372353535851937790883648493")
  function Mod([Numerics.BigInteger]$Value, [Numerics.BigInteger]$Modulus) {
    $r = [Numerics.BigInteger]::Remainder($Value, $Modulus)
    if ($r.Sign -lt 0) { $r = $r + $Modulus }
    return $r
  }
  function Invert([Numerics.BigInteger]$Value) { return [Numerics.BigInteger]::ModPow($Value, $P - $Two, $P) }
  function FromLittleEndian([byte[]]$Bytes) { return [Numerics.BigInteger]::new([byte[]]($Bytes + [byte]0)) }
  $D = Mod (([Numerics.BigInteger]::new(-121665)) * (Invert ([Numerics.BigInteger]::new(121666)))) $P
  $SqrtMinusOne = [Numerics.BigInteger]::ModPow($Two, ($P - $One) / [Numerics.BigInteger]::new(4), $P)
  # Returns @(x, y), or $null when the encoding is not a point on the curve.
  function Decode-Point([byte[]]$Bytes) {
    $copy = [byte[]]$Bytes.Clone()
    $oddX = ($copy[31] -band 0x80) -ne 0
    $copy[31] = $copy[31] -band 0x7f
    $y = FromLittleEndian $copy
    if ($y -ge $P) { return $null }
    $y2 = Mod ($y * $y) $P
    $x2 = Mod (($y2 - $One) * (Invert (Mod ($D * $y2 + $One) $P))) $P
    $x = [Numerics.BigInteger]::ModPow($x2, ($P + [Numerics.BigInteger]::new(3)) / [Numerics.BigInteger]::new(8), $P)
    if ((Mod ($x * $x) $P) -ne $x2) { $x = Mod ($x * $SqrtMinusOne) $P }
    if ((Mod ($x * $x) $P) -ne $x2) { return $null }
    if ($x.IsZero -and $oddX) { return $null }
    if ($x.IsEven -eq $oddX) { $x = $P - $x }
    return @($x, $y)
  }
  function Add-Points($A, $B) {
    $t = Mod ($D * $A[0] * $B[0] * $A[1] * $B[1]) $P
    $x = Mod (($A[0] * $B[1] + $B[0] * $A[1]) * (Invert (Mod ($One + $t) $P))) $P
    $y = Mod (($A[1] * $B[1] + $A[0] * $B[0]) * (Invert (Mod ($One - $t) $P))) $P
    return @($x, $y)
  }
  function Multiply-Point($Point, [Numerics.BigInteger]$Scalar) {
    $result = @($Zero, $One)
    $addend = $Point
    while ($Scalar.Sign -gt 0) {
      if (-not $Scalar.IsEven) { $result = Add-Points $result $addend }
      $addend = Add-Points $addend $addend
      $Scalar = [Numerics.BigInteger]::Divide($Scalar, $Two)
    }
    return $result
  }
  $A = Decode-Point $PublicKey
  $R = Decode-Point ([byte[]]$Signature[0..31])
  if (-not $A -or -not $R) { return $false }
  $S = FromLittleEndian ([byte[]]$Signature[32..63])
  if ($S -ge $L) { return $false }
  $baseY = Mod ([Numerics.BigInteger]::new(4) * (Invert ([Numerics.BigInteger]::new(5)))) $P
  $baseEncoding = [byte[]]$baseY.ToByteArray()
  $baseBytes = New-Object byte[] 32
  [Array]::Copy($baseEncoding, $baseBytes, [Math]::Min($baseEncoding.Length, 32))
  $Base = Decode-Point $baseBytes
  $sha512 = [Security.Cryptography.SHA512]::Create()
  try { $digest = $sha512.ComputeHash([byte[]]($Signature[0..31] + $PublicKey + $Message)) } finally { $sha512.Dispose() }
  $k = Mod (FromLittleEndian $digest) $L
  $left = Multiply-Point $Base $S
  $right = Add-Points $R (Multiply-Point $A $k)
  return ($left[0] -eq $right[0]) -and ($left[1] -eq $right[1])
}

$InstallRoot = if ($env:ISNADI_INSTALL_ROOT) { $env:ISNADI_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "Isnadi\Remote" }
$BinDir = if ($env:ISNADI_BIN_DIR) { $env:ISNADI_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "Isnadi\bin" }
# Isnadi state always lives in ISNADI_HOME or ~/.isnadi. The bundled server reads T3CODE_HOME, so it is
# derived here and never taken from an ambient T3 Code environment.
$RuntimeHome = if ($env:ISNADI_HOME) { $env:ISNADI_HOME } else { Join-Path $HOME ".isnadi" }
$env:ISNADI_HOME = $RuntimeHome
$env:T3CODE_HOME = $RuntimeHome
$IsAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $PrepareOnly -and -not $IsAdministrator) {
  if (-not $PSCommandPath) { throw "Save the installer to a file before running it so Windows can request administrator access." }
  $Forward = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath)
  if ($Tag) { $Forward += @("-Tag", $Tag) }
  if ($NoTailscale) { $Forward += "-NoTailscale" }
  if ($NoAutoUpdate) { $Forward += "-NoAutoUpdate" }
  if ($MigrateEnvironmentId) { $Forward += "-MigrateEnvironmentId" }
  if ($ExpectedSha256) { $Forward += @("-ExpectedSha256", $ExpectedSha256) }
  $process = Start-Process powershell.exe -Verb RunAs -ArgumentList $Forward -Wait -PassThru
  exit $process.ExitCode
}

$Release = if ($Tag) {
  Invoke-RestMethod -Headers @{ "User-Agent" = "Isnadi-Remote-Installer" } "https://api.github.com/repos/$Repository/releases/tags/$Tag"
} else {
  Invoke-RestMethod -Headers @{ "User-Agent" = "Isnadi-Remote-Installer" } "https://api.github.com/repos/$Repository/releases/latest"
}
$Tag = [string]$Release.tag_name
if ($Tag -notmatch '^v[0-9]') { throw "Could not resolve the latest Isnadi release." }
$Version = $Tag.Substring(1)
# Releases publish Isnadi Remote for Windows x64 only.
$Architecture = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { throw "Isnadi Remote releases are not published for Windows arm64 yet. Use Docker or build from source." } elseif ([Environment]::Is64BitOperatingSystem) { "x64" } else { throw "Isnadi Remote requires 64-bit Windows." }
$ArchiveName = "Isnadi-Remote-$Version-win32-$Architecture.zip"
$Asset = $Release.assets | Where-Object name -eq $ArchiveName | Select-Object -First 1
if (-not $Asset) { throw "Release $Tag does not include $ArchiveName." }
if (([string]$Asset.digest) -notmatch '^sha256:([a-fA-F0-9]{64})$') { throw "GitHub did not provide a SHA-256 digest for $ArchiveName." }
$ExpectedHash = $Matches[1].ToLowerInvariant()
$Temporary = Join-Path ([IO.Path]::GetTempPath()) ("isnadi-install-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $Temporary | Out-Null
try {
  $Archive = Join-Path $Temporary $ArchiveName
  Invoke-WebRequest -UseBasicParsing -Uri $Asset.browser_download_url -OutFile $Archive
  $ActualHash = (Get-FileHash -Algorithm SHA256 $Archive).Hash.ToLowerInvariant()
  if ($ActualHash -ne $ExpectedHash) { throw "SHA-256 verification failed for $ArchiveName." }
  $ManifestAsset = $Release.assets | Where-Object name -eq "ISNADI-REMOTE-MANIFEST.txt" | Select-Object -First 1
  $SignatureAsset = $Release.assets | Where-Object name -eq "ISNADI-REMOTE-MANIFEST.sig" | Select-Object -First 1
  if (-not $ManifestAsset -or -not $SignatureAsset) { throw "Release $Tag does not include a signed manifest." }
  $ManifestFile = Join-Path $Temporary "ISNADI-REMOTE-MANIFEST.txt"
  $SignatureFile = Join-Path $Temporary "ISNADI-REMOTE-MANIFEST.sig"
  Invoke-WebRequest -UseBasicParsing -Uri $ManifestAsset.browser_download_url -OutFile $ManifestFile
  Invoke-WebRequest -UseBasicParsing -Uri $SignatureAsset.browser_download_url -OutFile $SignatureFile
  $ManifestBytes = [IO.File]::ReadAllBytes($ManifestFile)
  $PublicKeyBytes = [Convert]::FromBase64String($ManifestPublicKeyBase64)
  if (-not (Test-IsnadiEd25519Signature $ManifestBytes ([IO.File]::ReadAllBytes($SignatureFile)) ([byte[]]$PublicKeyBytes[($PublicKeyBytes.Length - 32)..($PublicKeyBytes.Length - 1)]))) { throw "The release manifest signature did not verify for $Tag." }
  $ManifestHash = $null
  foreach ($Line in ([Text.Encoding]::UTF8.GetString($ManifestBytes) -split "`r?`n")) {
    $Entry = [regex]::Match($Line, "^([a-fA-F0-9]{64})\s+\*?$([regex]::Escape($ArchiveName))$")
    if ($Entry.Success) { $ManifestHash = $Entry.Groups[1].Value.ToLowerInvariant(); break }
  }
  if (-not $ManifestHash) { throw "The signed release manifest does not list $ArchiveName." }
  if ($ManifestHash -ne $ActualHash) { throw "The archive does not match the signed release manifest for $ArchiveName." }
  if ($ExpectedSha256 -and $ActualHash -ne $ExpectedSha256.ToLowerInvariant()) { throw "The archive does not match the signed release manifest for $ArchiveName." }
  $Expanded = Join-Path $Temporary "expanded"
  Expand-Archive -LiteralPath $Archive -DestinationPath $Expanded
  $Source = Join-Path $Expanded "isnadi"
  if (-not (Test-Path (Join-Path $Source "isnadi.cmd"))) { throw "The Isnadi Remote archive is incomplete." }
  $Versions = Join-Path $InstallRoot "versions"
  $Target = Join-Path $Versions $Version
  New-Item -ItemType Directory -Force -Path $Versions, $BinDir | Out-Null
  if (-not (Test-Path $Target)) { Move-Item -LiteralPath $Source -Destination $Target }
  if ($PrepareOnly) { Write-Host "Prepared Isnadi Remote $Version for a transactional service update."; exit 0 }

  New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeHome "userdata") | Out-Null
  if ($MigrateEnvironmentId) { $env:ISNADI_REMOTE_ALLOW_IDENTITY_MIGRATION = "1" }
  & (Join-Path $Target "node\node.exe") (Join-Path $Target "initialize-remote-identity.cjs")
  if ($LASTEXITCODE -ne 0) { throw "Could not initialize the remote environment identity." }

  $Current = Join-Path $InstallRoot "current"
  $Previous = Join-Path $InstallRoot "previous"
  if (Test-Path $Current) {
    $oldTarget = (Get-Item $Current).Target
    Remove-Item $Previous -Force -ErrorAction SilentlyContinue
    if ($oldTarget) { New-Item -ItemType Junction -Path $Previous -Target $oldTarget | Out-Null }
    Remove-Item $Current -Force
  }
  New-Item -ItemType Junction -Path $Current -Target $Target | Out-Null
  $StableLauncher = "@echo off`r`ncall `"$Current\isnadi.cmd`" %*`r`n"
  Set-Content -LiteralPath (Join-Path $BinDir "isnadi.cmd") -Value $StableLauncher -Encoding Ascii
  if (($env:PATH -split ';') -notcontains $BinDir) { $env:PATH = "$BinDir;$env:PATH" }
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (($UserPath -split ';') -notcontains $BinDir) { [Environment]::SetEnvironmentVariable("Path", (($UserPath.TrimEnd(';') + ";" + $BinDir).TrimStart(';')), "User") }
  Set-Content -LiteralPath (Join-Path $Target "REMOTE_MODE") -Value $(if ($NoTailscale) { "direct" } else { "tailscale" }) -Encoding Ascii

  $Tailscale = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
  if (-not $NoTailscale) {
    if (-not (Test-Path $Tailscale)) {
      $PackagePage = (Invoke-WebRequest -UseBasicParsing "https://pkgs.tailscale.com/stable/").Content
      $TailscaleArchitecture = if ($Architecture -eq "arm64") { "arm64" } else { "amd64" }
      $match = [regex]::Match($PackagePage, "tailscale-setup-([0-9.]+)-$TailscaleArchitecture\.msi")
      if (-not $match.Success) { throw "Could not resolve the current Tailscale Windows installer." }
      $MsiName = $match.Value
      $Msi = Join-Path $Temporary $MsiName
      Invoke-WebRequest -UseBasicParsing "https://pkgs.tailscale.com/stable/$MsiName" -OutFile $Msi
      $PublishedHash = ((Invoke-WebRequest -UseBasicParsing "https://pkgs.tailscale.com/stable/$MsiName.sha256").Content -split '\s+')[0].ToLowerInvariant()
      if ((Get-FileHash -Algorithm SHA256 $Msi).Hash.ToLowerInvariant() -ne $PublishedHash) { throw "Tailscale installer verification failed." }
      $msi = Start-Process msiexec.exe -ArgumentList @("/i", "`"$Msi`"", "/qn", "TS_UNATTENDEDMODE=always", "TS_INSTALLUPDATES=always") -Wait -PassThru
      if ($msi.ExitCode -notin @(0, 3010)) { throw "Tailscale installation failed with exit code $($msi.ExitCode)." }
    }
    & $Tailscale up --unattended=true
    if ($LASTEXITCODE -ne 0) { throw "Tailscale sign-in did not finish." }
    $env:ISNADI_TAILSCALE_PATH = $Tailscale
    $env:T3CODE_TAILSCALE_SERVE = "true"
  }
  $Runtime = Join-Path $RuntimeHome "runtime"
  $Pinned = Join-Path $Runtime "versions\$Version"
  $StatePath = Join-Path $Runtime "service-state.json"
  if (Test-Path $StatePath) {
    $State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    if ($State.update.status -eq "pending") { throw "A service update is pending. Finish it before reinstalling." }
  }
  $TaskName = "Isnadi Remote"
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName
  }
  New-Item -ItemType Directory -Force -Path $Runtime, (Join-Path $Runtime "versions"), (Join-Path $RuntimeHome "userdata\logs") | Out-Null
  # Rebuild the pinned runtime from this run's verified archive, so a partial or older copy is never kept.
  $Verified = if (Test-Path $Source) { $Source } else { $Target }
  $Staging = Join-Path $Runtime ("versions\.staging-" + [Guid]::NewGuid())
  Copy-Item -LiteralPath $Verified -Destination $Staging -Recurse
  Set-Content -LiteralPath (Join-Path $Staging ".install-complete") -Value $Version -Encoding Ascii
  # Keep the old runtime until the new one is in place, so a failed move leaves the service runnable.
  $Previous = if (Test-Path $Pinned) { $Pinned + ".previous-" + [Guid]::NewGuid() } else { $null }
  if ($Previous) { Move-Item -LiteralPath $Pinned -Destination $Previous }
  try {
    Move-Item -LiteralPath $Staging -Destination $Pinned
  } catch {
    if ($Previous) { Move-Item -LiteralPath $Previous -Destination $Pinned }
    throw
  }
  if ($Previous) {
    # The new runtime is already in place, so a leftover old copy must not stop the service restart.
    try { Remove-Item -LiteralPath $Previous -Recurse -Force -ErrorAction Stop }
    catch { Write-Warning "Could not remove the previous runtime at ${Previous}: $($_.Exception.Message)" }
  }
  Copy-Item -LiteralPath (Join-Path $Verified "node_modules\isnadibot\dist\service-launcher.mjs") -Destination $Runtime -Force
  $ServiceState = @{ protocol = 2; activeVersion = $Version } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText($StatePath, "$ServiceState`n", [Text.UTF8Encoding]::new($false))
  function Quote-PowerShellLiteral([string]$Value) { return "'" + $Value.Replace("'", "''") + "'" }
  $TaskEnvironment = @(
    "`$env:ISNADI_HOME = $(Quote-PowerShellLiteral $RuntimeHome)",
    "`$env:T3CODE_HOME = $(Quote-PowerShellLiteral $RuntimeHome)",
    "`$env:ISNADI_SERVICE_RUNTIME_ROOT = $(Quote-PowerShellLiteral $Target)",
    "`$env:ISNADI_INSTALL_ROOT = $(Quote-PowerShellLiteral $InstallRoot)",
    "`$env:PATH = $(Quote-PowerShellLiteral $env:PATH)",
    "`$env:ISNADI_TAILSCALE_PATH = $(Quote-PowerShellLiteral $Tailscale)",
    "`$env:T3CODE_TAILSCALE_SERVE = $(Quote-PowerShellLiteral $(if ($NoTailscale) { 'false' } else { 'true' }))"
  )
  $ServiceScript = Join-Path $Runtime "start-remote.ps1"
  $ServiceCommand = "& $(Quote-PowerShellLiteral (Join-Path $Target 'node\node.exe')) $(Quote-PowerShellLiteral (Join-Path $Runtime 'service-launcher.mjs')) *>> $(Quote-PowerShellLiteral (Join-Path $RuntimeHome 'userdata\logs\boot-service.log'))"
  Set-Content -LiteralPath $ServiceScript -Value ($TaskEnvironment + $ServiceCommand + "exit `$LASTEXITCODE") -Encoding UTF8
  $PowerShell = Join-Path $PSHOME "powershell.exe"
  $Principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType S4U -RunLevel Limited
  $ServiceAction = New-ScheduledTaskAction -Execute $PowerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ServiceScript`""
  $ServiceTrigger = New-ScheduledTaskTrigger -AtStartup
  $ServiceSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $TaskName -Action $ServiceAction -Trigger $ServiceTrigger -Settings $ServiceSettings -Principal $Principal -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName

  $RemoteEndpoint = $null
  if (-not $NoTailscale) {
    $Status = (& $Tailscale status --json | ConvertFrom-Json)
    $DnsName = [string]$Status.Self.DNSName
    if ($DnsName) { $RemoteEndpoint = "https://" + $DnsName.TrimEnd('.') }
  }
  $Healthy = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      if ($RemoteEndpoint) { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 $RemoteEndpoint | Out-Null; $Healthy = $true; break }
      $state = Get-Content (Join-Path $RuntimeHome "userdata\server-runtime.json") -Raw | ConvertFrom-Json
      Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://127.0.0.1:$($state.port)/" | Out-Null; $Healthy = $true; break
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $Healthy) { throw "The Isnadi service did not become healthy. Run `isnadi remote doctor` for details." }
  if ($RemoteEndpoint) {
    $RuntimePort = (Get-Content (Join-Path $RuntimeHome "userdata\server-runtime.json") -Raw | ConvertFrom-Json).port
    $EnvironmentId = (Get-Content (Join-Path $RuntimeHome "userdata\environment-id") -Raw).Trim()
    $ServeRecord = @{ environmentId = $EnvironmentId; endpoint = $RemoteEndpoint; httpsPort = 443; proxyTarget = "http://127.0.0.1:$RuntimePort" } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText((Join-Path $RuntimeHome "userdata\remote-serve.json"), "$ServeRecord`n", [Text.UTF8Encoding]::new($false))
  }
  if (-not $NoAutoUpdate) {
    $Launcher = Join-Path $BinDir "isnadi.cmd"
    $UpdateScript = Join-Path $Runtime "update-remote.ps1"
    Set-Content -LiteralPath $UpdateScript -Value ($TaskEnvironment + "& $(Quote-PowerShellLiteral $Launcher) remote update" + 'exit $LASTEXITCODE') -Encoding UTF8
    $UpdateAction = New-ScheduledTaskAction -Execute $PowerShell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$UpdateScript`""
    $UpdateTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(15) -RepetitionInterval (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName "Isnadi Remote Update" -Action $UpdateAction -Trigger $UpdateTrigger -Principal $Principal -Force | Out-Null
  }
  Write-Host "`nIsnadi Remote $Version is installed."
  if ($RemoteEndpoint) { Write-Host "Direct URL: $RemoteEndpoint" }
  Write-Host "Pair your first admin device: isnadi pair --admin"
  Write-Host "Diagnostics: isnadi remote doctor"
} finally {
  Remove-Item -LiteralPath $Temporary -Recurse -Force -ErrorAction SilentlyContinue
}
