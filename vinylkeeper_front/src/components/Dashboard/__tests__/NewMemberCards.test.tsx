import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import NewMemberCards from "../NewMemberCards";

afterEach(cleanup);

describe("NewMemberCards", () => {
  it("shows the Atlas and invites to start the collection", () => {
    render(<NewMemberCards spotsCount={28} onOpenAtlas={vi.fn()} onAddRecord={vi.fn()} />);

    expect(screen.getByText("Atlas spots")).toBeInTheDocument();
    expect(screen.getByText("Start your collection")).toBeInTheDocument();
    expect(screen.getByText("Add now to your collection some records or artists.")).toBeInTheDocument();
  });

  it("puts the invitation first, the Atlas second", () => {
    render(<NewMemberCards spotsCount={28} onOpenAtlas={vi.fn()} onAddRecord={vi.fn()} />);

    const invitation = screen.getByText("Start your collection");
    const atlas = screen.getByText("Atlas spots");
    expect(invitation.compareDocumentPosition(atlas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens the dialog to add a record from the invitation", () => {
    const onAddRecord = vi.fn();
    render(<NewMemberCards spotsCount={28} onOpenAtlas={vi.fn()} onAddRecord={onAddRecord} />);

    fireEvent.click(screen.getByRole("button", { name: "Add a record" }));

    expect(onAddRecord).toHaveBeenCalledTimes(1);
  });

  it("opens the Atlas from its card, not from the invitation", () => {
    const onOpenAtlas = vi.fn();
    render(<NewMemberCards spotsCount={28} onOpenAtlas={onOpenAtlas} onAddRecord={vi.fn()} />);

    fireEvent.click(screen.getByText("Start your collection"));
    expect(onOpenAtlas).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Atlas spots"));
    expect(onOpenAtlas).toHaveBeenCalledTimes(1);
  });

  it("shows a dash instead of 0 spots", () => {
    render(<NewMemberCards spotsCount={0} onOpenAtlas={vi.fn()} onAddRecord={vi.fn()} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
