import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CardGrid from "@components/Collections/CardGrid";
import { useCompactCards } from "@components/Collections/compactCards";
import { MOBILE_CARD_COLUMNS } from "@components/Collections/collectionGridLayout";

function Probe() {
  return <span>{useCompactCards() ? "compact" : "large"}</span>;
}

const renderAt = (width: number) => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  return render(
    <CardGrid>
      <Probe />
    </CardGrid>
  );
};

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true, writable: true });
});

describe("CardGrid", () => {
  it("shows two compact cards per row on a phone, while the switch says so", () => {
    renderAt(390);

    const compact = MOBILE_CARD_COLUMNS === 2;
    expect(screen.getByText(compact ? "compact" : "large")).toBeInTheDocument();
    expect(screen.getByText(/compact|large/).parentElement?.className.includes("twoColumns")).toBe(compact);
  });

  it("keeps the large cards on a wide screen", () => {
    renderAt(1280);

    expect(screen.getByText("large")).toBeInTheDocument();
    expect(screen.getByText("large").parentElement?.className).not.toContain("twoColumns");
  });
});
