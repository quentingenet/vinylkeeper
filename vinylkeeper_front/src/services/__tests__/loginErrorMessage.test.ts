import { describe, it, expect } from "vitest";
import { loginErrorMessage } from "../UserApiService";

const apiError = (code: number) => ({ code, message: "error", details: {} });

describe("loginErrorMessage", () => {
  it("tells apart wrong credentials, disabled account and terms not accepted", () => {
    expect(loginErrorMessage(apiError(1000))).toBe("Wrong email or password.");
    expect(loginErrorMessage(apiError(1003))).toMatch(/disabled/);
    expect(loginErrorMessage(apiError(1008))).toMatch(/terms of use/);
  });

  it("asks to wait on the rate limit of the proxy", () => {
    expect(loginErrorMessage(apiError(429))).toMatch(/Too many login attempts/);
  });

  it("reports a server failure", () => {
    expect(loginErrorMessage(apiError(500))).toMatch(/trouble/);
    expect(loginErrorMessage(apiError(502))).toMatch(/trouble/);
  });

  it("reports a network failure", () => {
    expect(loginErrorMessage(new TypeError("Failed to fetch"))).toMatch(/connection/);
    expect(loginErrorMessage(apiError(9999))).toMatch(/connection/);
  });
});
