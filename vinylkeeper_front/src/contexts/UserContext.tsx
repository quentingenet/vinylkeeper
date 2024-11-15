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

/**
 * User context interface
 * @interface IUserContext
 * @property {string} jwt - The JWT token
 * @property {(jwt: string) => void} setJwt - Function to set the JWT token
 * @property {boolean | null} isUserLoggedIn - Whether the user is logged in or not
 * @property {(isLoggedIn: boolean) => void} setIsUserLoggedIn - Function to set the user login status
 * @property {boolean} isFirstConnection - Whether the user is on their first connection
 * @property {(isFirstConnection: boolean) => void} setIsFirstConnection - Function to set the first connection status
 * @property {() => Promise<void>} refreshJwt - Function to refresh the JWT token
 * @property {() => void} logout - Function to log out the user
 */
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

/**
 * User context object
 * @constant
 * @type {IUserContext}
 */
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
      const newJwt = await requestService<string>({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/refresh-token",
      });

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
