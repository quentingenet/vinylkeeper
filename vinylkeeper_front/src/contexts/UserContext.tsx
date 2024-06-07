import { createContext, useContext, useState } from "react";

interface IUserContext {
  jwt: string;
  setJwt: (jwt: string) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  isUserLoggedIn: boolean;
  setIsUserLoggedIn: (isUserLoggedIn: boolean) => void;
}

export const UserContext = createContext<IUserContext>({
  jwt: "",
  setJwt: () => {},
  isFirstConnection: false,
  setIsFirstConnection: () => {},
  isUserLoggedIn: false,
  setIsUserLoggedIn: () => {},
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
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);

  const value: IUserContext = {
    jwt: jwt,
    setJwt: setJwt,
    isFirstConnection: isFirstConnection,
    setIsFirstConnection: setIsFirstConnection,
    isUserLoggedIn: isUserLoggedIn,
    setIsUserLoggedIn: setIsUserLoggedIn,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
