import * as NodeChildProcess from "node:child_process";

import { assert, describe, it } from "@effect/vitest";

import { takeMasterKeyEnv, withoutMasterKeyEnv } from "./masterKeyEnv.ts";

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
});
