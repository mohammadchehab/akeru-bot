import { EnvironmentId } from "@isnadi/contracts";
import { Predicate } from "effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearAgentAwarenessRegistrationRecord,
  loadAgentAwarenessDeviceId,
  loadPreferences,
  loadSavedConnections,
  savePreferencesPatch,
  saveConnection,
} from "../persistence/imperative";
import { LEGACY_PRODUCT_PREFIX } from "../persistence/legacy-product";

const legacyKey = (suffix: string) => `${LEGACY_PRODUCT_PREFIX}.${suffix}`;

const mocks = vi.hoisted(() => {
  const values = new Map<string, string>();
  let preferencesJson: string | null = null;
  let preferencesUpdatedAt = 0;
  let loadPreferencesFails = false;
  let savePreferencesFails = false;

  return {
    clear: () => {
      values.clear();
      preferencesJson = null;
      preferencesUpdatedAt = 0;
      loadPreferencesFails = false;
      savePreferencesFails = false;
    },
    getStoredValue: (key: string) => values.get(key) ?? null,
    getPreferencesJson: () => preferencesJson,
    setPreferencesJson: (value: string, updatedAt: number) => {
      preferencesJson = value;
      preferencesUpdatedAt = updatedAt;
    },
    setDatabaseFailures: (load: boolean, save: boolean) => {
      loadPreferencesFails = load;
      savePreferencesFails = save;
    },
    getItemAsync: vi.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    setItemAsync: vi.fn((key: string, value: string) => {
      values.set(key, value);

      return Promise.resolve();
    }),
    deleteItemAsync: vi.fn((key: string) => {
      values.delete(key);

      return Promise.resolve();
    }),
    database: {
      closeAsync: vi.fn(() => Promise.resolve()),
      execAsync: vi.fn(() => Promise.resolve()),
      withExclusiveTransactionAsync: vi.fn(
        (run: (transaction: { execAsync: () => Promise<void> }) => Promise<void>) =>
          run({ execAsync: () => Promise.resolve() }),
      ),
      getFirstAsync: vi.fn((sql: string) => {
        if (sql.includes("PRAGMA user_version")) {
          return Promise.resolve({ user_version: 1 });
        }

        if (loadPreferencesFails) {
          return Promise.reject(new Error("database unavailable"));
        }

        return Promise.resolve(
          preferencesJson === null
            ? null
            : { payload: preferencesJson, updatedAt: preferencesUpdatedAt },
        );
      }),
      runAsync: vi.fn((_sql: string, payload?: string | number, updatedAt?: string | number) => {
        if (savePreferencesFails) {
          return Promise.reject(new Error("database unavailable"));
        }

        if (Predicate.isString(payload)) {
          preferencesJson = payload;
        }

        if (Predicate.isNumber(updatedAt)) {
          preferencesUpdatedAt = updatedAt;
        }

        return Promise.resolve();
      }),
    },
  };
});

vi.mock("expo-secure-store", () => ({
  deleteItemAsync: mocks.deleteItemAsync,
  getItemAsync: mocks.getItemAsync,
  setItemAsync: mocks.setItemAsync,
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn(() => Promise.resolve(mocks.database)),
}));

