import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, BarChart3, Mail, Globe, Settings } from "lucide-react";
import { cn } from "../lib/utils";
import { Separator } from "./ui/separator";

const navItems = [
  { to: "/admin", label: "Nabídky", icon: LayoutDashboard, end: true },
  { to: "/admin/statistics", label: "Statistiky", icon: BarChart3 },
  { to: "/admin/emails", label: "E-maily", icon: Mail },
  { to: "/admin/alexandria", label: "Alexandria", icon: Globe },
  { to: "/admin/settings", label: "Nastavení", icon: Settings },
];

export default function AdminLayout({
  children,
  title = "Admin panel",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr]">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col gap-6 bg-gradient-to-b from-sidebar to-[#1f4a98] p-5 text-sidebar-foreground">
        <div>
          <Link className="text-3xl font-extrabold tracking-tight no-underline" to="/">
            <span className="text-blue-300">Sky</span>
            <span className="text-amber-300">Travel</span>
          </Link>
          <p className="mt-1 text-sm opacity-75">Admin Console</p>
        </div>

        <nav className="grid gap-1.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors no-underline",
                  isActive
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-white"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-white/10 p-3 text-sm">
          <span className="text-sidebar-foreground/70">Status API</span>
          <strong className="mt-0.5 block text-base">Online</strong>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-white/90 px-6 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <Link className="text-2xl font-extrabold tracking-tight no-underline lg:hidden" to="/">
              <span className="text-primary">Sky</span>
              <span className="text-amber-500">Travel</span>
            </Link>
            <Separator orientation="vertical" className="hidden h-6 lg:block" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
