import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "@contexts/UserContext";
import Protected from "@routing/Protected";
import VinylSpinner from "@components/UI/VinylSpinner";
import { ErrorBoundary } from "@components/ErrorBoundary/ErrorBoundary";
import { EGlobalUrls, COMMUNITY_COLLECTIONS_URL } from "@utils/GlobalUrls";

const Landpage = lazy(() => import("@pages/Landpage/Landpage"));
const Dashboard = lazy(() => import("@pages/Dashboard/Dashboard"));
const Layout = lazy(() => import("@components/Layout/Layout"));
const ResetPassword = lazy(() => import("@pages/ResetPassword/ResetPassword"));
const Settings = lazy(() => import("@pages/Settings/Settings"));
const CollectionsPage = lazy(() => import("@pages/Collections/CollectionsPage"));
const AddVinyls = lazy(() => import("@pages/AddVinyls/AddVinyls"));
const CollectionDetails = lazy(() => import("@pages/Collections/CollectionDetails"));
const Places = lazy(() => import("@pages/Places/Places"));
const Admin = lazy(() => import("@pages/Admin/Admin"));

function App() {
  const userContext = useUserContext();
  const location = useLocation();

  if (userContext.isUserLoggedIn === null)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <VinylSpinner />
      </div>
    );

  const shouldDisplayNavBar =
    userContext.isUserLoggedIn === true &&
    !location.pathname.includes("reset-password");

  return (
    <ErrorBoundary>
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <VinylSpinner />
        </div>
      }
    >
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
                  <CollectionsPage />
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
            {/* Legacy URL: Explore was merged into the Community tab of Collections */}
            <Route
              path={EGlobalUrls.EXPLORE}
              element={<Navigate to={COMMUNITY_COLLECTIONS_URL} replace />}
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
            <Route
              path={EGlobalUrls.ADMIN}
              element={
                <Protected>
                  <Admin />
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
    </Suspense>
    </ErrorBoundary>
  );
}

export default App;
