import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Unlock, AlertTriangle, X } from "lucide-react";

export default function Settings() {
  const { role } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    setIsLocked(localStorage.getItem("system_locked") === "true");
  }, []);

  const handleToggleLock = () => {
    if (!isLocked) {
      setShowConfirmModal(true);
    } else {
      setIsLocked(false);
      localStorage.setItem("system_locked", "false");
    }
  };

  const confirmLock = () => {
    setIsLocked(true);
    localStorage.setItem("system_locked", "true");
    setShowConfirmModal(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto relative">
      <h1 className="text-3xl font-black leading-tight tracking-tight mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* General Settings Placeholder */}
        <div className="bg-white p-8 rounded-xl border border-primary/10 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            General Settings
          </h2>
          <p className="text-slate-500">More system settings coming soon.</p>
        </div>

        {/* Super Admin Only: System Maintenance */}
        {role === "Super Admin" && (
          <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
            <div className="bg-rose-50/50 p-6 border-b border-rose-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    System Maintenance & Access
                  </h2>
                  <p className="text-sm text-slate-500">
                    Critical system controls. Use with caution.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">System Lock</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-xl">
                    Locking the system will immediately block all Managers and
                    Cashiers from accessing the application. This is typically
                    used for unpaid maintenance fees or critical system updates.
                  </p>
                </div>

                <button
                  onClick={handleToggleLock}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                    isLocked
                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                      : "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Unlock className="w-5 h-5" />
                      <span>Unlock System</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Lock System</span>
                    </>
                  )}
                </button>
              </div>

              {isLocked && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                  <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-800">
                      System is currently locked
                    </p>
                    <p className="text-sm text-rose-600 mt-1">
                      Regular users are currently seeing the "System Locked"
                      screen and cannot access any features.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Confirm System Lock
                </h2>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-600 mb-4">
                <strong>WARNING:</strong> You are about to lock the entire
                system.
              </p>
              <p className="text-slate-600 mb-6">
                All users except Super Admins will be immediately locked out.
                Are you sure you want to proceed?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLock}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm shadow-rose-600/20"
                >
                  Yes, Lock System
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
