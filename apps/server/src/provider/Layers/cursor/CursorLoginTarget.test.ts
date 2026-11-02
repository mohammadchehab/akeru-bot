import {
  DEFAULT_SERVER_SETTINGS,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerSettings,
} from "@isnadi/contracts";
import * as Result from "effect/Result";
import { describe, expect, it } from "vite-plus/test";

import { resolveCursorLoginTarget } from "./CursorLoginTarget.ts";

const settings = (patch: Partial<ServerSettings>): ServerSettings => ({
  ...DEFAULT_SERVER_SETTINGS,
  ...patch,
});

describe("resolveCursorLoginTarget", () => {
  it("uses the legacy Cursor settings for the default instance", () => {
    const target = resolveCursorLoginTarget(
      settings({
        providers: {
          ...DEFAULT_SERVER_SETTINGS.providers,
          cursor: { ...DEFAULT_SERVER_SETTINGS.providers.cursor, binaryPath: "/opt/agent" },
        },
      }),
      ProviderInstanceId.make("cursor"),
    );

    expect(Result.getOrUndefined(target)).toMatchObject({ binaryPath: "/opt/agent" });
  });

  it("uses the instance's own binary path and environment", () => {
    const target = resolveCursorLoginTarget(
      settings({
        providerInstances: {
          [ProviderInstanceId.make("cursor_work")]: {
            driver: ProviderDriverKind.make("cursor"),
            config: { binaryPath: "/work/agent" },
            environment: [{ name: "CURSOR_CONFIG_DIR", value: "/work/cursor" }],
          },
        },
      }),
      ProviderInstanceId.make("cursor_work"),
    );

    expect(Result.getOrUndefined(target)?.binaryPath).toBe("/work/agent");
    expect(Result.getOrUndefined(target)?.env.CURSOR_CONFIG_DIR).toBe("/work/cursor");
  });

  it("refuses an instance that does not exist", () => {
    expect(
      Result.isFailure(resolveCursorLoginTarget(settings({}), ProviderInstanceId.make("nope"))),
    ).toBe(true);
  });

  it("refuses an instance that belongs to another driver", () => {
    expect(
      Result.isFailure(
        resolveCursorLoginTarget(
          settings({
            providerInstances: {
              [ProviderInstanceId.make("work_codex")]: { driver: ProviderDriverKind.make("codex") },
            },
          }),
          ProviderInstanceId.make("work_codex"),
        ),
      ),
    ).toBe(true);
  });
});
