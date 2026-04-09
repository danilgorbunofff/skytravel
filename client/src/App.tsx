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

function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}

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
          path="/admin/*"
          element={
            <AdminGuard>
              <Routes>
                <Route index element={<AdminPage />} />
                <Route path="statistics" element={<AdminStatisticsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="emails" element={<AdminEmailPage />} />
              </Routes>
            </AdminGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
