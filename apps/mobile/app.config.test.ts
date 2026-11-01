import * as NodeChildProcess from "node:child_process";
import { expect, it } from "vite-plus/test";

const configUrl = new URL("./app.config.ts", import.meta.url).href;

it.each([
  ["development", "IsnadiBot Dev", ["akeru-dev", "akeru"], "dev.leodoes.isnadi.dev"],
  ["production", "IsnadiBot", ["akeru"], "dev.leodoes.isnadi"],
  ["", "IsnadiBot", ["akeru"], "dev.leodoes.isnadi"],
  ["preview", "IsnadiBot", ["akeru"], "dev.leodoes.isnadi"],
  [" development ", "IsnadiBot", ["akeru"], "dev.leodoes.isnadi"],
])(
  "resolves APP_VARIANT=%j without changing app identity",
  (appVariant, name, scheme, identifier) => {
    const output = NodeChildProcess.execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import config from ${JSON.stringify(configUrl)};
process.stdout.write(JSON.stringify({
  name: config.name,
  scheme: config.scheme,
  iosBundleIdentifier: config.ios.bundleIdentifier,
  androidPackage: config.android.package,
  appVariant: config.extra.appVariant,
}));`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          APP_VARIANT: appVariant,
          T3CODE_IOS_PERSONAL_TEAM: "",
          T3CODE_IOS_PERSONAL_TEAM_BUNDLE_ID: "",
          ISNADI_APPLE_TEAM_ID: "",
          ISNADI_EXPO_PROJECT_ID: "",
          ISNADI_EXPO_OWNER: "",
        },
      },
    );

    expect(output).toBe(
      JSON.stringify({
        name,
        scheme,
        iosBundleIdentifier: identifier,
        androidPackage: identifier,
        appVariant: appVariant === "development" ? "development" : "production",
      }),
    );
  },
);
