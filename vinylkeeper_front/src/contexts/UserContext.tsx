import { API_VK_URL } from "@utils/GlobalUtils";
import requestService from "@utils/RequestService";
import { userApiService, type UserResponse } from "@services/UserApiService";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { capacitorHttpService } from "@utils/CapacitorHttpService";
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
 * @property {UserResponse | null} currentUser - Current user information
 * @property {function} setCurrentUser - Function to update current user information
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
  currentUser: UserResponse | null;
  setCurrentUser: (user: UserResponse | null) => void;
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
  currentUser: null,
  setCurrentUser: () => {},
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
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState<boolean>(false);

  const checkUserLoggedIn = useCallback(async () => {
    // Only check once on initial load, then only if user is logged in
    if (hasCheckedAuth && !isUserLoggedIn) {
      return;
    }

    try {
      let response: { isLoggedIn: boolean };

      if (isCapacitorPlatform()) {
        response = await capacitorHttpService.post<{ isLoggedIn: boolean }>(
          "/users/refresh-token",
          undefined,
          true
        );
      } else {
        response = await requestService<{ isLoggedIn: boolean }>({
          apiTarget: API_VK_URL,
          method: "POST",
          endpoint: "/users/refresh-token",
          skipRefresh: true,
        });
      }

      setIsUserLoggedIn(response.isLoggedIn);
      setHasCheckedAuth(true);

      if (response.isLoggedIn) {
        try {
          const user = await userApiService.getCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          console.error("Error fetching current user:", error);
          // If we can't fetch user data, assume user is not logged in
          setIsUserLoggedIn(false);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error while checking user logged in:", error);
      setIsUserLoggedIn(false);
      setCurrentUser(null);
      setHasCheckedAuth(true);
    }
  }, [hasCheckedAuth, isUserLoggedIn]);

  const logout = useCallback(async () => {
    try {
      let response: { isLoggedIn: boolean };

      if (isCapacitorPlatform()) {
        response = await capacitorHttpService.post<{ isLoggedIn: boolean }>(
          "/users/logout"
        );
      } else {
        response = await requestService<{ isLoggedIn: boolean }>({
          apiTarget: API_VK_URL,
          method: "POST",
          endpoint: "/users/logout",
        });
      }

      setIsUserLoggedIn(response.isLoggedIn);
    } catch (error) {
      console.error("Error while logging out:", error);
    } finally {
      // Clear tutorial seen status from localStorage on logout
      if (currentUser) {
        const tutorialSeenKey = `tutorial_seen_${currentUser.user_uuid}`;
        localStorage.removeItem(tutorialSeenKey);
      }
      setIsUserLoggedIn(false);
      setCurrentUser(null);
      navigate("/", { replace: true });
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    checkUserLoggedIn();
    // Only set up interval if user is logged in
    const intervalId = setInterval(() => {
      if (isUserLoggedIn) {
        checkUserLoggedIn();
      }
    }, 25 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [checkUserLoggedIn, isUserLoggedIn]);

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
    currentUser,
    setCurrentUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
