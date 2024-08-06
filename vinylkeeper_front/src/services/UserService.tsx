import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_URL } from "@utils/GlobalUtils";

export const login = async (data: ILoginForm) => {
  const requestDataLogin = {
    email: data.email,
    password: data.password,
  };
  try {
    const response = await fetch(API_URL.concat("/users/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestDataLogin),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Error while making request to the API"
      );
    }

    const responseData = await response.json();
    const accessToken = responseData.access_token;
    localStorage.setItem("jwt", accessToken);

    return {
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    throw new Error("Error while calling the API: " + error);
  }
};

export const register = async (dataRegister: IRegisterForm) => {
  const requestDataRegister = {
    username: dataRegister.username,
    email: dataRegister.email,
    password: dataRegister.password,
    is_accepted_terms: dataRegister.isAcceptedTerms,
  };

  try {
    const response = await fetch(API_URL.concat("/users/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestDataRegister),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la requête à l'API");
    }

    const jwt = response.headers.get("Authorization") || "";

    const localStorageJwt = localStorage.getItem("jwt");
    if (localStorageJwt) {
      localStorage.removeItem("jwt");
    }

    if (jwt) {
      localStorage.setItem("jwt", JSON.stringify(jwt));
    } else {
      throw new Error(
        "Le JWT n'est pas présent dans les en-têtes de la réponse."
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error("Error during API request: " + error);
  }
};
