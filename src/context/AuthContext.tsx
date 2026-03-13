import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, type User, type Role } from '../db/db';
import { insforge } from '../lib/insforge';

interface AuthContextType {
  user: User | null;
  role: Role;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUserId = localStorage.getItem('auth_user_id');
      if (storedUserId) {
        try {
          const { data: users, error } = await insforge
            .from('users')
            .select('*')
            .eq('id', Number(storedUserId))
            .limit(1);

          const foundUser = users && users.length > 0 ? users[0] : null;

          if (foundUser && foundUser.status === 'Active') {
            setUser(foundUser);
          } else {
            localStorage.removeItem('auth_user_id');
          }
        } catch (error) {
          console.error("Failed to load user:", error);
        }
      }
      setIsLoading(false);
    };
    
    loadUser();
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.id) {
      localStorage.setItem('auth_user_id', loggedInUser.id.toString());
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user_id');
  };

  // Default to Super Admin if no user is logged in for fallback, or use the actual user's role
  const role = user?.role || 'Super Admin';

  return (
    <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
