import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";
import { expect, it } from "vite-plus/test";

const read = (path: string) => NodeFS.readFileSync(new URL(path, import.meta.url), "utf8");

const dockerfile = read("./Dockerfile");

const compose = read("./compose.yaml");

const composeDirect = read("./compose.direct.yaml");

const release = read("../../.github/workflows/release.yml");

const entrypoint = read("./isnadi-entrypoint.sh");

const dockerignore = read("../../.dockerignore");

it("health-gates the image on the server's environment endpoint", () => {
  expect(dockerfile).toMatch(
    /HEALTHCHECK [^\n]*\\\n\s+CMD curl -fsS http:\/\/127\.0\.0\.1:3773\/\.well-known\/t3\/environment/,
  );
  expect(compose).toContain("${ISNADI_IMAGE:-isnadi-remote:local}");
  expect(dockerfile).toContain(
    "ISNADI_SERVER_ENTRYPOINT=/opt/isnadi/node_modules/isnadibot/dist/bin.mjs",
  );
  expect(dockerfile).toContain("ISNADI_REMOTE_CONTAINER=1");
  expect(entrypoint).toContain('exec /opt/isnadi/remote-admin "$@"');
});

it("never schedules the unsupported hosted heartbeat command", () => {
  for (const file of [dockerfile, compose, composeDirect, entrypoint]) {
    expect(file).not.toContain("heartbeat");
  }
});

it("does not build or publish a Docker release artifact", () => {
  expect(release).not.toContain("docker build");
  expect(release).not.toContain("docker save");
  expect(release).not.toContain("Isnadi-Remote-Docker");
});

it("keeps Isnadi's data in ISNADI_HOME and ignores an ambient T3CODE_HOME", () => {
  expect(dockerfile).toContain("ISNADI_HOME=/data");

  for (const file of [dockerfile, compose, composeDirect]) {
    expect(file).not.toContain("T3CODE_HOME");
  }

  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "isnadi-entrypoint-"));

  try {
    const entry = NodePath.join(root, "isnadi");
    // Replace the container paths with a probe that reports the server's resolved home.
    NodeFS.writeFileSync(
      entry,
      entrypoint
        .replace("/opt/isnadi/initialize-remote-identity.sh", "true")
        .replace(
          /exec node \/opt\/isnadi\/node_modules\/isnadibot\/dist\/bin\.mjs "\$@"/,
          'printf "%s|%s" "$ISNADI_HOME" "$T3CODE_HOME"',
        ),
      { mode: 0o755 },
    );

    const run = (env: Record<string, string>) =>
      NodeChildProcess.spawnSync("sh", [entry, "serve"], {
        env: { PATH: process.env.PATH ?? "", HOME: root, ...env },
        encoding: "utf8",
      }).stdout;

    expect(run({ T3CODE_HOME: "/legacy/.t3" })).toBe(`${root}/.isnadi|${root}/.isnadi`);
    expect(run({ T3CODE_HOME: "/legacy/.t3", ISNADI_HOME: "/data" })).toBe("/data|/data");
  } finally {
    NodeFS.rmSync(root, { recursive: true, force: true });
  }
});

it("keeps root and nested environment and private-key files out of the Docker context", () => {
  expect(dockerignore).toContain(".env.*");
  expect(dockerignore).toContain("**/.env.*");
  expect(dockerignore).toContain(".env*");
  expect(dockerignore).toContain("**/.env*");
  expect(dockerignore).toContain("!.env.example");
  expect(dockerignore).toContain("!**/.env.example");
  expect(dockerignore).toContain("**/*.pem");
  expect(dockerignore).toContain("**/*.key");
});
