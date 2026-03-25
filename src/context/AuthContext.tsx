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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Auth session error:", error);
        // Clear the bad session state
        supabase.auth.signOut().catch(console.error);
        loadUser(null);
      } else {
        loadUser(session);
      }
    }).catch(error => {
      console.error("Failed to get session:", error);
      supabase.auth.signOut().catch(console.error);
      loadUser(null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        loadUser(null);
      } else {
        loadUser(session);
      }
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

  // Default to Cashier (least privilege) if no user is logged in for fallback
  const role = user?.role || "Cashier";

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
