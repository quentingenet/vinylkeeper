import { getPlatform } from "@utils/CapacitorUtils";

export const IOS_CLASS = "platform-ios";

/**
 * The iOS app draws edge to edge, under the notch and the home bar: its pages keep their content inside the safe
 * areas (index.scss, --safe-* variables). Does nothing on the web and on Android, which stay as they are.
 */
export function applyIosShell(doc: Document = document): void {
  if (getPlatform() !== "ios") return;
  doc.documentElement.classList.add(IOS_CLASS);
  const viewport = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  // Without it, iOS reports safe areas of 0 to the page
  if (viewport && !viewport.content.includes("viewport-fit")) viewport.content += ", viewport-fit=cover";
  // Once laid out: the safe areas iOS gives the page, in the logs of the app (the notch of the full screen dialogs)
  setTimeout(() => logSafeAreas(doc), 1500);
}

function logSafeAreas(doc: Document): void {
  const probe = doc.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:var(--safe-bottom);" +
    "margin-top:var(--safe-top)";
  doc.body.appendChild(probe);
  const style = getComputedStyle(probe);
  console.info(
    `[ios] safe area top=${style.paddingTop} (--safe-top=${style.marginTop}, --safe-bottom=${style.paddingBottom}),`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
  );
  probe.remove();
}
