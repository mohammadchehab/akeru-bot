import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";
import { expect, it } from "vite-plus/test";

it("moves an Akeru-era ~/.akeru into ~/.isnadi, links it back, and keeps the environment ID", () => {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "isnadi-installer-akeru-"));
  const payload = NodePath.join(root, "payload", "Isnadi-Remote-1.2.3-linux-x64");
  const releases = NodePath.join(root, "release");
  const tools = NodePath.join(root, "tools");
  const home = NodePath.join(root, "home");
  const akeruUserdata = NodePath.join(home, ".akeru", "userdata");
  NodeFS.mkdirSync(NodePath.join(payload, "node", "bin"), { recursive: true });
  NodeFS.mkdirSync(releases);
  NodeFS.mkdirSync(tools);
  NodeFS.mkdirSync(akeruUserdata, { recursive: true });
  NodeFS.writeFileSync(NodePath.join(akeruUserdata, "state.sqlite"), "chats");

  const { publicKey, privateKey } = NodeCrypto.generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });

  const environmentId = `env-${NodeCrypto.createHash("sha256")
    .update(publicJwk.x ?? "")
    .digest("hex")}`;

  NodeFS.writeFileSync(
    NodePath.join(akeruUserdata, "remote-link-identity.json"),
    `${JSON.stringify({ environmentId, publicKey: publicJwk, privateKey: privateKey.export({ format: "jwk" }) })}\n`,
  );
  NodeFS.writeFileSync(NodePath.join(akeruUserdata, "environment-id"), `${environmentId}\n`);

  NodeFS.writeFileSync(NodePath.join(payload, "isnadi"), "#!/bin/sh\n", { mode: 0o755 });
  NodeFS.symlinkSync(process.execPath, NodePath.join(payload, "node", "bin", "node"));
  NodeFS.copyFileSync(
    new URL("./initialize-remote-identity.sh", import.meta.url),
    NodePath.join(payload, "initialize-remote-identity.sh"),
  );
  NodeFS.chmodSync(NodePath.join(payload, "initialize-remote-identity.sh"), 0o755);

  const archive = NodePath.join(releases, "Isnadi-Remote-1.2.3-linux-x64.tar.gz");
  expect(
    NodeChildProcess.spawnSync("tar", [
      "-czf",
      archive,
      "-C",
      NodePath.dirname(payload),
      NodePath.basename(payload),
    ]).status,
  ).toBe(0);

  const hash = NodeCrypto.createHash("sha256").update(NodeFS.readFileSync(archive)).digest("hex");
  NodeFS.writeFileSync(
    NodePath.join(releases, "ISNADI-REMOTE-MANIFEST.txt"),
    `${hash}  ${NodePath.basename(archive)}\n`,
  );
  NodeFS.writeFileSync(NodePath.join(releases, "ISNADI-REMOTE-MANIFEST.sig"), "test");
  NodeFS.writeFileSync(
    NodePath.join(tools, "curl"),
    `#!/bin/sh
destination=""
previous=""
for argument in "$@"; do
  [ "$previous" = -o ] && destination="$argument"
  previous="$argument"
done
for argument in "$@"; do source="$argument"; done
cp "$RELEASES/$(basename "$source")" "$destination"
`,
    { mode: 0o755 },
  );
  NodeFS.writeFileSync(NodePath.join(tools, "openssl"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  // The installer names the archive from uname; pin it to the linux-x64 fixture on any host.
  NodeFS.writeFileSync(
    NodePath.join(tools, "uname"),
    `#!/bin/sh
case "$1" in -s) echo Linux;; -m) echo x86_64;; *) /usr/bin/uname "$@";; esac
`,
    { mode: 0o755 },
  );

  // HOME is the temp directory, so the real home is never read or written.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    PATH: `${tools}:${process.env.PATH ?? ""}`,
    RELEASES: releases,
    ISNADI_VERSION: "v1.2.3",
    ISNADI_INSTALL_ROOT: NodePath.join(root, "install"),
    ISNADI_BIN_DIR: NodePath.join(root, "bin"),
  };

  delete env.ISNADI_HOME;
  delete env.T3CODE_HOME;
  NodeFS.mkdirSync(NodePath.join(root, "bin"));

  const result = NodeChildProcess.spawnSync(
    "sh",
    [NodePath.join(import.meta.dirname, "install-remote.sh"), "--no-tailscale", "--no-auto-update"],
    { env, encoding: "utf8" },
  );

  const isnadiUserdata = NodePath.join(home, ".isnadi", "userdata");

  expect(NodeFS.readFileSync(NodePath.join(isnadiUserdata, "state.sqlite"), "utf8")).toBe("chats");
  expect(NodeFS.readFileSync(NodePath.join(isnadiUserdata, "environment-id"), "utf8").trim()).toBe(
    environmentId,
  );
  expect(NodeFS.lstatSync(NodePath.join(home, ".akeru")).isSymbolicLink()).toBe(true);
  expect(NodeFS.realpathSync(NodePath.join(home, ".akeru"))).toBe(
    NodeFS.realpathSync(NodePath.join(home, ".isnadi")),
  );
  expect(result.stderr).not.toContain("--migrate-environment-id");
  NodeFS.rmSync(root, { recursive: true, force: true });
});

it("sets ISNADI_HOME for the Windows installer only after the elevated relaunch", () => {
  const installer = NodeFS.readFileSync(new URL("./install-remote.ps1", import.meta.url), "utf8");
  const relaunch = installer.indexOf("Start-Process powershell.exe -Verb RunAs");
  const assignment = installer.indexOf("$env:ISNADI_HOME = $RuntimeHome");

  // The elevated child inherits the parent's environment. If the parent had already set
  // ISNADI_HOME, the child would treat the home as user-chosen and never move ~/.akeru.
  expect(relaunch).toBeGreaterThan(-1);
  expect(assignment).toBeGreaterThan(relaunch);
  expect(installer.split("$env:ISNADI_HOME = $RuntimeHome").length - 1).toBe(1);
});
