import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_URL } from "@utils/GlobalUtils";

export const login = (data: ILoginForm) => {
  const requestDataLogin = {
    email: data.email,
    password: data.password,
  };

  return fetch(API_URL.concat("/users/auth"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestDataLogin),
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(
            errorData.message || `Login failed with status ${response.status}`
          );
        });
      }
      return response.json();
    })
    .then((responseData) => {
      if (!responseData) {
        throw new Error("Access token missing in response");
      }
      return { status: 200, data: responseData };
    });
};

export const register = async (dataRegister: IRegisterForm) => {
  const requestDataRegister = {
    username: dataRegister.username,
    email: dataRegister.email,
    password: dataRegister.password,
    is_accepted_terms: dataRegister.isAcceptedTerms,
    timezone: dataRegister.timezone,
    role_id: 2,
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

    return responseData;
  } catch (error) {
    throw new Error("Error during registration: " + error);
  }
};
