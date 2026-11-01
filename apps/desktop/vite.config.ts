import { defineConfig } from "vite-plus";

const shouldLaunchElectronAfterPack = process.env.T3CODE_DESKTOP_DEV === "1";

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "node scripts/build-preview-annotation-css.mjs && vp pack",
        dependsOn: ["isnadibot#build"],
        cache: false,
      },
      dev: {
        command:
          "node scripts/build-preview-annotation-css.mjs && cross-env T3CODE_DESKTOP_DEV=1 vp pack --watch",
        dependsOn: ["isnadibot#build"],
        cache: false,
      },
      "dev:bundle": {
        command: "node scripts/build-preview-annotation-css.mjs && vp pack --watch",
        cache: false,
      },
      "dev:electron": {
        command: "node scripts/dev-electron.mjs",
        dependsOn: ["isnadibot#build"],
        cache: false,
      },
    },
  },
  pack: [
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/main.ts"],
      clean: true,
      deps: {
        alwaysBundle: (id) => id.startsWith("@isnadi/"),
      },
      ...(shouldLaunchElectronAfterPack ? { onSuccess: "node scripts/dev-electron.mjs" } : {}),
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preload.ts"],
      // Electron runs sandboxed preloads inside a function whose parameters include
      // setImmediate; bundled effect declares a top-level `const setImmediate`, so
      // give the bundle its own scope or the preload fails to load.
      outputOptions: { intro: "(() => {", outro: "})();" },
      deps: {
        // Sandboxed preloads can require Electron only, so bundle the contract decoders.
        alwaysBundle: (id) =>
          id === "effect" || id.startsWith("effect/") || id.startsWith("@isnadi/"),
      },
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preview-pick-preload.ts"],
      deps: {
        alwaysBundle: (id) => id === "react-grab" || id.startsWith("react-grab/"),
      },
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preview-pip-preload.ts"],
      // Electron runs sandboxed preloads inside a function whose parameters include
      // setImmediate; bundled effect declares a top-level `const setImmediate`, so
      // give the bundle its own scope or the preload fails to load.
      outputOptions: { intro: "(() => {", outro: "})();" },
      deps: {
        // Sandboxed preloads can require Electron only, so bundle the contract decoders.
        alwaysBundle: (id) =>
          id === "effect" || id.startsWith("effect/") || id.startsWith("@isnadi/"),
      },
    },
  ],
});
