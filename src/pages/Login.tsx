import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

// ✅ Import new login logo (AVIF)
import loginLogo from "@/assets/final.avif";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Determine login mode based on route
  const isAdminLogin = location.pathname === "/admin-login";
  const isPrintKeeperLogin = location.pathname === "/print-keeper-login";

  useEffect(() => {
    // Always start with empty credentials when this screen/mode is opened.
    setEmail("");
    setPassword("");
    setError("");
  }, [location.pathname]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const roleType = isAdminLogin ? 'admin' : isPrintKeeperLogin ? 'print_keeper' : 'student';
      await login(email, password, roleType);
      navigate(isPrintKeeperLogin ? "/print-keeper" : "/dashboard");
    } catch (err: Error | unknown) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl bg-card rounded-2xl shadow-elevated overflow-hidden flex animate-fade-in">

        {/* ================= Left Panel – Branding (Desktop) ================= */}
        <div className="hidden md:flex md:w-1/2 gradient-primary flex-col items-center justify-center p-12 text-primary-foreground">
          
          <div className="w-28 h-28 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mb-8 border-2 border-primary-foreground/20">
            <div className="w-24 h-24 rounded-full bg-primary-foreground flex items-center justify-center">
              <img
                src={loginLogo}
                alt="RIT Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">RIT</h1>
          <h2 className="text-lg font-semibold text-center mb-4">
            Rajalakshmi Institute of Technology
          </h2>
          <p className="text-sm text-center text-primary-foreground/80 mb-2">
            An Autonomous Institution
          </p>

          <div className="mt-4 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
            <p className="text-xs font-medium text-center">
              Accredited with A++ Grade in NAAC
            </p>
          </div>
        </div>

        {/* ================= Right Panel – Login Form ================= */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">

          {/* Mobile Logo */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4">
              <img
                src={loginLogo}
                alt="RIT Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h2 className="text-lg font-bold text-foreground">RIT Chennai</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isPrintKeeperLogin ? "Print Shop Login" : isAdminLogin ? "Admin Login" : "Login to Portal"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isPrintKeeperLogin
                ? "Enter your print keeper credentials"
                : isAdminLogin
                ? "Enter your admin credentials to access the portal"
                : "Enter your credentials to access your account"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {isPrintKeeperLogin ? "Keeper Email" : isAdminLogin ? "Admin Email" : "Email Address"}
              </Label>
              <Input
                id="email"
                type="email"
                name="login-email"
                autoComplete="off"
                placeholder={isPrintKeeperLogin ? "print@rit.edu" : isAdminLogin ? "admin@rit.edu" : "student@rit.edu"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="login-password"
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg border-border bg-background pr-12 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a
                href="#"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg gradient-primary text-primary-foreground font-semibold text-base shadow-lg hover:opacity-90 transition-all"
              disabled={loading}
            >
              {loading ? "Logging in..." : isPrintKeeperLogin ? "Print Shop Login" : isAdminLogin ? "Admin Login" : "Login"}
            </Button>
          </form>

          {/* Toggle between Student and Admin Login */}
          <div className="mt-6 text-center space-y-3">
            {!isPrintKeeperLogin && (
              <button
                type="button"
                onClick={() => navigate(isAdminLogin ? "/login" : "/admin-login")}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors block w-full"
              >
                {isAdminLogin ? "Login as Student" : "Login as Admin"}
              </button>
            )}
            {!isPrintKeeperLogin && (
              <button
                type="button"
                onClick={() => navigate("/print-keeper-login")}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors block w-full"
              >
                Login as Print Keeper
              </button>
            )}

            <div className="pt-3 border-t border-border">
              {isPrintKeeperLogin ? (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Student Login
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Create Account
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            © 2024 Rajalakshmi Institute of Technology. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
