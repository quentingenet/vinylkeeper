import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Terms, { DELETE_ACCOUNT_ANCHOR } from "../Terms";
import { TERMS_LAST_UPDATED } from "@components/Modals/ModalTermsVinylKeeper";

afterEach(cleanup);

const renderTerms = (standalone = false) =>
  render(
    <MemoryRouter>
      <Terms standalone={standalone} />
    </MemoryRouter>
  );

describe("Terms page", () => {
  it("is the same text as the popup of the footer, dated like it", () => {
    renderTerms();

    expect(screen.getByRole("heading", { level: 1, name: /terms of use and privacy/i })).toBeInTheDocument();
    expect(screen.getByText(`Last updated: ${TERMS_LAST_UPDATED}`)).toBeInTheDocument();
    expect(screen.getByText("7. Personal data (GDPR)")).toBeInTheDocument();
  });

  it("tells how to delete an account, at an address of its own", () => {
    const { container } = renderTerms();

    const section = container.querySelector(`#${DELETE_ACCOUNT_ANCHOR}`);
    expect(section).not.toBeNull();
    expect(section).toHaveTextContent(/Settings/);
    expect(section).toHaveTextContent(/Delete\s*account/);
    expect(section?.querySelector("a[href^='mailto:']")).not.toBeNull();
  });

  it("shows a visitor the bar and the footer of the home page around it", () => {
    renderTerms(true);

    expect(screen.getByRole("heading", { level: 1, name: /terms of use and privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/made with/i)).toBeInTheDocument();
  });

  it("changes the title of the page while it is open", () => {
    renderTerms();
    expect(document.title).toBe("Terms of use and privacy | Vinyl Keeper");
  });
});
