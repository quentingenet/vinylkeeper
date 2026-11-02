import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "@components/Login/Login";

const api = vi.hoisted(() => ({ login: vi.fn(), getCurrentUser: vi.fn(), forgotPassword: vi.fn() }));
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

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login
        setRegister={vi.fn()}
        setLogin={vi.fn()}
        open
        setOpen={vi.fn()}
        openForgotPassword={false}
        setOpenForgotPassword={vi.fn()}
      />
    </MemoryRouter>
  );

describe("Login form", () => {
  it("shows the field errors and sends nothing when empty", async () => {
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Email not valid")).toBeInTheDocument();
    expect(screen.getByText("You must enter your password.")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("logs in with the lowercased email and opens the dashboard", async () => {
    api.login.mockResolvedValue({ isLoggedIn: true });
    api.getCurrentUser.mockResolvedValue({ username: "jane" });
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "Jane@Example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(api.login).toHaveBeenCalledWith({ email: "jane@example.com", password: "secret1" });
  });

  it("says why the login failed", async () => {
    api.login.mockRejectedValue(new Error("Wrong email or password."));
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong1");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Wrong email or password.")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
