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
 * Interface defining the structure of the User Context
 * @interface IUserContext
 * @property {boolean} isLoading - Loading state flag
 * @property {function} setIsLoading - Function to update loading state
 * @property {string} jwt - JSON Web Token for authentication
 * @property {function} setJwt - Function to update JWT
 * @property {boolean|null} isUserLoggedIn - User login status
 * @property {function} setIsUserLoggedIn - Function to update login status
 * @property {boolean} isFirstConnection - Flag for first time connection
 * @property {function} setIsFirstConnection - Function to update first connection status
 * @property {boolean} openDialog - Dialog display state
 * @property {function} setOpenDialog - Function to control dialog visibility
 * @property {function} refreshJwt - Async function to refresh JWT token
 * @property {function} logout - Function to handle user logout
 */
interface IUserContext {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  jwt: { access_token: string; refresh_token: string };
  setJwt: (jwt: { access_token: string; refresh_token: string }) => void;
  isUserLoggedIn: boolean | null;
  setIsUserLoggedIn: (isLoggedIn: boolean) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  openDialog: boolean;
  setOpenDialog: (openDialog: boolean) => void;
  refreshJwt: () => Promise<void>;
  logout: () => void;
}

/**
 * User context object
 * @constant
 * @type {IUserContext}
 */
export const UserContext = createContext<IUserContext>({
  isLoading: false,
  setIsLoading: () => {},
  jwt: { access_token: "", refresh_token: "" },
  setJwt: () => {},
  isUserLoggedIn: null,
  setIsUserLoggedIn: () => {},
  isFirstConnection: false,
  setIsFirstConnection: () => {},
  openDialog: false,
  setOpenDialog: () => {},
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
  const [jwt, setJwt] = useState<{
    access_token: string;
    refresh_token: string;
  }>({ access_token: "", refresh_token: "" });
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const refreshJwt = useCallback(async () => {
    try {
      const newJwt = await requestService<{
        access_token: string;
        refresh_token: string;
      }>({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/refresh-token",
      });
      if (newJwt) {
        setJwt({
          access_token: newJwt.access_token,
          refresh_token: newJwt.refresh_token,
        });
        setIsUserLoggedIn(true);
      } else {
        throw new Error("No JWT returned");
      }
    } catch (error) {
      setJwt({ access_token: "", refresh_token: "" });
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
      setJwt({ access_token: "", refresh_token: "" });
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
    isLoading,
    setIsLoading,
    jwt,
    setJwt,
    isUserLoggedIn,
    setIsUserLoggedIn,
    isFirstConnection,
    setIsFirstConnection,
    openDialog,
    setOpenDialog,
    refreshJwt,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
