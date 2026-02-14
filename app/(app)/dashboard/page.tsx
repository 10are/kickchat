"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { kickUser } = useAuth();

  const features = [
    {
      key: "chat",
      title: "Mesajlas",
      description: "Anlik sohbet, arkadas ekle",
      href: "/chat",
      gradient: "from-blue-500/20 to-blue-600/5",
      iconBg: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
      borderHover: "hover:border-blue-500/40",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "lfg",
      title: "Arkadas Bul",
      description: "LFG ilani olustur, takim bul",
      href: "/lfg",
      gradient: "from-kick/20 to-kick/5",
      iconBg: "bg-kick/15 text-kick group-hover:bg-kick group-hover:text-black",
      borderHover: "hover:border-kick/40",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "watch",
      title: "Yayin Izle",
      description: "Yayin izlerken sohbet et",
      href: "/watch",
      gradient: "from-purple-500/20 to-purple-600/5",
      iconBg: "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
      borderHover: "hover:border-purple-500/40",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 8.5l5 3.5-5 3.5v-7z" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "drama",
      title: "Kulup",
      description: "Yayincilar hakkinda tartis, entry at",
      href: "/drama",
      gradient: "from-red-500/20 to-red-600/5",
      iconBg: "bg-red-500/15 text-red-400 group-hover:bg-red-500 group-hover:text-white",
      borderHover: "hover:border-red-500/40",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Hero Header */}
      <div className="relative shrink-0 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-kick/10 via-kick/3 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-kick/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                {kickUser?.avatar ? (
                  <img
                    src={kickUser.avatar}
                    alt=""
                    className="h-16 w-16 rounded-2xl border-2 border-kick/30 shadow-lg shadow-kick/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-kick/30 bg-gradient-to-br from-kick/20 to-kick/5 shadow-lg shadow-kick/10">
                    <span className="font-[family-name:var(--font-pixel)] text-xl text-kick">
                      {kickUser?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background bg-kick" />
              </div>

              {/* Welcome text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Hos geldin</p>
                <h1 className="text-xl font-bold text-foreground truncate">
                  {kickUser?.username}
                </h1>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-[family-name:var(--font-pixel)] tracking-wider">
                  KICKSOCIALLY.COM
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <button
                key={feature.key}
                onClick={() => router.push(feature.href)}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:bg-surface-hover active:scale-[0.98] hover:shadow-lg ${feature.borderHover}`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className="relative">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${feature.iconBg}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mt-3">
                    {feature.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-1">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                    <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Contact card */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kick/10 text-kick">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M22 7l-10 7L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Is birligi, fikir, oneri veya sikayet icin</p>
                <a
                  href="mailto:developerx29846@gmail.com"
                  className="text-xs text-kick hover:underline"
                >
                  developerx29846@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-2 pb-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-border" />
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground tracking-widest">
              KICKSOCIALLY
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-border" />
          </div>

        </div>
      </div>
    </div>
  );
}
