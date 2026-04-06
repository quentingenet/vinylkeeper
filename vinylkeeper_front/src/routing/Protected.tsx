import { Navigate } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext";
import VinylSpinner from "@components/UI/VinylSpinner";

interface ProtectedProps {
  children: React.ReactNode;
}

function Protected({ children }: ProtectedProps) {
  const { isUserLoggedIn } = useUserContext();

  if (isUserLoggedIn === null) return <VinylSpinner />;
  if (!isUserLoggedIn) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default Protected;
