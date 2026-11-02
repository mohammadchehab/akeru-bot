import { describe, expect, it } from "@effect/vitest";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { aliasedEnv, readAliasedEnv } from "./envAliases.ts";

const readPort = (env: Record<string, string>) =>
  aliasedEnv(Config.port, "PORT")
    .parse(ConfigProvider.fromEnv({ env }))
    .pipe(Effect.map(Option.getOrUndefined));

describe("aliasedEnv", () => {
  it.effect("reads the ISNADI_ name", () =>
    Effect.gen(function* () {
      expect(yield* readPort({ ISNADI_PORT: "4100" })).toBe(4100);
    }),
  );

  it.effect("falls back to the legacy T3CODE_ name", () =>
    Effect.gen(function* () {
      expect(yield* readPort({ T3CODE_PORT: "4200" })).toBe(4200);
    }),
  );

  it.effect("prefers the ISNADI_ name when both are set", () =>
    Effect.gen(function* () {
      expect(yield* readPort({ ISNADI_PORT: "4100", T3CODE_PORT: "4200" })).toBe(4100);
    }),
  );

  it.effect("never aliases T3CODE_HOME to ISNADI_HOME", () =>
    Effect.gen(function* () {
      const readHome = (env: Record<string, string>) =>
        aliasedEnv(Config.string, "HOME")
          .parse(ConfigProvider.fromEnv({ env }))
          .pipe(Effect.map(Option.getOrUndefined));

      expect(yield* readHome({ T3CODE_HOME: "/home/user/.t3" })).toBeUndefined();
      expect(yield* readHome({ ISNADI_HOME: "/a", T3CODE_HOME: "/home/user/.t3" })).toBe("/a");
    }),
  );

  it.effect("reports a missing value as none", () =>
    Effect.gen(function* () {
      expect(yield* readPort({})).toBeUndefined();
    }),
  );
});

describe("readAliasedEnv", () => {
  // Only the service launcher reads HOME this way, from units IsnadiBot itself wrote.
  it("prefers ISNADI_ and falls back to T3CODE_", () => {
    expect(readAliasedEnv({ ISNADI_HOME: "/a", T3CODE_HOME: "/b" }, "HOME")).toBe("/a");
    expect(readAliasedEnv({ T3CODE_HOME: "/b" }, "HOME")).toBe("/b");
    expect(readAliasedEnv({ ISNADI_HOME: "  ", T3CODE_HOME: "/b" }, "HOME")).toBe("/b");
    expect(readAliasedEnv({}, "HOME")).toBeUndefined();
  });
});
