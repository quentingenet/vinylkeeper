import { Routes, Route, useLocation } from "react-router-dom";
import { useUserContext } from "@contexts/UserContext.tsx";
import Protected from "@routing/Protected";
import NoMatch from "@pages/NoMatch/NoMatch";
import Landpage from "@pages/Landpage/Landpage";
import Profile from "@pages/Profile/Profile";
import Dashboard from "@pages/Dashboard/Dashboard";
import Contact from "@pages/Contact/Contact";
import Terms from "@pages/Terms/Terms";
import NavBar from "@components/NavBar/NavBar";
import ResetPassword from "@pages/ResetPassword/ResetPassword";

function App() {
  const userContext = useUserContext();
  const location = useLocation();

  const shouldDisplayNavBar =
    userContext.isUserLoggedIn && !location.pathname.includes("reset-password");

  return (
    <>
      {shouldDisplayNavBar && <NavBar />}
      <Routes>
        <Route
          path="/"
          element={userContext.isUserLoggedIn ? <Dashboard /> : <Landpage />}
        />
        <Route path="/reset-password/" element={<ResetPassword />} />

        {userContext.isUserLoggedIn && (
          <>
            <Route
              path="/dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/profile"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />
          </>
        )}

        <Route path="/contact" element={<Contact />} />
        <Route path="/vinylkeeper-terms-and-conditions" element={<Terms />} />
        <Route path="*" element={<NoMatch />} />
      </Routes>
    </>
  );
}

export default App;
