import { assert, it } from "@effect/vitest";

import { detectCliRunner, formatCliCommand, suggestedPackageSpec } from "./invocation.ts";

it("detects package runners from their cache entry paths", () => {
  assert.equal(
    detectCliRunner("/home/leo/.npm/_npx/abc123/node_modules/isnadibot/dist/bin.mjs"),
    "npx",
  );
  assert.equal(
    detectCliRunner(
      "C:\\Users\\leo\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\isnadibot\\dist\\bin.mjs",
    ),
    "npx",
  );
  assert.equal(
    detectCliRunner("/home/leo/.cache/pnpm/dlx/abc/node_modules/isnadibot/dist/bin.mjs"),
    "pnpm dlx",
  );
  assert.equal(
    detectCliRunner(
      "/home/leo/.local/share/pnpm/.pnpm/dlx/abc/node_modules/isnadibot/dist/bin.mjs",
    ),
    "pnpm dlx",
  );
  assert.equal(
    detectCliRunner(
      "C:\\Users\\leo\\AppData\\Local\\pnpm-cache\\dlx\\abc\\node_modules\\isnadibot\\dist\\bin.mjs",
    ),
    "pnpm dlx",
  );
  assert.equal(
    detectCliRunner("/home/leo/.bun/install/cache/isnadibot@0.0.31/dist/bin.mjs"),
    "bunx",
  );
  assert.equal(
    detectCliRunner("/tmp/bunx-1000-isnadibot@latest/node_modules/isnadibot/dist/bin.mjs"),
    "bunx",
  );
  assert.equal(
    detectCliRunner(
      "C:\\Users\\leo\\AppData\\Local\\Temp\\bunx-0-isnadibot@latest\\node_modules\\isnadibot\\dist\\bin.mjs",
    ),
    "bunx",
  );
});

it("treats stable installs as direct invocations", () => {
  assert.isNull(detectCliRunner("/usr/local/lib/node_modules/isnadibot/dist/bin.mjs"));
  assert.isNull(detectCliRunner("/home/leo/Code/work/isnadibot/apps/server/dist/bin.mjs"));
  assert.isNull(
    detectCliRunner("/home/leo/.isnadi/runtime/0.0.31/node_modules/isnadibot/dist/bin.mjs"),
  );
  assert.isNull(detectCliRunner(""));
});

it("suggests the stable package for every installed version", () => {
  assert.equal(suggestedPackageSpec("0.0.31-nightly.20260729"), "isnadibot");
  assert.equal(suggestedPackageSpec("0.0.31"), "isnadibot");
});

it("formats serve suggestions to match the launching command", () => {
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/home/leo/.npm/_npx/abc/node_modules/isnadibot/dist/bin.mjs",
      version: "0.0.31-nightly.20260729",
    }),
    "npx isnadibot serve",
  );
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/tmp/bunx-1000-isnadibot@latest/node_modules/isnadibot/dist/bin.mjs",
      version: "0.0.31",
    }),
    "bunx isnadibot serve",
  );
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/usr/local/lib/node_modules/isnadibot/dist/bin.mjs",
      version: "0.0.31-nightly.20260729",
    }),
    "akeru serve",
  );
});
