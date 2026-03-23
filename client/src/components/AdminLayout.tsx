import { Link, NavLink } from "react-router-dom";
import "../admin.css";

export default function AdminLayout({
  children,
  title = "Admin panel",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Link className="logo" to="/">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>
          <p>Admin Console</p>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? "is-active" : "")}>
            Nabídky
          </NavLink>
          <NavLink to="/admin/statistics" className={({ isActive }) => (isActive ? "is-active" : "")}>
            Statistiky
          </NavLink>
          <NavLink to="/admin/emails" className={({ isActive }) => (isActive ? "is-active" : "")}>
            E-maily
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "is-active" : "")}>
            Nastavení
          </NavLink>
        </nav>
        <div className="admin-sidebar__footer">
          <span>Status API</span>
          <strong>Online</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header__inner">
            <Link className="logo" to="/">
              <span className="logo__sky">Sky</span>
              <span className="logo__travel">Travel</span>
            </Link>
            <h1>{title}</h1>
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-layout">{children}</div>
        </main>
      </div>
    </div>
  );
}
