import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { DesktopEnvironmentBootstrapSchema, DesktopSshEnvironmentTargetSchema } from "./ipc.ts";

describe("DesktopEnvironmentBootstrapSchema", () => {
  const decode = Schema.decodeUnknownSync(DesktopEnvironmentBootstrapSchema);

  it("preserves the concrete running distro separately from the backend id", () => {
    expect(
      decode({
        id: "wsl:default",
        label: "WSL (Ubuntu)",
        runningDistro: "Ubuntu",
        httpBaseUrl: "http://127.0.0.1:3774/",
        wsBaseUrl: "ws://127.0.0.1:3774/",
      }),
    ).toEqual({
      id: "wsl:default",
      label: "WSL (Ubuntu)",
      runningDistro: "Ubuntu",
      httpBaseUrl: "http://127.0.0.1:3774/",
      wsBaseUrl: "ws://127.0.0.1:3774/",
    });
  });

  it("allows non-running and non-WSL bootstraps to report no running distro", () => {
    expect(
      decode({
        id: "primary",
        label: "Windows",
        runningDistro: null,
        httpBaseUrl: null,
        wsBaseUrl: null,
      }).runningDistro,
    ).toBeNull();
  });
});

describe("DesktopSshEnvironmentTargetSchema", () => {
  const decode = Schema.decodeUnknownSync(DesktopSshEnvironmentTargetSchema);
  const target = { alias: "devbox", hostname: "devbox.example.com", username: "julius", port: 22 };

  it("accepts ordinary targets", () => {
    expect(decode(target)).toEqual(target);
    expect(decode({ ...target, username: null })).toEqual({ ...target, username: null });
  });

  it.each(["-oProxyCommand=x", "-J host", "dev box", "dev\tbox", "dev\nbox", "dev\u001b[0mbox"])(
    "rejects %j in alias, hostname and username",
    (value) => {
      expect(() => decode({ ...target, alias: value })).toThrow();
      expect(() => decode({ ...target, hostname: value })).toThrow();
      expect(() => decode({ ...target, username: value })).toThrow();
    },
  );
});
