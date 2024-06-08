import { ILoginForm } from "@models/ILoginForm";
import { API_URL } from "@utils/GlobalUtils";

export const login = async (data: ILoginForm) => {
  const requestDataLogin = {
    username: data.email,
    password: data.password,
  };

  try {
    const response = await fetch(API_URL.concat("token/"), {
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
    const accessToken = responseData.access;
    localStorage.setItem("jwt", accessToken);

    return {
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    throw new Error("Error while calling the API: " + error);
  }
};
