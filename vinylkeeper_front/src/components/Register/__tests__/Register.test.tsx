import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "@components/Register/Register";

const api = vi.hoisted(() => ({ register: vi.fn(), getCurrentUser: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@services/UserApiService", () => ({ userApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({
    isLoading: false,
    setIsLoading: vi.fn(),
    setIsUserLoggedIn: vi.fn(),
    setCurrentUser: vi.fn(),
  }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderRegister = (setErrorSnackbar = vi.fn()) => {
  render(
    <MemoryRouter>
      <Register
        setRegister={vi.fn()}
        setLogin={vi.fn()}
        setOpen={vi.fn()}
        open
        setOpenTermsModal={vi.fn()}
        openTermsModal={false}
        setErrorSnackbar={setErrorSnackbar}
      />
    </MemoryRouter>
  );
  return setErrorSnackbar;
};

const fillForm = async (passwordBis = "secret12") => {
  await userEvent.type(screen.getByLabelText("Username"), "jane");
  await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "secret12");
  await userEvent.type(screen.getByLabelText("Password confirmation"), passwordBis);
  await userEvent.click(screen.getByRole("checkbox", { name: "I agree" }));
};

describe("Register form", () => {
  it("can only be sent once the terms are accepted", async () => {
    renderRegister();

    expect(screen.getByRole("button", { name: "Join now" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "I agree" }));
    expect(screen.getByRole("button", { name: "Join now" })).toBeEnabled();
  });

  it("refuses a confirmation that differs from the password", async () => {
    renderRegister();

    await fillForm("other1");
    await userEvent.click(screen.getByRole("button", { name: "Join now" }));

    expect(await screen.findByText("It must be the same as the password")).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("creates the account and opens the dashboard", async () => {
    api.register.mockResolvedValue({ isLoggedIn: true });
    api.getCurrentUser.mockResolvedValue({ username: "jane" });
    renderRegister();

    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Join now" }));

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(api.register).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "jane",
        email: "jane@example.com",
        password: "secret12",
        isAcceptedTerms: true,
      })
    );
  });

  it("passes the error of the API to the snackbar", async () => {
    api.register.mockRejectedValue(new Error("Email already registered"));
    const setErrorSnackbar = renderRegister();

    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Join now" }));

    await vi.waitFor(() =>
      expect(setErrorSnackbar).toHaveBeenCalledWith({ open: true, message: "Email already registered" })
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
