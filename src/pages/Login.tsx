import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MonitorSmartphone,
  User,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { db } from "../db/db";
import { useAuth } from "../context/AuthContext";
import { getSystemSetting } from "../utils/settings";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const user = await db.users
        .where("email")
        .equalsIgnoreCase(email)
        .first();

      if (user) {
        if (user.password !== password) {
          setError("Invalid email or password.");
          return;
        }

        if (user.status === "Inactive") {
          setError(
            "This account is inactive. Please contact an administrator.",
          );
          return;
        }

        const isLocked = await getSystemSetting("system_locked") === "true";
        if (isLocked && user.role !== "Super Admin") {
          setError(
            "System is currently locked for maintenance. Please contact an administrator.",
          );
          return;
        }

        // Update last login
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        await db.users.update(user.id!, {
          lastLogin: `${formattedDate} at ${formattedTime}`,
        });

        login(user);
        navigate("/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login.");
    }
  };

  return (
    <div className="bg-background-light min-h-screen flex items-center justify-center p-4 font-display text-slate-900 relative">
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "radial-gradient(#741ce9 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="relative w-full max-w-[480px] z-10">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">
          <div className="pt-10 pb-6 px-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <MonitorSmartphone className="text-primary w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Muskaan Electronics
            </h2>
            <p className="text-slate-500 mt-2">
              Welcome back! Please login to your account.
            </p>
          </div>

          <div className="px-8 pb-6">
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="username"
                >
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    id="username"
                    name="username"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="remember" className="text-sm text-slate-600">
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Login to Account</span>
                <LogIn className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
