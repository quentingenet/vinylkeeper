import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollectionsPagination from "@components/Collections/CollectionsPagination";

afterEach(cleanup);

describe("CollectionsPagination", () => {
  it.each([0, 1])("renders nothing with %i page(s)", (totalPages) => {
    const { container } = render(
      <CollectionsPagination totalPages={totalPages} page={1} onChange={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("calls onChange with the selected page", async () => {
    const onChange = vi.fn();
    render(<CollectionsPagination totalPages={3} page={1} onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "2" }));

    expect(onChange).toHaveBeenCalledWith(2);
  });
});
