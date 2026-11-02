# Run with Windows PowerShell 5.1; no network or Pester is needed.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$installerScript = Join-Path $PSScriptRoot 'install-remote.ps1'
$ast = [Management.Automation.Language.Parser]::ParseFile($installerScript, [ref]$null, [ref]$null)
$function = $ast.Find({
    param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-IsnadiEd25519Signature'
  }, $true)
if (-not $function) { throw 'The installer does not define Test-IsnadiEd25519Signature.' }
. ([scriptblock]::Create($function.Extent.Text))

$keyBase64 = 'AzkfrRbqGf1uahWr8XUCCTcE2G7OCcK7FapokjvPoyg='
$otherKeyBase64 = 'dU3g6HlxJeYAeMdzWg21AlKHKyAGe7/jDKylkdRffbY='
$messageBase64 = 'YWFhYSAgSXNuYWRpLVJlbW90ZS0wLjAuMS13aW4zMi14NjQuemlwCg=='
$signatureBase64 = '59SPuU2ZsFlNb4o1qwV41S90FBPeyZJtq3qjbZmYAwmOfgK+knRoZfFeTpGlBp/UdBa06KKhCQdLmEP0E7sdCw=='

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Verify {
  param([string]$Message = $messageBase64, [string]$Signature = $signatureBase64, [string]$Key = $keyBase64)
  return [bool](Test-IsnadiEd25519Signature ([Convert]::FromBase64String($Message)) ([Convert]::FromBase64String($Signature)) ([Convert]::FromBase64String($Key)))
}

Assert-True (Verify) 'A valid signature must verify.'

$tamperedMessage = [Convert]::FromBase64String($messageBase64)
$tamperedMessage[0] = $tamperedMessage[0] -bxor 1
Assert-True (-not (Verify -Message ([Convert]::ToBase64String($tamperedMessage)))) 'A changed manifest must not verify.'

$tamperedSignature = [Convert]::FromBase64String($signatureBase64)
$tamperedSignature[40] = $tamperedSignature[40] -bxor 1
Assert-True (-not (Verify -Signature ([Convert]::ToBase64String($tamperedSignature)))) 'A changed signature must not verify.'

Assert-True (-not (Verify -Key $otherKeyBase64)) 'A signature from another key must not verify.'
Assert-True (-not (Verify -Signature ([Convert]::ToBase64String((New-Object byte[] 64))))) 'An all-zero signature must not verify.'
Assert-True (-not (Verify -Signature ([Convert]::ToBase64String((New-Object byte[] 10))))) 'A short signature must not verify.'

# The signature scalar must be below the group order (RFC 8032 section 5.1.7).
$malleable = [Convert]::FromBase64String($signatureBase64)
for ($i = 32; $i -lt 64; $i++) { $malleable[$i] = 0xff }
Assert-True (-not (Verify -Signature ([Convert]::ToBase64String($malleable)))) 'A signature scalar above the group order must not verify.'

Write-Host 'Remote installer signature checks passed.'
