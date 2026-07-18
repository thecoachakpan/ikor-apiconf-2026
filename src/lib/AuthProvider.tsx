import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit, listen } from '@tauri-apps/api/event';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const windowLabel = getCurrentWindow().label;
  const isDashboard = windowLabel === 'dashboard';

  useEffect(() => {
    if (isDashboard) {
      let resolved = false;

      // Safety timeout of 3.5 seconds. If Supabase getSession takes longer,
      // we bypass the loading state to allow the app to run.
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          console.warn("Auth initialization timed out in dashboard. Proceeding...");
          setIsLoading(false);
        }
      }, 3500);

      // Get initial session
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          resolved = true;
          clearTimeout(timeoutId);
          setSession(session);
          setUser(session?.user || null);
          setIsLoading(false);

          // Update local storage for other windows
          if (session) {
            localStorage.setItem("sayikor_session", JSON.stringify(session));
            localStorage.setItem("sayikor_user", JSON.stringify(session.user));
            localStorage.setItem("sayikor_has_session", "true");
          } else {
            localStorage.removeItem("sayikor_session");
            localStorage.removeItem("sayikor_user");
            localStorage.setItem("sayikor_has_session", "false");
          }
          emit("sayikor-session-changed", { session });
        })
        .catch((err) => {
          console.error("Error getting session in dashboard:", err);
          resolved = true;
          clearTimeout(timeoutId);
          setIsLoading(false);
        });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);

        if (session) {
          localStorage.setItem("sayikor_session", JSON.stringify(session));
          localStorage.setItem("sayikor_user", JSON.stringify(session.user));
          localStorage.setItem("sayikor_has_session", "true");
        } else {
          localStorage.removeItem("sayikor_session");
          localStorage.removeItem("sayikor_user");
          localStorage.setItem("sayikor_has_session", "false");
        }
        emit("sayikor-session-changed", { session });
      });

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    } else {
      // Non-dashboard windows: load synchronously from localStorage to bypass locks
      try {
        const cachedSessionStr = localStorage.getItem("sayikor_session");
        const cachedUserStr = localStorage.getItem("sayikor_user");
        const cachedSession = cachedSessionStr ? JSON.parse(cachedSessionStr) : null;
        const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;

        setSession(cachedSession);
        setUser(cachedUser);
      } catch (e) {
        console.warn("Failed to parse cached auth session:", e);
      }
      setIsLoading(false);

      // Listen for updates from dashboard window
      let unlistenSessionChanged: (() => void) | undefined;
      const setupListener = async () => {
        unlistenSessionChanged = await listen<any>("sayikor-session-changed", (event) => {
          const payload = event.payload;
          const sessionVal = payload?.session || null;
          setSession(sessionVal);
          setUser(sessionVal?.user || null);
        });
      };
      setupListener();

      return () => {
        if (unlistenSessionChanged) unlistenSessionChanged();
      };
    }
  }, [isDashboard]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

