import type { CSSProperties, SyntheticEvent } from "react";

/**
 * Covers start transparent and fade in once loaded, instead of popping in.
 * Spread `fadeInImageStyle` into the image style and pass `revealImage` as `onLoad`.
 * Give the image `key={src}` so a new cover fades in again instead of swapping abruptly.
 */
export const fadeInImageStyle: CSSProperties = {
  opacity: 0,
  transition: "opacity 0.4s ease-in",
};

export const revealImage = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.opacity = "1";
};
