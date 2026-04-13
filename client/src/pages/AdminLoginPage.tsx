import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../features/admin/services/adminApi";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Link to="/" className="text-3xl font-extrabold tracking-tight no-underline">
            <span className="text-primary">Sky</span>
            <span className="text-amber-500">Travel</span>
          </Link>
          <CardTitle className="mt-2">Admin přihlášení</CardTitle>
          <CardDescription>Pro přístup do administrace</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminLogin">Login</Label>
              <Input
                id="adminLogin"
                type="text"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                autoComplete="username"
                placeholder="Váš login"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Heslo</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full">
              Přihlásit se
            </Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Zpět na web
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
