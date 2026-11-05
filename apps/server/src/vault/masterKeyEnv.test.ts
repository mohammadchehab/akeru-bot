import * as NodeChildProcess from "node:child_process";

import { assert, describe, it } from "@effect/vitest";

import { definedEntries, serverChildEnv, takeMasterKeyEnv, withoutMasterKeyEnv } from "./masterKeyEnv.ts";

const SECRETS = { ISNADI_MASTER_KEY: "key-material", ISNADI_MASTER_PASSPHRASE: "pass-phrase" };

const readFromChild = (env: NodeJS.ProcessEnv): string =>
  NodeChildProcess.execFileSync(
    process.execPath,
    [
      "-e",
      "process.stdout.write(JSON.stringify([process.env.ISNADI_MASTER_KEY, process.env.ISNADI_MASTER_PASSPHRASE]))",
    ],
    { env },
  ).toString();

describe("master key environment", () => {
  it("takes the variables out of the environment and returns them", () => {
    const env: NodeJS.ProcessEnv = { ...SECRETS, PATH: "/bin" };
    const taken = takeMasterKeyEnv(env);

    assert.deepStrictEqual(taken, SECRETS);
    assert.deepStrictEqual(env, { PATH: "/bin" });
  });

  it("leaves a spawned child unable to see them after take", () => {
    const env: NodeJS.ProcessEnv = { ...SECRETS, PATH: process.env.PATH };

    takeMasterKeyEnv(env);

    assert.strictEqual(readFromChild(env), "[null,null]");
  });

  it("strips them from an env built from caller input", () => {
    const env: NodeJS.ProcessEnv = { ...SECRETS, PATH: process.env.PATH };

    assert.strictEqual(readFromChild(withoutMasterKeyEnv(env)), "[null,null]");
    assert.deepStrictEqual(env.ISNADI_MASTER_KEY, "key-material");
  });

  it("hands only the set variables to the one child meant to read them", () => {
    assert.deepStrictEqual(
      definedEntries({ ISNADI_MASTER_KEY: "k", ISNADI_MASTER_PASSPHRASE: undefined }),
      { ISNADI_MASTER_KEY: "k" },
    );
  });

  it("regression: a service-launcher server child gets the captured key back", () => {
    const launcherEnv: NodeJS.ProcessEnv = { PATH: process.env.PATH };
    const child = serverChildEnv(
      launcherEnv,
      { ISNADI_MASTER_KEY: "key-material", ISNADI_MASTER_PASSPHRASE: undefined },
      { CONTEXT: "x" },
    );

    assert.strictEqual(child.ISNADI_MASTER_KEY, "key-material");
    assert.isFalse("ISNADI_MASTER_PASSPHRASE" in child);
    assert.strictEqual(child.CONTEXT, "x");
    assert.strictEqual(readFromChild(child), '["key-material",null]');
  });
});
