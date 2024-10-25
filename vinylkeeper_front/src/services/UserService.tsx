import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_URL } from "@utils/GlobalUtils";

export const login = async (
  data: ILoginForm,
  setJwt: (jwt: string) => void,
  setIsUserLoggedIn: (isLoggedIn: boolean) => void
) => {
  const requestDataLogin = {
    email: data.email,
    password: data.password,
  };

  try {
    const response = await fetch(API_URL.concat("/users/auth"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestDataLogin),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error during login");
    }

    const responseData = await response.json();
    const accessToken = responseData;

    setJwt(accessToken);
    setIsUserLoggedIn(true);

    return {
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    setIsUserLoggedIn(false);
    throw new Error("Error while logging in: " + error);
  }
};

export const register = async (
  dataRegister: IRegisterForm,
  setJwt: (jwt: string) => void,
  setIsUserLoggedIn: (isLoggedIn: boolean) => void
) => {
  const requestDataRegister = {
    username: dataRegister.username,
    email: dataRegister.email,
    password: dataRegister.password,
    is_accepted_terms: dataRegister.isAcceptedTerms,
    timezone: dataRegister.timezone,
  };

  try {
    const response = await fetch(API_URL.concat("/users/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestDataRegister),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Error during registration");
    }

    const responseData = await response.json();
    const accessToken = responseData.access_token;

    setJwt(accessToken);
    setIsUserLoggedIn(true);

    return responseData;
  } catch (error) {
    setIsUserLoggedIn(false);
    throw new Error("Error during registration: " + error);
  }
};
