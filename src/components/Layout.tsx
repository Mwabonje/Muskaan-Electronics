import { useState, useEffect, useMemo, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { getSystemSetting } from "../utils/settings";
import { db } from "../db/db";
import { useLiveQuery } from "../hooks/useLiveQuery";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quotesEnabled, setQuotesEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, logout, isLoading } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const unreadMessagesCount = useLiveQuery(async () => {
    if (!user?.id) return 0;
    const allMessages = await db.messages.toArray();
    return allMessages.filter(
      (m) =>
        !m.read &&
        (String(m.receiverId) === String(user.id) ||
          (m.receiverId === "super_admin" && role === "Super Admin") ||
          (m.receiverId === "all_managers" &&
            (role === "Manager" || role === "Admin" || role === "Super Admin")))
    ).length;
  }, [user?.id, role]);

  useEffect(() => {
    let isMounted = true;
    const checkQuotesEnabled = async () => {
      const enabled = await getSystemSetting("quotes_enabled_for_cashier");
      if (isMounted) {
        setQuotesEnabled(enabled !== "false");
      }
    };

    checkQuotesEnabled();
    const interval = setInterval(checkQuotesEnabled, 5000);

    return () => {
      isMounted = false;
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results
  }, [products, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.pathname === "/inventory") {
      setSearchQuery(searchParams.get("search") || "");
    } else {
      setSearchQuery("");
    }
  }, [location.pathname, searchParams]);

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
              <ShoppingCart className="w-6 h-6" aria-hidden="true" />
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
            aria-label="Close mobile menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
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
                  "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.name === "Messages" && unreadMessagesCount !== undefined && unreadMessagesCount > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadMessagesCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold shrink-0">
                <Users className="w-4 h-4" aria-hidden="true" />
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
                aria-label="Settings"
              >
                <SettingsIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Log Out"
            className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
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
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="relative hidden md:block w-full max-w-md" ref={searchContainerRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search items..."
                aria-label="Search items"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsSearchFocused(false);
                    navigate(`/inventory?search=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim() !== "" && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/inventory?search=${encodeURIComponent(product.name)}`);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                              {product.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {product.brand} • {product.category}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-300">
                              Ksh {typeof product.selling === 'number' ? product.selling.toLocaleString() : parseFloat(product.selling.toString().replace(/[^0-9.-]+/g, "") || "0").toLocaleString()}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              product.stock > 10 ? "text-emerald-400" : 
                              product.stock > 0 ? "text-amber-400" : "text-rose-400"
                            )}>
                              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                            </span>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-slate-700 mt-2 pt-2 px-2">
                        <button
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/inventory?search=${encodeURIComponent(searchQuery)}`);
                          }}
                          className="w-full text-center py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-md transition-colors"
                        >
                          View all results for "{searchQuery}"
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No products found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button aria-label="Notifications" className="relative p-2 text-slate-400 hover:bg-slate-800 rounded-lg border border-slate-800">
              <Bell className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="hidden sm:flex items-center text-sm text-slate-400 font-mono">
              {currentTime.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
