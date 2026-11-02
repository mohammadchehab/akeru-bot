import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { startStubOpenAI, STUB_MODEL, type StubOpenAI } from "./stubOpenAI.ts";

const REPO_ROOT = NodeURL.fileURLToPath(new URL("../../..", import.meta.url));

// Terminal colors may wrap the line, so match only the URL itself.
const PAIRING_URL_PATTERN = /(http:\/\/[\w.:-]+\/pair#token=[\w-]+)/;

const STARTUP_TIMEOUT_MS = 180_000;

export const STUB_INSTANCE_ID = "custom_openai_e2e";

export interface Stack {
  /** One-time URL that pairs a fresh browser with the environment. */
  readonly pairingUrl: string;
  readonly stub: StubOpenAI;
  readonly stop: () => Promise<void>;
}

/**
 * Starts the real dev stack (server and web, single origin) against a throwaway
 * home and a stub OpenAI-compatible endpoint, with that endpoint preconfigured
 * as the only provider instance. Nothing here touches `~/.isnadi`.
 */
export async function startStack(): Promise<Stack> {
  const stub = await startStubOpenAI();
  const home = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "isnadi-e2e-"));

  NodeFS.mkdirSync(NodePath.join(home, "userdata"), { recursive: true });
  NodeFS.writeFileSync(
    NodePath.join(home, "userdata", "settings.json"),
    JSON.stringify({
      providerInstances: {
        [STUB_INSTANCE_ID]: {
          driver: "customOpenai",
          displayName: "E2E stub",
          config: { baseUrl: stub.baseUrl, customModels: [STUB_MODEL] },
        },
      },
    }),
  );

  // The dev runner shells out to `vp`, which lives in the workspace's bin.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${NodePath.join(REPO_ROOT, "node_modules", ".bin")}${NodePath.delimiter}${process.env.PATH ?? ""}`,
  };

  // Dev is single-origin; baked origins would break pairing.
  delete env.VITE_HTTP_URL;
  delete env.VITE_WS_URL;

  // The throwaway --home-dir must win; an inherited home would point the stack at live state.
  delete env.ISNADI_HOME;
  delete env.AKERU_HOME;
  delete env.T3CODE_HOME;

  // Detached so the whole process tree can be signalled as one group.
  const child = NodeChildProcess.spawn(
    process.execPath,
    ["scripts/dev-runner.ts", "dev", "--home-dir", home],
    { cwd: REPO_ROOT, env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );

  let output = "";

  const pairingUrl = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`No pairing URL within ${String(STARTUP_TIMEOUT_MS)}ms.\n${output}`)),
      STARTUP_TIMEOUT_MS,
    );

    const onData = (data: Buffer) => {
      output = (output + data.toString("utf8")).slice(-20_000);

      const match = PAIRING_URL_PATTERN.exec(output);

      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`The dev runner exited with ${String(code)} before pairing.\n${output}`));
    });
  });

  const stop = async () => {
    if (child.pid !== undefined && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // The group is already gone.
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try {
            if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
          } catch {
            // Nothing left to kill.
          }

          resolve();
        }, 10_000);

        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    await stub.close();
    NodeFS.rmSync(home, { recursive: true, force: true });
  };

  return { pairingUrl, stub, stop };
}
