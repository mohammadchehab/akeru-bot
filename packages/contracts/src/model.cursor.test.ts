import { describe, expect, it } from "vite-plus/test";

import {
  DEFAULT_MODEL_BY_PROVIDER,
  PROVIDER_ACCOUNT_NAMES,
  PROVIDER_DISPLAY_NAMES,
} from "./model.ts";
import { ProviderDriverKind } from "./providerInstance.ts";

describe("Cursor driver model defaults", () => {
  const cursor = ProviderDriverKind.make("cursor");

  it("names the driver and its account", () => {
    expect(PROVIDER_DISPLAY_NAMES[cursor]).toBe("Cursor");
    expect(PROVIDER_ACCOUNT_NAMES[cursor]).toBe("Cursor");
  });

  it("defaults to Cursor's own `auto` model, since the real list is per account", () => {
    expect(DEFAULT_MODEL_BY_PROVIDER[cursor]).toBe("auto");
  });
});
