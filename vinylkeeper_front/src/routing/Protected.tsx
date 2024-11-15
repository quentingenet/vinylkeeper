import { Navigate } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext";

/**
 * Protected component props interface
 * @interface ProtectedProps
 * @property {React.ReactNode} children - Child components to be rendered within the protected route
 */
interface ProtectedProps {
  children: React.ReactNode;
}

/**
 * Protected component that ensures only logged-in users can access the route
 * @component
 * @param {ProtectedProps} props - Component props
 * @returns {JSX.Element} Protected component with child components
 */
function Protected({ children }: ProtectedProps) {
  const { isUserLoggedIn } = useUserContext();

  if (!isUserLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default Protected;
