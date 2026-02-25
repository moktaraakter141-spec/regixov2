"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user) {
        checkAndHandleStatus(session.user.id);

        const currentPath = window.location.pathname;
        if (currentPath === "/auth") {
          router.push("/dashboard");
        }
      }

      // ❌ SIGNED_OUT এখানে নেই
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkAndHandleStatus(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAndHandleStatus = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleData) return;

      const { data } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", userId)
        .single();

      if (!data) return;

      if (data.status === "banned") {
        alert("Your account has been permanently banned.");
        await supabase.auth.signOut();
        router.push("/auth"); // banned হলে directly push
        return;
      }
    } catch {
      // silent fail
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth"); // ✅ directly push, event এর উপর depend না করে
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-16 border-b bg-background px-6 flex items-center">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </header>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
