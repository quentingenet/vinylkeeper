import { registerPlugin } from "@capacitor/core";

/** The plugin of the iOS app (DiscogsAuthSessionPlugin.swift): the Discogs page in the sign-in sheet of iOS. */
interface DiscogsAuthSessionPlugin {
  /** Resolves with the address Discogs led back to; rejects with the code CANCELLED when the sheet is closed */
  start(options: { url: string }): Promise<{ url: string }>;
}

export const DiscogsAuthSession = registerPlugin<DiscogsAuthSessionPlugin>("DiscogsAuthSession");
