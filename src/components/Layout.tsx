import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Receipt,
  ClipboardList,
  Truck,
  RotateCcw,
  BarChart3,
  Mail,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../context/AuthContext";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quotesEnabled, setQuotesEnabled] = useState(
    localStorage.getItem("quotes_enabled_for_cashier") !== "false"
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, isLoading } = useAuth();

  useEffect(() => {
    const handleStorageChange = () => {
      setQuotesEnabled(localStorage.getItem("quotes_enabled_for_cashier") !== "false");
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Sales History", path: "/sales", icon: Receipt },
    { name: "Quotes", path: "/quotes", icon: FileText, hideFor: quotesEnabled ? [] : ["Cashier"] },
    { name: "Purchase Orders", path: "/purchase-orders", icon: ClipboardList },
    { name: "Deliveries", path: "/deliveries", icon: Truck },
    { name: "Customer Returns", path: "/returns", icon: RotateCcw },
    {
      name: "Reports",
      path: "/reports",
      icon: BarChart3,
      hideFor: ["Cashier"],
    },
    { name: "Messages", path: "/messages", icon: Mail },
    {
      name: "User Management",
      path: "/users",
      icon: Users,
      hideFor: ["Cashier"],
    },
    {
      name: "Settings",
      path: "/settings",
      icon: SettingsIcon,
      hideFor: ["Cashier", "Manager", "Admin"],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.hideFor?.includes(role),
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-300 font-display relative">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] border-r border-slate-800 flex flex-col shrink-0 h-screen transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-white leading-tight">
                Muskaan Electronics
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                Retail Manager
              </p>
            </div>
          </div>
          <button
            className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                  {role}
                </p>
              </div>
            </div>
            {role === "Super Admin" && (
              <button
                onClick={() => {
                  navigate("/settings");
                  setIsMobileMenuOpen(false);
                }}
                className="text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full lg:w-auto bg-[#0f172a]">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 bg-[#0f172a]">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:bg-slate-800 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden md:block w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:bg-slate-800 rounded-lg border border-slate-800">
              <Bell className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center text-sm text-slate-400 font-mono">
              Mar 11, 2026
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
