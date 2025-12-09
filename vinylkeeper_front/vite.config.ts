import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT),
      __APP_NAME__: JSON.stringify("vinylkeeper"),
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
  };
});
