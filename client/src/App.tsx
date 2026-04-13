import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import GdprPage from "./pages/GdprPage";
import TermsPage from "./pages/TermsPage";
import AdminRoutes from "./features/admin/AdminRoutes";
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
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
