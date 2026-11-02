import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { describe, expect, it } from "@effect/vitest";

import { RELEASE_MANIFEST_KEY } from "./releaseManifest.ts";

const repoRoot = NodePath.resolve(import.meta.dirname, "../../../..");

const readRepoFile = (path: string) => NodeFS.readFileSync(NodePath.join(repoRoot, path), "utf8");

const pinnedKey = readRepoFile("scripts/isnadi-release-manifest.pub").trim();

const keyBody = pinnedKey.split("\n")[1] ?? "";

// The installers and the admin script verify manifests before the server runs, so each carries
// its own copy of the key. They must all match the file the release workflow signs against.
const COPIES_OF_KEY = [
  "apps/web/public/install",
  "apps/web/public/install.ps1",
  "scripts/install-remote.ps1",
  "scripts/install-remote.sh",
  "scripts/isnadi-remote-admin.mjs",
];

describe("pinned release manifest key", () => {
  it("is a single-line Ed25519 public key", () => {
    expect(keyBody).toMatch(/^MCowBQYDK2VwAyEA[A-Za-z0-9+/]{43}=$/);
  });

  it("matches the key compiled into the server", () => {
    expect(RELEASE_MANIFEST_KEY).toBe(pinnedKey);
  });

  it.each(COPIES_OF_KEY)("matches the copy in %s", (path) => {
    expect(readRepoFile(path)).toContain(keyBody);
  });
});
