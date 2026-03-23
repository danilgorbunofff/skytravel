import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminMe } from "../api";
import "../site.css";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "authed" | "unauth">("checking");

  useEffect(() => {
    fetchAdminMe()
      .then(() => setStatus("authed"))
      .catch(() => {
        setStatus("unauth");
        navigate("/admin-login", { replace: true });
      });
  }, [navigate]);

  if (status !== "authed") {
    return <div className="admin-guard" aria-busy="true" />;
  }

  return <>{children}</>;
}
