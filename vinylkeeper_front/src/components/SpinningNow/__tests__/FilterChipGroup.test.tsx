import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterChipGroup from "@components/SpinningNow/FilterChipGroup";

afterEach(cleanup);

const options = [
  { value: "calm", label: "Calm", count: 12, tooltip: "Peaceful." },
  { value: "dark", label: "Dark", count: 3 },
];

describe("FilterChipGroup", () => {
  it("shows each option with its count and marks the selected ones", () => {
    render(<FilterChipGroup title="Mood" options={options} selected={["calm"]} onToggle={vi.fn()} />);

    expect(screen.getByRole("region", { name: /^Mood/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calm (12)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dark (3)" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the chip name and exposes the tooltip as a description", () => {
    render(<FilterChipGroup title="Mood" options={options} selected={[]} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Calm (12)" })).toHaveAccessibleDescription("Peaceful.");
  });

  it("calls onToggle with the option value", async () => {
    const onToggle = vi.fn();
    render(<FilterChipGroup title="Era" options={[{ value: 1970, label: "1970s", count: 4 }]} selected={[]} onToggle={onToggle} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "1970s (4)" }));

    expect(onToggle).toHaveBeenCalledWith(1970);
  });

  it("can start collapsed and expands on click", async () => {
    render(<FilterChipGroup title="Mood" options={options} selected={[]} onToggle={vi.fn()} defaultExpanded={false} />);
    const header = screen.getByRole("button", { name: "Mood" });

    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Calm (12)" })).not.toBeInTheDocument();

    await userEvent.setup().click(header);

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Calm (12)" })).toBeVisible();
  });

  it("lists the selected values in the header so they stay visible when collapsed", () => {
    render(
      <FilterChipGroup title="Mood" options={options} selected={["dark", "calm"]} onToggle={vi.fn()} defaultExpanded={false} />
    );

    expect(screen.getByRole("button", { name: /^Mood/ })).toHaveTextContent("Calm, Dark");
  });

  it("renders nothing without options", () => {
    const { container } = render(<FilterChipGroup title="Genre" options={[]} selected={[]} onToggle={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
