import { Routes, Route, useLocation } from "react-router-dom";
import { useUserContext } from "@contexts/UserContext";
import Protected from "@routing/Protected";
import NoMatch from "@pages/NoMatch/NoMatch";
import Landpage from "@pages/Landpage/Landpage";
import Dashboard from "@pages/Dashboard/Dashboard";
import Contact from "@pages/Contact/Contact";
import Terms from "@pages/Terms/Terms";
import Layout from "@components/Layout/Layout";
import ResetPassword from "@pages/ResetPassword/ResetPassword";
import Settings from "@pages/Settings/Settings";
import Collections from "@pages/Collections/Collections";
import AddVinyls from "@pages/AddVinyls/AddVinyls";
import Explore from "@pages/Explore/Explore";
import Wishlist from "@pages/Wishlist/Wishlist";
import Community from "@pages/Community/Community";
import Loans from "@pages/Loans/Loans";
import { EGlobalUrls } from "@utils/GlobalUrls";

function App() {
  const userContext = useUserContext();
  const location = useLocation();

  const shouldDisplayNavBar =
    userContext.isUserLoggedIn && !location.pathname.includes("reset-password");

  return (
    <>
      {shouldDisplayNavBar ? (
        <Layout>
          <Routes>
            <Route
              path="/"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.DASHBOARD}
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.COLLECTIONS}
              element={
                <Protected>
                  <Collections />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.ADD_VINYLS}
              element={
                <Protected>
                  <AddVinyls />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.EXPLORE}
              element={
                <Protected>
                  <Explore />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.WISHLIST}
              element={
                <Protected>
                  <Wishlist />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.LOANS}
              element={
                <Protected>
                  <Loans />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.COMMUNITY}
              element={
                <Protected>
                  <Community />
                </Protected>
              }
            />
            <Route
              path={EGlobalUrls.SETTINGS}
              element={
                <Protected>
                  <Settings />
                </Protected>
              }
            />
            <Route path={EGlobalUrls.CONTACT} element={<Contact />} />
            <Route path={EGlobalUrls.TERMS} element={<Terms />} />
            <Route path="*" element={<NoMatch />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path={EGlobalUrls.ROOT} element={<Landpage />} />
          <Route
            path={EGlobalUrls.RESET_PASSWORD}
            element={<ResetPassword />}
          />
          <Route path={EGlobalUrls.NO_MATCH} element={<NoMatch />} />
        </Routes>
      )}
    </>
  );
}

export default App;
