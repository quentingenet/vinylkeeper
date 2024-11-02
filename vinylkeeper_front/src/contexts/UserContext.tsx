import { API_VK_URL } from "@utils/GlobalUtils";
import requestService from "@utils/RequestService";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

interface IUserContext {
  jwt: string;
  setJwt: (jwt: string) => void;
  isUserLoggedIn: boolean | null;
  setIsUserLoggedIn: (isLoggedIn: boolean) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  refreshJwt: () => Promise<void>;
  logout: () => void;
}

export const UserContext = createContext<IUserContext>({
  jwt: "",
  setJwt: () => {},
  isUserLoggedIn: null,
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
  const navigate = useNavigate();
  const [jwt, setJwt] = useState<string>("");
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);

  const refreshJwt = useCallback(async () => {
    try {
      const response = await requestService({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/refresh-token",
        credentials: "include",
      });

      const newJwt = response;
      if (newJwt) {
        setJwt(newJwt);
        setIsUserLoggedIn(true);
      } else {
        throw new Error("No JWT returned");
      }
    } catch (error) {
      setJwt("");
      setIsUserLoggedIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await requestService({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/logout",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error while logging out:", error);
    } finally {
      setJwt("");
      setIsUserLoggedIn(false);
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      await refreshJwt();
    };

    checkUserLoggedIn();
  }, [refreshJwt]);

  useEffect(() => {
    if (isUserLoggedIn) {
      const intervalId = setInterval(() => {
        refreshJwt();
      }, 14 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [isUserLoggedIn, refreshJwt]);

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
