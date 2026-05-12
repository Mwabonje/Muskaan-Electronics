import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Lock, ArrowRight } from "lucide-react";
import { supabase } from "../supabase";

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: verification that we actually have a session, 
    // but the hash is processed asynchronously by supabase-js.
    // If the user lands here directly without a recovery session, they might fail to update.
    // Wait until auth is configured.
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setIsUpdating(false);
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
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Key className="text-blue-600 w-8 h-8" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Reset Password
            </h2>
            <p className="text-slate-500 mt-2 text-center text-sm">
              Please enter your new password below.
            </p>
          </div>

          <div className="px-8 pb-8">
            {success ? (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium text-center">
                  Password successfully updated!
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleUpdatePassword}>
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}
                
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative flex">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative flex">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 mt-4"
                >
                  <span>{isUpdating ? "Updating..." : "Update Password"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
