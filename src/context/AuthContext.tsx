import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { db, type User, type Role } from "../db/db";
import { supabase } from "../supabase";

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
    let mounted = true;

    const loadUser = async (session: any) => {
      if (session?.user?.email) {
        try {
          const foundUser = await db.users
            .where("email")
            .equalsIgnoreCase(session.user.email)
            .first();
            
          if (foundUser && foundUser.status === "Active" && mounted) {
            setUser(foundUser);
            if (foundUser.id) {
              localStorage.setItem("auth_user_id", foundUser.id.toString());
            }
          } else if (mounted) {
            setUser(null);
            localStorage.removeItem("auth_user_id");
          }
        } catch (error) {
          console.error("Failed to load user:", error);
          if (mounted) {
            setUser(null);
            localStorage.removeItem("auth_user_id");
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          localStorage.removeItem("auth_user_id");
        }
      }
      if (mounted) setIsLoading(false);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.id) {
      localStorage.setItem("auth_user_id", loggedInUser.id.toString());
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("auth_user_id");
  };

  // Default to Super Admin if no user is logged in for fallback, or use the actual user's role
  const role = user?.role || "Super Admin";

  return (
    <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
