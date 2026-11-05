import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { assert, describe, it } from "@effect/vitest";

const SRC = NodePath.resolve(import.meta.dirname, "..");

const sourceFiles = (dir: string): string[] =>
  NodeFS.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = NodePath.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full);

    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });

describe("master key env guard", () => {
  it("every non-test file that spreads process.env into a child env strips the master vars", () => {
    const offenders = sourceFiles(SRC).filter((file) => {
      const text = NodeFS.readFileSync(file, "utf8");

      return text.includes("...process.env") && !text.includes("withoutMasterKeyEnv");
    });

    assert.deepStrictEqual(
      offenders.map((file) => NodePath.relative(SRC, file)),
      [],
    );
  });
});
