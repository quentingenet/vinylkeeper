import { logger } from "@utils/logger";
import { userApiService, type UserResponse } from "@services/UserApiService";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

const SESSION_KEY = "vk_has_session";

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
// eslint-disable-next-line react-refresh/only-export-components
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

// eslint-disable-next-line react-refresh/only-export-components
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

  const checkUserLoggedIn = useCallback(async () => {
    if (!localStorage.getItem(SESSION_KEY)) {
      setIsUserLoggedIn(false);
      return;
    }
    try {
      const { isLoggedIn } = await userApiService.refreshToken();
      setIsUserLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        try {
          const user = await userApiService.getCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          logger.error("Error fetching current user:", error);
          setIsUserLoggedIn(false);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      logger.error("Error while checking user logged in:", error);
      setIsUserLoggedIn(false);
      setCurrentUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await userApiService.logout();
    } catch (error) {
      logger.error("Error while logging out:", error);
    } finally {
      if (currentUser) {
        localStorage.removeItem(`tutorial_seen_${currentUser.user_uuid}`);
      }
      localStorage.removeItem(SESSION_KEY);
      setIsUserLoggedIn(false);
      setCurrentUser(null);
      void navigate("/", { replace: true });
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    if (isUserLoggedIn === true) {
      localStorage.setItem(SESSION_KEY, "1");
    } else if (isUserLoggedIn === false) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [isUserLoggedIn]);

  useEffect(() => {
    void checkUserLoggedIn();
  }, [checkUserLoggedIn]);

  // Token refresh interval, active only while logged in
  useEffect(() => {
    if (!isUserLoggedIn) return;
    const intervalId = setInterval(() => { void checkUserLoggedIn(); }, 25 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isUserLoggedIn, checkUserLoggedIn]);

  const value: IUserContext = {
    isLoading,
    setIsLoading,
    isUserLoggedIn,
    setIsUserLoggedIn,
    isFirstConnection,
    setIsFirstConnection,
    openDialog,
    setOpenDialog,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    logout,
    currentUser,
    setCurrentUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
