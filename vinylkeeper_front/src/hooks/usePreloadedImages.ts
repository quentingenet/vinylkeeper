import { useEffect, useState } from "react";

/**
 * Loads and decodes images ahead of time, so a popup can show them all at once instead of
 * each one popping in when it lands. True once every image is ready, or failed: a missing
 * image never blocks what shows it. Starts when `enabled` turns true, and stays ready after.
 */
export function usePreloadedImages(urls: string[], enabled: boolean = true): boolean {
  // Without decode() (old browsers, the test DOM) there is nothing to wait for: ready at once
  const [ready, setReady] = useState(() => typeof new Image().decode !== "function");
  const key = urls.join("|");

  useEffect(() => {
    if (!enabled || ready) return;
    let cancelled = false;
    const loads = key.split("|").map((url) => {
      const image = new Image();
      image.src = url;
      return image.decode().catch(() => undefined);
    });
    void Promise.all(loads).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, enabled, ready]);

  return ready;
}
