import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShareCollectionButton from "@components/Collections/ShareCollectionButton";

const TOKEN = "0123456789abcdef0123456789abcdef";
const LINK = `https://vinylkeeper.org/shared/${TOKEN}`;

vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "share");
});

const PRIVATE_LABEL = "Go public to share this collection with diggers all around the world, on Vinyl Keeper or not";

const renderButton = (isPublic = true, variant?: "icon" | "text") =>
  render(
    <ShareCollectionButton shareToken={TOKEN} name="Jazz shelf" ownerUsername="kent" isPublic={isPublic} variant={variant} />
  );

describe("ShareCollectionButton", () => {
  it("explains why a private collection cannot be shared", async () => {
    renderButton(false);

    const button = screen.getByRole("button", { name: PRIVATE_LABEL });
    expect(button).toBeDisabled();

    await userEvent.hover(button.parentElement as HTMLElement);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(PRIVATE_LABEL);
  });

  it("is a text button next to Export to on the page of a collection", () => {
    renderButton(false, "text");

    expect(screen.getByRole("button", { name: /Share/ })).toHaveTextContent("Share");
    expect(screen.getByRole("button", { name: /Share/ })).toBeDisabled();
  });

  it("uses the share sheet of the phone when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: "Share this collection" }));

    expect(share).toHaveBeenCalledWith({
      title: "Jazz shelf",
      text: "Have a look at kent's collection and discover vinylkeeper.org",
      url: LINK,
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stays quiet when the share sheet is dismissed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("dismissed", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: "Share this collection" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("copies the link", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Share this collection" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("offers the link and an email, nothing else", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: "Share this collection" }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toEqual(["Copy link", "Email"]);
    await userEvent.click(screen.getByRole("menuitem", { name: "Email" }));

    const target = open.mock.calls[0][0] as string;
    expect(target).toContain(`subject=${encodeURIComponent("Have a look at kent's collection and discover vinylkeeper.org")}`);
    expect(target).toContain(`body=${encodeURIComponent(LINK)}`);
  });
});
