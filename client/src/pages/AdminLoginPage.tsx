import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../api";
import "../site.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!login.trim() || !password.trim()) {
      setError("Zadejte prosím přihlašovací jméno i heslo.");
      return;
    }
    setError("");
    loginAdmin(login.trim(), password)
      .then(() => {
        navigate("/admin");
      })
      .catch(() => {
        setError("Neplatné přihlašovací údaje.");
      });
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-head">
          <Link to="/" className="logo admin-login-logo">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>
          <p>Admin přihlášení</p>
        </div>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="adminLogin">Login</label>
          <input
            id="adminLogin"
            type="text"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete="username"
            placeholder="Váš login"
          />
          <label htmlFor="adminPassword">Heslo</label>
          <div className="admin-login-password">
            <input
              id="adminPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="admin-login-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          {error && <p className="admin-login-error">{error}</p>}
          <button type="submit">Přihlásit se</button>
        </form>
        <div className="admin-login-footer">
          <span>Pro přístup do adminu.</span>
          <Link to="/">Zpět na web</Link>
        </div>
      </div>
    </div>
  );
}
