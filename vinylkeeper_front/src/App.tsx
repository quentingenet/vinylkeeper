import { Routes, Route, useLocation } from "react-router-dom";
import { useUserContext } from "@contexts/UserContext";
import Protected from "@routing/Protected";
import Landpage from "@pages/Landpage/Landpage";
import Dashboard from "@pages/Dashboard/Dashboard";
import Layout from "@components/Layout/Layout";
import ResetPassword from "@pages/ResetPassword/ResetPassword";
import Settings from "@pages/Settings/Settings";
import Collections from "@pages/Collections/Collections";
import AddVinyls from "@pages/AddVinyls/AddVinyls";
import Explore from "@pages/Explore/Explore";
import { EGlobalUrls } from "@utils/GlobalUrls";
import CollectionDetails from "@pages/Collections/CollectionDetails";
import Places from "@pages/Places/Places";

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
              path={EGlobalUrls.COLLECTION_DETAILS}
              element={
                <Protected>
                  <CollectionDetails />
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
              path={EGlobalUrls.PLACES}
              element={
                <Protected>
                  <Places />
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
            <Route path="*" element={<Landpage />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path={EGlobalUrls.ROOT} element={<Landpage />} />
          <Route
            path={EGlobalUrls.RESET_PASSWORD}
            element={<ResetPassword />}
          />
          <Route path={EGlobalUrls.NO_MATCH} element={<Landpage />} />
        </Routes>
      )}
    </>
  );
}

export default App;
