import { Lock } from "lucide-react";

export default function SystemLocked() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-light p-4 font-display text-slate-900 relative">
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "radial-gradient(#741ce9 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20">
          <Lock className="w-12 h-12" />
        </div>

        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          System Locked
        </h1>

        <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm text-slate-600 space-y-4">
          <p className="text-lg font-medium text-slate-800">
            Access to Muskaan Electronics has been temporarily suspended.
          </p>
          <p>
            The system is currently locked due to pending maintenance fees or
            administrative action. Please contact your system administrator or
            service provider to restore access.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => {
              localStorage.removeItem("auth_user_id");
              window.location.href = "/login";
            }}
            className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
