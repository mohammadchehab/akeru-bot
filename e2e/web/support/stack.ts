import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeHttp from "node:http";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { startStubOpenAI, STUB_MODEL, type StubOpenAI } from "./stubOpenAI.ts";

const REPO_ROOT = NodeURL.fileURLToPath(new URL("../../..", import.meta.url));

// Terminal colors may wrap the line, so match only the URL itself.
const PAIRING_URL_PATTERN = /(http:\/\/[\w.:-]+\/pair#token=[\w-]+)/;

const STARTUP_TIMEOUT_MS = 180_000;

// Shorter than the hook timeout, so a stuck wait fails with its reason instead of timing out the hook.
const SERVED_TIMEOUT_MS = 90_000;

export const STUB_INSTANCE_ID = "custom_openai_e2e";

/** The entry script of a Vite index page, whichever order its attributes come in. */
const ENTRY_SCRIPT_PATTERN =
  /<script[^>]*type="module"[^>]*src="([^"]+)"|<script[^>]*src="([^"]+)"[^>]*type="module"/;

const POLL_INTERVAL_MS = 250;

/**
 * Waits until the dev stack can serve a browser: the web server answers `/`, has transformed its
 * entry module, and the API proxy reaches the server. The server prints its pairing URL as soon as
 * it listens, which can be well before Vite is ready, and a cold first page load against a busy
 * machine then outlasts the browser's own action timeouts. Each step waits on what it needs.
 */
async function waitUntilServed(origin: string, budgetMs: number): Promise<void> {
  const startedAt = performance.now();
  let lastSeen = "no response";

  const fetchText = (path: string): Promise<string | null> =>
    new Promise((resolve) => {
      const request = NodeHttp.get(new URL(path, origin), (response) => {
        const chunks: Array<Buffer> = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const ok = response.statusCode !== undefined && response.statusCode < 400;

          lastSeen = `HTTP ${String(response.statusCode)}`;

          resolve(ok ? Buffer.concat(chunks).toString("utf8") : null);
        });
        response.on("error", () => resolve(null));
      });

      // Nothing is listening yet.
      request.on("error", (error) => {
        lastSeen = error.message;
        resolve(null);
      });
    });

  const served = async (path: string): Promise<string> => {
    for (;;) {
      const body = await fetchText(path);

      if (body !== null) return body;

      if (performance.now() - startedAt > budgetMs)
        throw new Error(`${path} was not served by ${origin} in time (last: ${lastSeen}).`);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  };

  const page = await served("/");
  const entry = ENTRY_SCRIPT_PATTERN.exec(page);
  const entryPath = entry?.[1] ?? entry?.[2];

  // Requesting the entry makes Vite transform it now, not on the browser's first load.
  if (entryPath) await served(entryPath);

  await served("/api/auth/session");
}

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

  try {
    await waitUntilServed(new URL(pairingUrl).origin, SERVED_TIMEOUT_MS);
  } catch (error) {
    await stop();

    throw error;
  }

  return { pairingUrl, stub, stop };
}
