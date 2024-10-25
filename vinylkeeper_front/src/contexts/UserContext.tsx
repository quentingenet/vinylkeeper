import { API_URL } from "@utils/GlobalUtils";
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
      const response = await fetch(API_URL.concat("/users/refresh-token"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        setIsUserLoggedIn(true);
      } else {
        console.error("Échec du rafraîchissement du JWT:", response.status);
        logout();
      }
    } catch (error) {
      console.error("Erreur réseau lors du rafraîchissement du JWT :", error);
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
