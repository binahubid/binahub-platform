"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
