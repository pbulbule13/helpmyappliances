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

    // Firebase mode
    import("@/lib/firebase").then(({ getFirebaseAuth }) => {
      const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
        setFirebaseUser(user);
        if (user) {
          try {
            const profile = await apiVerifyToken();
            setAppUser(profile);
          } catch {
            setAppUser(null);
          }
        } else {
          setAppUser(null);
        }
        setLoading(false);
      });
      return () => unsub();
    });
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, devEmail, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
