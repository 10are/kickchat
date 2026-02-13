"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { useTheme } from "@/app/lib/ThemeContext";

const navItems = [
  {
    key: "dashboard",
    label: "Ana Sayfa",
    href: "/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "chat",
    label: "Chat",
    href: "/chat",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "lfg",
    label: "LFG",
    href: "/lfg",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "dedikodu",
    label: "Dedikodu",
    href: "/dedikodu",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v2m0 4h.01M5.07 19H19a2.18 2.18 0 001.85-3.36l-6.93-12a2.18 2.18 0 00-3.84 0l-6.93 12A2.18 2.18 0 005.07 19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "drama",
    label: "Drama",
    href: "/drama",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { kickUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getActiveKey = () => {
    if (pathname.startsWith("/lfg")) return "lfg";
    if (pathname.startsWith("/dedikodu")) return "dedikodu";
    if (pathname.startsWith("/drama")) return "drama";
    if (pathname.startsWith("/chat")) return "chat";
    if (pathname === "/dashboard") return "dashboard";
    return "dashboard";
  };

  const activeKey = getActiveKey();

  return (
    <div className="flex h-full w-[72px] flex-col items-center border-r border-border bg-background py-3">
      {/* Logo */}
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 flex h-10 w-10 items-center justify-center hover:opacity-80 transition-opacity"
      >
        <span className="font-[family-name:var(--font-pixel)] text-[8px] text-kick leading-tight text-center">
          KICK<br />CHAT
        </span>
      </button>

      <div className="w-8 h-px bg-border mb-3" />

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
              activeKey === item.key
                ? "bg-kick text-black"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
            title={item.label}
          >
            {item.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-surface-hover px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom section - Profile */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Tema değiştir"
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" fill="currentColor" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="w-8 h-px bg-border" />

        {/* User profile */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => router.push("/dashboard")}
            className="group relative flex h-10 w-10 items-center justify-center"
            title={kickUser?.username || "Profil"}
          >
            {kickUser?.avatar ? (
              <img src={kickUser.avatar} alt="" className="h-9 w-9 rounded-xl ring-2 ring-border group-hover:ring-kick transition-all" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kick font-[family-name:var(--font-pixel)] text-[10px] text-black ring-2 ring-border group-hover:ring-kick transition-all">
                {kickUser?.username?.[0]?.toUpperCase()}
              </div>
            )}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-surface-hover px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
              {kickUser?.username}
            </span>
          </button>

          {/* Username */}
          <span className="text-[9px] font-medium text-muted-foreground truncate w-full text-center px-1">
            {kickUser?.username}
          </span>

          {/* Logout */}
          <button
            onClick={logout}
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Çıkış Yap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-surface-hover px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
              Çıkış Yap
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
