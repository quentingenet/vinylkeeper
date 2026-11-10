import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Permanent once the app is published on the Play Store
  appId: "org.vinylkeeper.app",
  appName: "Vinyl Keeper",
  // `npm run build:mobile` writes the web app here, `npx cap sync android` copies it into the app
  webDir: "dist",
  android: {
    // The app talks to the API over HTTPS only
    allowMixedContent: false,
  },
};

export default config;