vi.mock("expo-crypto", () => ({
  getRandomBytes: vi.fn(() => new Uint8Array(16)),
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: {} } },
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

describe("mobile connection storage", () => {
  beforeEach(() => {
    mocks.clear();
    vi.clearAllMocks();
  });

  it("preserves secure-storage read failures with operation and key context", async () => {
    const cause = new Error("keychain unavailable");
    mocks.getItemAsync.mockRejectedValueOnce(cause);

    await expect(loadSavedConnections()).rejects.toMatchObject({
      _tag: "MobileSecureStorageError",
      operation: "read",
      key: "isnadi.connections",
      cause,
      message: "Mobile secure storage operation read failed for key isnadi.connections.",
    });
  });

  it("retains authenticated connections beside an incomplete row when loading and saving", async () => {
    const good = {
      environmentId: EnvironmentId.make("good"),
      environmentLabel: "Good",
      pairingUrl: "https://good.example/pair",
      displayUrl: "https://good.example",
      httpBaseUrl: "https://good.example",
      wsBaseUrl: "wss://good.example",
      bearerToken: "good-token",
    };

    await mocks.setItemAsync(
      "isnadi.connections",
      JSON.stringify({
        connections: [good, { environmentId: "expired" }],
      }),
    );

    await expect(loadSavedConnections()).resolves.toEqual([good]);
    const next = { ...good, environmentId: EnvironmentId.make("new"), bearerToken: "new-token" };
    await saveConnection(next);
    expect(JSON.parse(mocks.getStoredValue("isnadi.connections") ?? "")).toEqual({
      connections: [good, next],
    });
    await expect(loadSavedConnections()).resolves.toEqual([good, next]);
  });

  it("retires legacy registration data after a direct clear", async () => {
    await mocks.setItemAsync("t3code.agent-awareness.registration", "stale");

    await clearAgentAwarenessRegistrationRecord();

    expect(mocks.getStoredValue("isnadi.agent-awareness.registration")).toBe("");
    expect(mocks.getStoredValue("t3code.agent-awareness.registration")).toBeNull();
  });

  it("migrates saved connections from the previous product key", async () => {
    const connection = {
      environmentId: EnvironmentId.make("env"),
      environmentLabel: "Env",
      pairingUrl: "https://env.example/pair",
      displayUrl: "https://env.example",
      httpBaseUrl: "https://env.example",
      wsBaseUrl: "wss://env.example",
      bearerToken: "token",
    };

    const raw = JSON.stringify({ connections: [connection] });
    await mocks.setItemAsync(legacyKey("connections"), raw);

    await expect(loadSavedConnections()).resolves.toEqual([connection]);
    expect(mocks.getStoredValue("isnadi.connections")).toBe(raw);
    expect(mocks.getStoredValue(legacyKey("connections"))).toBeNull();
  });

  it("prefers the Isnadi key over a leftover previous-product key", async () => {
    await mocks.setItemAsync("isnadi.connections", JSON.stringify({ connections: [] }));
    await mocks.setItemAsync(legacyKey("connections"), "stale");

    await expect(loadSavedConnections()).resolves.toEqual([]);
    expect(mocks.getStoredValue(legacyKey("connections"))).toBe("stale");
  });

  it("prefers the previous-product key over the t3code key", async () => {
    await mocks.setItemAsync(legacyKey("agent-awareness.device-id"), "device-newer");
    await mocks.setItemAsync("t3code.agent-awareness.device-id", "device-older");

    await expect(loadAgentAwarenessDeviceId()).resolves.toBe("device-newer");
    expect(mocks.getStoredValue("isnadi.agent-awareness.device-id")).toBe("device-newer");
    expect(mocks.getStoredValue(legacyKey("agent-awareness.device-id"))).toBeNull();
  });

  it("drains every legacy key on the next write", async () => {
    await mocks.setItemAsync(legacyKey("agent-awareness.registration"), "stale");
    await mocks.setItemAsync("t3code.agent-awareness.registration", "stale");

    await clearAgentAwarenessRegistrationRecord();

    expect(mocks.getStoredValue("isnadi.agent-awareness.registration")).toBe("");
    expect(mocks.getStoredValue(legacyKey("agent-awareness.registration"))).toBeNull();
    expect(mocks.getStoredValue("t3code.agent-awareness.registration")).toBeNull();
  });

  it("migrates previous-product preferences into SQLite and drains the old key", async () => {
    await mocks.setItemAsync(legacyKey("preferences"), JSON.stringify({ baseFontSize: 18 }));

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 18 });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({ baseFontSize: 18 });
    expect(mocks.getStoredValue(legacyKey("preferences"))).toBeNull();
    expect(mocks.getStoredValue("isnadi.preferences")).toBeNull();
  });

  it("moves previous-product preferences to the Isnadi key when SQLite is unavailable", async () => {
    mocks.setDatabaseFailures(true, true);
    const raw = JSON.stringify({ baseFontSize: 16 });
    await mocks.setItemAsync(legacyKey("preferences"), raw);

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 16 });
    expect(mocks.getStoredValue("isnadi.preferences")).toBe(raw);
    expect(mocks.getStoredValue(legacyKey("preferences"))).toBeNull();
  });

  it("migrates a previous-product preferences fallback", async () => {
    mocks.setDatabaseFailures(true, true);
    const raw = JSON.stringify({ payload: JSON.stringify({ baseFontSize: 20 }), updatedAt: 5 });
    await mocks.setItemAsync(legacyKey("preferences.fallback"), raw);

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 20 });
    expect(mocks.getStoredValue("isnadi.preferences.fallback")).toBe(raw);
    expect(mocks.getStoredValue(legacyKey("preferences.fallback"))).toBeNull();
  });

  it("logs structured decode failures before using the empty fallback", async () => {
    await mocks.setItemAsync("isnadi.connections", "{");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(loadSavedConnections()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      "[mobile-storage] ignored invalid JSON",
      expect.objectContaining({
        _tag: "MobileStorageDecodeError",
        key: "isnadi.connections",
        cause: expect.any(SyntaxError),
        message: "Failed to decode mobile storage value for key isnadi.connections.",
      }),
    );

    warn.mockRestore();
  });

  it("loads legacy preferences when SQLite is unavailable", async () => {
    mocks.setDatabaseFailures(true, true);
    await mocks.setItemAsync("isnadi.preferences", JSON.stringify({ baseFontSize: 17 }));

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 17 });
  });

  it("canonicalizes legacy t3-code and t3-chat theme ids on load", async () => {
    mocks.setPreferencesJson(
      JSON.stringify({
        themeId: "t3-code",
        lightThemeId: "t3-chat",
        darkThemeId: "t3-code",
        themeMode: "system",
      }),
      10,
    );

    await expect(loadPreferences()).resolves.toEqual({
      themeId: "isnadi-classic",
      lightThemeId: "isnadi-chat",
      darkThemeId: "isnadi-classic",
      themeMode: "system",
    });
  });

  it("canonicalizes previous-product theme ids on load", async () => {
    mocks.setPreferencesJson(
      JSON.stringify({
        themeId: `${LEGACY_PRODUCT_PREFIX}-classic`,
        lightThemeId: `${LEGACY_PRODUCT_PREFIX}-paper`,
        darkThemeId: `${LEGACY_PRODUCT_PREFIX}-noir`,
      }),
      10,
    );

    await expect(loadPreferences()).resolves.toEqual({
      themeId: "isnadi-classic",
      lightThemeId: "isnadi-paper",
      darkThemeId: "isnadi-noir",
    });
  });

  it("persists language locally and resets to system without changing other preferences", async () => {
    mocks.setPreferencesJson(JSON.stringify({ baseFontSize: 17 }), 10);
    await expect(savePreferencesPatch({ language: "en" })).resolves.toEqual({
      baseFontSize: 17,
      language: "en",
    });
    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 17, language: "en" });
    await expect(savePreferencesPatch({ language: "system" })).resolves.toEqual({
      baseFontSize: 17,
      language: "system",
    });
    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 17, language: "system" });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({
      baseFontSize: 17,
      language: "system",
    });
  });

  it("ignores malformed language preferences", async () => {
    mocks.setPreferencesJson(JSON.stringify({ language: { locale: "en" }, baseFontSize: 17 }), 10);
    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 17 });
  });

  it("retains language in the device-local fallback when SQLite is unavailable", async () => {
    mocks.setDatabaseFailures(true, true);
    await expect(savePreferencesPatch({ language: "en" })).resolves.toEqual({ language: "en" });
    await expect(loadPreferences()).resolves.toEqual({ language: "en" });
  });

  it("persists independent light and dark theme choices", async () => {
    mocks.setPreferencesJson(
      JSON.stringify({
        themeId: "grove",
        lightThemeId: "iris",
        darkThemeId: "ocean",
        themeMode: "system",
      }),
      10,
    );

    await expect(loadPreferences()).resolves.toEqual({
      themeId: "grove",
      lightThemeId: "iris",
      darkThemeId: "ocean",
      themeMode: "system",
    });
  });

  it("falls back to secure storage when SQLite cannot save preferences", async () => {
    mocks.setDatabaseFailures(true, true);
    await expect(savePreferencesPatch({ baseFontSize: 19 })).resolves.toEqual({ baseFontSize: 19 });

    const fallback = JSON.parse(mocks.getStoredValue("isnadi.preferences.fallback") ?? "") as {
      readonly payload: string;
      readonly updatedAt: number;
    };

    expect(JSON.parse(fallback.payload)).toEqual({ baseFontSize: 19 });
    expect(fallback.updatedAt).toEqual(expect.any(Number));
  });

  it("persists Thread List v2 shelf expansion preferences", async () => {
    await expect(
      savePreferencesPatch({
        threadListV2SettledShelfExpanded: false,
        threadListV2SnoozedShelfExpanded: true,
      }),
    ).resolves.toEqual({
      threadListV2SettledShelfExpanded: false,
      threadListV2SnoozedShelfExpanded: true,
    });

    await expect(loadPreferences()).resolves.toEqual({
      threadListV2SettledShelfExpanded: false,
      threadListV2SnoozedShelfExpanded: true,
    });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({
      threadListV2SettledShelfExpanded: false,
      threadListV2SnoozedShelfExpanded: true,
    });
  });

  it("ignores invalid Thread List v2 shelf expansion preference types", async () => {
    mocks.setPreferencesJson(
      JSON.stringify({
        baseFontSize: 17,
        threadListV2SettledShelfExpanded: "false",
        threadListV2SnoozedShelfExpanded: 1,
      }),
      10,
    );

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 17 });
  });

  it("reconciles fallback preferences after SQLite recovers", async () => {
    mocks.setPreferencesJson(JSON.stringify({ baseFontSize: 15 }), 10);
    await mocks.setItemAsync(
      "isnadi.preferences.fallback",
      JSON.stringify({
        payload: JSON.stringify({ baseFontSize: 19 }),
        updatedAt: 20,
      }),
    );

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 19 });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({ baseFontSize: 19 });
    expect(mocks.getStoredValue("isnadi.preferences.fallback")).toBeNull();
  });

  it("ignores a stale fallback when its previous deletion failed", async () => {
    mocks.setPreferencesJson(JSON.stringify({ baseFontSize: 21 }), 30);
    await mocks.setItemAsync(
      "isnadi.preferences.fallback",
      JSON.stringify({
        payload: JSON.stringify({ baseFontSize: 19 }),
        updatedAt: 20,
      }),
    );

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 21 });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({ baseFontSize: 21 });
    expect(mocks.getStoredValue("isnadi.preferences.fallback")).toBeNull();
  });

  it("ignores an invalid fallback even when it has a newer timestamp", async () => {
    mocks.setPreferencesJson(JSON.stringify({ baseFontSize: 21 }), 30);
    await mocks.setItemAsync(
      "isnadi.preferences.fallback",
      JSON.stringify({ payload: "{", updatedAt: 40 }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 21 });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({ baseFontSize: 21 });
    expect(mocks.getStoredValue("isnadi.preferences.fallback")).toBeNull();

    warn.mockRestore();
  });

  it("keeps SQLite authoritative when stale legacy preferences remain", async () => {
    mocks.setPreferencesJson(JSON.stringify({ baseFontSize: 21 }), 30);
    await mocks.setItemAsync("isnadi.preferences", JSON.stringify({ baseFontSize: 19 }));

    await expect(loadPreferences()).resolves.toEqual({ baseFontSize: 21 });
    expect(JSON.parse(mocks.getPreferencesJson() ?? "")).toEqual({ baseFontSize: 21 });
  });
});
