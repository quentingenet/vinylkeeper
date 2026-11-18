import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyIosShell, IOS_CLASS } from "@utils/iosShell";

const platform = vi.hoisted(() => ({ value: "ios" as "ios" | "android" | "web" }));
vi.mock("@utils/CapacitorUtils", () => ({ getPlatform: () => platform.value }));

const page = () => {
  const doc = document.implementation.createHTMLDocument("test");
  const meta = doc.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width, initial-scale=1.0";
  doc.head.appendChild(meta);
  return { doc, meta };
};

beforeEach(() => {
  platform.value = "ios";
});

describe("applyIosShell", () => {
  it("lets the iOS app draw edge to edge, its pages keeping to the safe areas", () => {
    const { doc, meta } = page();
    applyIosShell(doc);
    applyIosShell(doc);

    expect(doc.documentElement.classList.contains(IOS_CLASS)).toBe(true);
    expect(meta.content).toBe("width=device-width, initial-scale=1.0, viewport-fit=cover");
  });

  it.each(["android", "web"] as const)("leaves %s as it is", (other) => {
    platform.value = other;
    const { doc, meta } = page();
    applyIosShell(doc);

    expect(doc.documentElement.classList.contains(IOS_CLASS)).toBe(false);
    expect(meta.content).toBe("width=device-width, initial-scale=1.0");
  });
});
