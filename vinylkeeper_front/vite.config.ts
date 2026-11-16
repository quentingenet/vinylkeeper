/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// The version members see in the menu: the versionName of the Android app, the one raised at each release
function appVersion(): string {
  try {
    const gradle = fs.readFileSync(path.resolve(__dirname, "android/app/build.gradle"), "utf8");
    const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];
    if (versionName) return versionName;
  } catch {
    // No Android project next to the web app: the version of package.json below
  }
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version: string };
  return pkg.version;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT),
      __APP_NAME__: JSON.stringify("vinylkeeper"),
      __APP_VERSION__: JSON.stringify(appVersion()),
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: (content, filename) =>
            filename.includes("variables.scss")
              ? content
              : `@use "@styles/variables.scss" as *;\n${content}`,
        },
      },
    },

    resolve: {
      alias: {
        "@pages": path.resolve(__dirname, "src/pages"),
        "@components": path.resolve(__dirname, "src/components"),
        "@styles": path.resolve(__dirname, "src/styles"),
        "@models": path.resolve(__dirname, "src/models"),
        "@services": path.resolve(__dirname, "src/services"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@routing": path.resolve(__dirname, "src/routing"),
        "@contexts": path.resolve(__dirname, "src/contexts"),
        "@hooks": path.resolve(__dirname, "src/hooks"),
        "@themes": path.resolve(__dirname, "src/styles/themes"),
        "@assets": path.resolve(__dirname, "src/assets"),
      },
    },

    server: {
      port: 5173,
      host: true, // indispensable pour dev mobile
    },

    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/setupTests.ts"],
      css: false,
    },
  };
});
