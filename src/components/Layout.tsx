import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Bolt, 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Receipt, 
  Users, 
  BarChart3, 
  UserCog, 
  Settings as SettingsIcon,
  LogOut,
  Search,
  Bell,
  HelpCircle,
  Shield
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const location = useLocation();
  const { role, setRole } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Inventory', path: '/inventory', icon: Warehouse },
    { name: 'Sales', path: '/pos', icon: Receipt },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Reports', path: '/reports', icon: BarChart3, hideFor: ['Cashier'] },
  ];

  const systemItems = [
    { name: 'Users', path: '/users', icon: UserCog, hideFor: ['Cashier'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, hideFor: ['Cashier'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.hideFor?.includes(role));
  const filteredSystemItems = systemItems.filter(item => !item.hideFor?.includes(role));

  return (
    <div className="flex min-h-screen bg-background-light text-slate-900 font-display">
      {/* Sidebar */}
      <aside className="w-64 border-r border-primary/10 bg-white flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
            <Bolt className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-tight uppercase tracking-wider">Muskaan</h1>
            <p className="text-primary text-xs font-medium">Admin Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-white font-medium shadow-lg shadow-primary/20" 
                  : "text-slate-600 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
          
          {filteredSystemItems.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</div>
              
              {filteredSystemItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary text-white font-medium shadow-lg shadow-primary/20" 
                      : "text-slate-600 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
        
        <div className="p-4 mt-auto border-t border-primary/10">
          {/* Role Switcher for Testing */}
          <div className="mb-3 p-2 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Test Role</span>
              <Shield className="w-3 h-3 text-slate-400" />
            </div>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <UserCog className="w-4 h-4" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold truncate">Current User</p>
              <p className="text-[10px] text-slate-500 truncate">{role}</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-400 cursor-pointer hover:text-primary" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/80 border-b border-primary/10 flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              />
            </div>
            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
