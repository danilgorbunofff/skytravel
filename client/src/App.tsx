import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminStatisticsPage from "./pages/AdminStatisticsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminEmailPage from "./pages/AdminEmailPage";
import GdprPage from "./pages/GdprPage";
import TermsPage from "./pages/TermsPage";
import RequireAdmin from "./components/RequireAdmin";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gdpr" element={<GdprPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/statistics"
          element={
            <RequireAdmin>
              <AdminStatisticsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAdmin>
              <AdminSettingsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/emails"
          element={
            <RequireAdmin>
              <AdminEmailPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
