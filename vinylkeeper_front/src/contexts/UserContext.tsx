import { API_VK_URL } from "@utils/GlobalUtils";
import requestService from "@utils/RequestService";
import { createContext, useContext, useState, useEffect } from "react";

interface IUserContext {
  jwt: string;
  setJwt: (jwt: string) => void;
  isUserLoggedIn: boolean;
  setIsUserLoggedIn: (isLoggedIn: boolean) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  refreshJwt: () => Promise<void>;
  logout: () => void;
}

export const UserContext = createContext<IUserContext>({
  jwt: "",
  setJwt: () => {},
  isUserLoggedIn: false,
  setIsUserLoggedIn: () => {},
  isFirstConnection: false,
  setIsFirstConnection: () => {},
  refreshJwt: async () => {},
  logout: () => {},
});

export function useUserContext() {
  return useContext(UserContext);
}

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jwt, setJwt] = useState<string>("");
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);

  const refreshJwt = async () => {
    try {
      await requestService({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/refresh-token",
        credentials: "include",
      });

      setIsUserLoggedIn(true);
    } catch (error) {
      console.error("Échec du rafraîchissement du JWT :", error);
      logout();
    }
  };

  const logout = () => {
    setJwt("");
    setIsUserLoggedIn(false);
  };

  useEffect(() => {
    refreshJwt();
    const intervalId = setInterval(() => {
      if (isUserLoggedIn) {
        refreshJwt();
      }
    }, 14 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isUserLoggedIn]);

  const value: IUserContext = {
    jwt,
    setJwt,
    isUserLoggedIn,
    setIsUserLoggedIn,
    isFirstConnection,
    setIsFirstConnection,
    refreshJwt,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
