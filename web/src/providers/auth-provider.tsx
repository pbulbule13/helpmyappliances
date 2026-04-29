"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { DEV_MODE, devGetEmail } from "@/lib/dev-auth";
import { apiVerifyToken } from "@/lib/api/client";
import type { UserResponse } from "@/lib/api/types";

// In dev mode, firebase is not initialised — import lazily
let firebaseAuth: import("firebase/auth").Auth | null = null;
if (!DEV_MODE) {
  import("@/lib/firebase").then((m) => { firebaseAuth = m.getFirebaseAuth(); });
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: UserResponse | null;
  devEmail: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  devEmail: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<UserResponse | null>(null);
  const [devEmail, setDevEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_MODE) {
      // Dev mode: check localStorage for saved email
      const email = devGetEmail();
      if (email) {
        setDevEmail(email);
        apiVerifyToken()
          .then(setAppUser)
          .catch(() => setAppUser(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    // Firebase mode — 5s safety timeout so the spinner never hangs indefinitely
    // if Firebase fails to initialize (e.g. missing env vars in production)
    const timeout = setTimeout(() => setLoading(false), 5000);

    import("@/lib/firebase")
      .then(({ getFirebaseAuth }) => {
        const unsub = onAuthStateChanged(
          getFirebaseAuth(),
          async (user) => {
            clearTimeout(timeout);
            setFirebaseUser(user);
            if (user) {
              // Retry up to 3× with backoff — first page-load request can race
              // a stale CORS preflight cache entry from before a backend redeploy.
              let profile = null;
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  profile = await apiVerifyToken();
                  break;
                } catch {
                  if (attempt < 2) {
                    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
                  }
                }
              }
              setAppUser(profile);
            } else {
              setAppUser(null);
            }
            setLoading(false);
          },
          () => {
            clearTimeout(timeout);
            setLoading(false);
          },
        );
        return () => unsub();
      })
      .catch(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, devEmail, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
