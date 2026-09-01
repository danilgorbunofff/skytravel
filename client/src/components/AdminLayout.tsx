import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, BarChart3, Mail, Search, Settings, Menu, X, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { logoutAdmin } from "../features/admin/services/adminApi";

const navItems = [
  { to: "/admin", label: "Nabídky", icon: LayoutDashboard, end: true },
  { to: "/admin/statistics", label: "Statistiky", icon: BarChart3 },
  { to: "/admin/emails", label: "E-maily", icon: Mail },
  { to: "/admin/search", label: "Vyhledávání", icon: Search },
  { to: "/admin/settings", label: "Nastavení", icon: Settings },
];

export default function AdminLayout({
  children,
  title = "Admin panel",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent admin pages from being indexed
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        aria-label="Admin navigace"
        aria-hidden={sidebarOpen ? undefined : false}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col gap-6 bg-gradient-to-b from-sidebar to-[#1f4a98] p-5 text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <Link className="text-3xl font-extrabold tracking-tight no-underline" to="/">
              <span className="text-blue-300">Sky</span>
              <span className="text-amber-300">Travel</span>
            </Link>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest opacity-60">
              Admin Console
            </p>
          </div>
          <button
            className="mt-1 rounded-md p-1 text-sidebar-foreground/70 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Zavřít menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="grid gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all no-underline",
                  isActive
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Button
          variant="ghost"
          className="mt-auto justify-start gap-3 text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
          onClick={async () => {
            try {
              await logoutAdmin();
            } finally {
              navigate("/admin-login", { replace: true });
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          Odhlásit se
        </Button>
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Otevřít menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link className="text-2xl font-extrabold tracking-tight no-underline lg:hidden" to="/">
              <span className="text-primary">Sky</span>
              <span className="text-amber-500">Travel</span>
            </Link>
            <Separator orientation="vertical" className="hidden h-6 lg:block" />
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto hidden gap-2 lg:inline-flex"
              onClick={async () => {
                try {
                  await logoutAdmin();
                } finally {
                  navigate("/admin-login", { replace: true });
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              Odhlásit
            </Button>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
