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
  isUserLoggedIn: boolean | null;
  setIsUserLoggedIn: (isLoggedIn: boolean) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  openDialog: boolean;
  setOpenDialog: (openDialog: boolean) => void;
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
  isUserLoggedIn: null,
  setIsUserLoggedIn: () => {},
  isFirstConnection: false,
  setIsFirstConnection: () => {},
  openDialog: false,
  setOpenDialog: () => {},
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
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const checkUserLoggedIn = useCallback(async () => {
    try {
      const response = await requestService<{ isLoggedIn: boolean }>({
        apiTarget: API_VK_URL,
        method: "GET",
        endpoint: "/users/check-auth",
      });
      setIsUserLoggedIn(response.isLoggedIn);
    } catch (error) {
      console.error("Error while checking user logged in:", error);
      setIsUserLoggedIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await requestService({
        apiTarget: API_VK_URL,
        method: "POST",
        endpoint: "/users/logout",
      });
      setIsUserLoggedIn(response.isLoggedIn);
    } catch (error) {
      console.error("Error while logging out:", error);
    } finally {
      setIsUserLoggedIn(false);
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    checkUserLoggedIn();
    const intervalId = setInterval(checkUserLoggedIn, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [checkUserLoggedIn]);

  const value: IUserContext = {
    isLoading,
    setIsLoading,
    isUserLoggedIn,
    setIsUserLoggedIn,
    isFirstConnection,
    setIsFirstConnection,
    openDialog,
    setOpenDialog,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
