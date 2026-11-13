import { logger } from "@utils/logger";
import { userApiService, type UserResponse } from "@services/UserApiService";
import { isSessionRefused } from "@utils/apiError";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const SESSION_KEY = "vk_has_session";
const STARTUP_RETRY_MS = 5000;

interface IUserContext {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isUserLoggedIn: boolean | null;
  setIsUserLoggedIn: (isLoggedIn: boolean) => void;
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
  const queryClient = useQueryClient();
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  // Latest login state, read by checkUserLoggedIn without making it change on every login change
  const isUserLoggedInRef = useRef<boolean | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped to check the session again when the first check could not reach the server
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    isUserLoggedInRef.current = isUserLoggedIn;
  }, [isUserLoggedIn]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    []
  );

  const checkUserLoggedIn = useCallback(async (): Promise<void> => {
    if (!localStorage.getItem(SESSION_KEY)) {
      setIsUserLoggedIn(false);
      return;
    }
    try {
      const { isLoggedIn } = await userApiService.refreshToken();
      if (!isLoggedIn) {
        setIsUserLoggedIn(false);
        setCurrentUser(null);
        return;
      }
      const user = await userApiService.getCurrentUser();
      setCurrentUser(user);
      setIsUserLoggedIn(true);
    } catch (error) {
      logger.error("Error while checking user logged in:", error);
      if (isSessionRefused(error)) {
        setIsUserLoggedIn(false);
        setCurrentUser(null);
        return;
      }
      // Offline or server down: the session may still be valid, so the current state stays. At
      // startup that state is still unknown (the loader): try again shortly
      if (isUserLoggedInRef.current === null) {
        retryTimerRef.current = setTimeout(() => setStartupAttempt((n) => n + 1), STARTUP_RETRY_MS);
      }
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
      // Logout, expired session or deleted account: the next user on this device
      // must not see cached data of the previous one
      queryClient.clear();
    }
  }, [isUserLoggedIn, queryClient]);

  useEffect(() => {
    void checkUserLoggedIn();
  }, [checkUserLoggedIn, startupAttempt]);

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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    logout,
    currentUser,
    setCurrentUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
