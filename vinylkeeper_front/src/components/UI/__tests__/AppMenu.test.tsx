import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkIcon from "@mui/icons-material/Link";
import AppMenu from "@components/UI/AppMenu";
import AppMenuItem from "@components/UI/AppMenuItem";

const renderAt = (width: number, onClick = vi.fn()) => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  render(
    <AppMenu anchorEl={anchor} onClose={() => undefined}>
      <AppMenuItem label="Copy the link" icon={<LinkIcon />} onClick={onClick} />
      <AppMenuItem label="Report abuse" />
    </AppMenu>
  );
  return onClick;
};

// Computed in pixels: 0.875rem is 14px, 0.85rem is 13.6px
const textSize = (label: string) => getComputedStyle(screen.getByText(label)).fontSize;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true, writable: true });
});

describe("AppMenu", () => {
  it("gives every row the same text size, with or without an icon, on a computer", () => {
    renderAt(1280);

    expect(textSize("Copy the link")).toBe("14px");
    expect(textSize("Report abuse")).toBe("14px");
  });

  it("and another one, the same for every row, on a phone", () => {
    renderAt(390);

    expect(textSize("Copy the link")).toBe("13.6px");
    expect(textSize("Report abuse")).toBe("13.6px");
  });

  it("a row does what it is for", async () => {
    const onClick = renderAt(1280);

    await userEvent.click(screen.getByRole("menuitem", { name: "Copy the link" }));

    expect(onClick).toHaveBeenCalled();
  });
});
