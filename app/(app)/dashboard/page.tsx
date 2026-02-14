"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { kickUser } = useAuth();

  const features = [
    {
      key: "chat",
      title: "Mesajlaş",
      description: "Kick kullanıcılarıyla anlık sohbet et, arkadaş ekle, engelle",
      href: "/chat",
      gradient: "from-kick/20 via-kick/5 to-transparent",
      iconBg: "bg-kick",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "lfg",
      title: "Oyun Arkadaşı Bul",
      description: "LFG ilanı oluştur, takım arkadaşı bul, birlikte oyna",
      href: "/lfg",
      gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
      iconBg: "bg-purple-500",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "watch",
      title: "Yayın İzle",
      description: "Kick, Twitch, YouTube yayınlarını izlerken sohbet et",
      href: "/watch",
      gradient: "from-red-500/20 via-red-500/5 to-transparent",
      iconBg: "bg-red-500",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 8.5l5 3.5-5 3.5v-7z" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "dedikodu",
      title: "Dedikodu",
      description: "Kick dünyasından en sıcak haberler ve dedikodular",
      href: "/dedikodu",
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      iconBg: "bg-amber-500",
      comingSoon: true,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v2m0 4h.01M5.07 19H19a2.18 2.18 0 001.85-3.36l-6.93-12a2.18 2.18 0 00-3.84 0l-6.93 12A2.18 2.18 0 005.07 19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "drama",
      title: "Drama",
      description: "Yayıncı dünyasının en güncel dramaları ve tartışmaları",
      href: "/drama",
      gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
      iconBg: "bg-rose-500",
      comingSoon: true,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          {kickUser?.avatar ? (
            <img src={kickUser.avatar} alt="" className="h-11 w-11 rounded-xl ring-2 ring-kick/20" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kick font-[family-name:var(--font-pixel)] text-sm text-black">
              {kickUser?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              Hoş geldin, <span className="text-kick">{kickUser?.username}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              kicksocially.com
            </p>
          </div>
          <img src="/logo.png" alt="" className="hidden sm:block h-9 w-9 opacity-60" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Section Title */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-kick/30 to-transparent" />
            <h2 className="font-[family-name:var(--font-pixel)] text-[10px] text-kick tracking-wider">OZELLIKLER</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-kick/30 to-transparent" />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <button
                key={feature.key}
                onClick={() => router.push(feature.href)}
                className="group relative flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-300 hover:border-kick/50 hover:shadow-xl hover:shadow-kick/10 hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Glow effect */}
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-kick/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10 flex w-full items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconBg} text-black shadow-lg group-hover:shadow-kick/20 transition-all duration-300 group-hover:scale-110`}>
                    {feature.icon}
                  </div>
                  {feature.comingSoon && (
                    <span className="font-[family-name:var(--font-pixel)] text-[7px] text-kick bg-kick/10 px-2 py-1 rounded-lg border border-kick/20">
                      YAKINDA
                    </span>
                  )}
                </div>

                <div className="relative z-10 space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-kick transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="relative z-10 flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-kick transition-all duration-300 group-hover:translate-x-1">
                  <span className="font-[family-name:var(--font-pixel)] text-[7px]">
                    {feature.comingSoon ? "DUYURU BEKLE" : "KESFET"}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Contact / Mail Section */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kick/10 text-kick">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M22 7l-10 7L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Bize Ulaşın</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                  İş birliği, fikir, öneri veya şikayet için bize mail atın
                </p>
              </div>
              <a
                href="mailto:developerx29846@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl bg-kick/10 px-4 py-2 text-xs font-medium text-kick transition-all hover:bg-kick hover:text-black hover:scale-105 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M22 7l-10 7L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                developerx29846@gmail.com
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 py-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-border" />
              <span className="font-[family-name:var(--font-pixel)] text-[7px] text-kick">KICKSOCIALLY</span>
              <div className="h-px w-8 bg-border" />
            </div>
            <a
              href="https://kicksocially.com"
              className="text-[10px] text-muted-foreground hover:text-kick transition-colors"
            >
              kicksocially.com
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
