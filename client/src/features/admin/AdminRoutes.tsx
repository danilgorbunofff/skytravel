import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import RequireAdmin from "../../components/RequireAdmin";

const AdminPage = lazy(() => import("../../pages/AdminPage"));
const AdminStatisticsPage = lazy(() => import("../../pages/AdminStatisticsPage"));
const AdminSettingsPage = lazy(() => import("../../pages/AdminSettingsPage"));
const AdminEmailPage = lazy(() => import("../../pages/AdminEmailPage"));
const AdminAlexandriaPage = lazy(() => import("../../pages/AdminAlexandriaPage"));
const AdminOrextravelPage = lazy(() => import("../../pages/AdminOrextravelPage"));

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
          <Route index element={<AdminPage />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="emails" element={<AdminEmailPage />} />
          <Route path="alexandria" element={<AdminAlexandriaPage />} />
          <Route path="orextravel" element={<AdminOrextravelPage />} />
        </Routes>
      </Suspense>
    </RequireAdmin>
  );
}
