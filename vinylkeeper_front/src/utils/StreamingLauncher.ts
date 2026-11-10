import { registerPlugin } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { nativeLaunch, type NativeLaunch, type StreamingPlatform } from "@services/MusicStreamingService";
import { logger } from "./logger";

/** The plugin of the Android app (StreamingLauncherPlugin.java): opens the music app, else the browser. */
interface StreamingLauncherPlugin {
  open(options: NativeLaunch): Promise<{ opened: "app" | "browser" }>;
}

export const StreamingLauncher = registerPlugin<StreamingLauncherPlugin>("StreamingLauncher");

/**
 * "Listen on ...": the music app opens first, the web page when it is not installed. If the plugin cannot
 * run (an app built without it), the web page opens in a Custom Tab, which Android may hand to the app.
 */
export async function openInMusicApp(platform: StreamingPlatform, query: string): Promise<void> {
  const launch = nativeLaunch(platform, query);
  try {
    await StreamingLauncher.open(launch);
  } catch (error) {
    logger.warn("Music app not opened, using the web page:", error);
    await Browser.open({ url: launch.fallbackUrl });
  }
}
