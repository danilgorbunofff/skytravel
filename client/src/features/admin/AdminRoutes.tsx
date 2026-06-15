import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAdmin from "../../components/RequireAdmin";
import { ErrorBoundary } from "../../components/ErrorBoundary";

const AdminPage = lazy(() => import("../../pages/AdminPage"));
const AdminStatisticsPage = lazy(() => import("../../pages/AdminStatisticsPage"));
const AdminSettingsPage = lazy(() => import("../../pages/AdminSettingsPage"));
const AdminEmailPage = lazy(() => import("../../pages/AdminEmailPage"));
const AdminSearchPage = lazy(() => import("../../pages/AdminSearchPage"));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function AdminRoutes() {
  return (
    <RequireAdmin>
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route
            index
            element={
              <ErrorBoundary key="admin-page" onReset={() => window.location.reload()}>
                <AdminPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="statistics"
            element={
              <ErrorBoundary key="admin-statistics" onReset={() => window.location.reload()}>
                <AdminStatisticsPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="settings"
            element={
              <ErrorBoundary key="admin-settings" onReset={() => window.location.reload()}>
                <AdminSettingsPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="emails"
            element={
              <ErrorBoundary key="admin-emails" onReset={() => window.location.reload()}>
                <AdminEmailPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="search"
            element={
              <ErrorBoundary key="admin-search" onReset={() => window.location.reload()}>
                <AdminSearchPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="alexandria"
            element={<Navigate to="/admin/search?provider=alexandria" replace />}
          />
          <Route
            path="orextravel"
            element={<Navigate to="/admin/search?provider=orextravel" replace />}
          />
        </Routes>
      </Suspense>
    </RequireAdmin>
  );
}
