"use client";

import { useAuth } from "@/app/lib/AuthContext";
import { useTheme } from "@/app/lib/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 bg-kick"
                style={{ animation: `pixel-blink 1s step-end ${i * 0.3}s infinite` }}
              />
            ))}
          </div>
          <p className="font-[family-name:var(--font-pixel)] text-xs text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 rounded-lg border border-border bg-surface p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        {theme === "dark" ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="4" fill="currentColor" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" fill="currentColor" />
          </svg>
        )}
      </button>

      <div className="flex flex-col items-center gap-10">
        {/* Pixel Art Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-5 gap-0.5">
            {[
              1,0,1,0,1,
              1,1,0,1,1,
              0,1,1,1,0,
              1,1,0,1,1,
              1,0,1,0,1,
            ].map((on, i) => (
              <div
                key={i}
                className={`h-3 w-3 transition-all ${on ? "bg-kick" : "bg-transparent"}`}
              />
            ))}
          </div>
          <h1 className="font-[family-name:var(--font-pixel)] text-2xl text-kick">
            KICKCHAT
          </h1>
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Kick.com hesabınla giriş yap, diğer Kick kullanıcılarıyla özel mesajlaş.
          </p>
        </div>

        {/* Login Button */}
        <a
          href="/api/auth/kick"
          className="pixel-corner relative flex items-center gap-3 bg-kick px-8 py-4 font-[family-name:var(--font-pixel)] text-sm text-black transition-all hover:bg-kick-hover hover:scale-105 active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4h4v4H4V4zm0 12h4v4H4v-4zm4-4h4v4H8v-4zm4-4h4v4h-4V8zm4 4h4v4h-4v-4zm0-8h4v4h-4V4zm0 12h4v4h-4v-4z"
              fill="currentColor"
            />
          </svg>
          KICK İLE GİRİŞ YAP
        </a>

        {/* Pixel art decoration */}
        <div className="flex items-center gap-2">
          <div className="h-px w-12 bg-border" />
          <div className="flex gap-1">
            {[30, 50, 70, 100, 70, 50, 30].map((op, i) => (
              <div key={i} className="h-1.5 w-1.5 bg-kick" style={{ opacity: op / 100 }} />
            ))}
          </div>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>
    </div>
  );
}
