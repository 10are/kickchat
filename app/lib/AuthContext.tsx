"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, signInWithCustomToken, onAuthStateChanged, User, signOut } from "firebase/auth";
import { app } from "@/app/firebase";
import { updateOnlineStatus } from "@/app/lib/firestore";

interface KickUser {
  uid: string;
  username: string;
  avatar: string | null;
}

interface AuthContextType {
  user: User | null;
  kickUser: KickUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  kickUser: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [kickUser, setKickUser] = useState<KickUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const firebaseToken = getCookie("firebase_token");
    if (firebaseToken && !auth.currentUser) {
      signInWithCustomToken(auth, firebaseToken).catch(console.error);
    }

    const kickUserCookie = getCookie("kick_user");
    if (kickUserCookie) {
      try {
        setKickUser(JSON.parse(decodeURIComponent(kickUserCookie)));
      } catch {}
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Online status tracking - wait for both Firebase Auth AND kickUser
  useEffect(() => {
    if (!kickUser?.uid || !user) return;

    updateOnlineStatus(kickUser.uid, true);

    const handleBeforeUnload = () => {
      updateOnlineStatus(kickUser.uid, false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateOnlineStatus(kickUser.uid, false);
    };
  }, [kickUser?.uid, user]);

  const logout = async () => {
    if (kickUser?.uid) {
      await updateOnlineStatus(kickUser.uid, false);
    }
    const auth = getAuth(app);
    await signOut(auth);
    setKickUser(null);
    document.cookie = "firebase_token=; path=/; max-age=0";
    document.cookie = "kick_user=; path=/; max-age=0";
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, kickUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
