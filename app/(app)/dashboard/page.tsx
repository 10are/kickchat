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
      description: "Anlık sohbet, arkadaş ekle",
      href: "/chat",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "lfg",
      title: "Oyun Arkadaşı Bul",
      description: "LFG ilanı oluştur, takım bul",
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
      key: "watch",
      title: "Yayın İzle",
      description: "Yayın izlerken sohbet et",
      href: "/watch",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 8.5l5 3.5-5 3.5v-7z" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "drama",
      title: "Drama",
      description: "Güncel dramalar ve tartışmalar",
      href: "/drama",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
            <img src={kickUser.avatar} alt="" className="h-10 w-10 rounded-xl" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kick font-[family-name:var(--font-pixel)] text-sm text-black">
              {kickUser?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">
              Hoş geldin, <span className="text-kick">{kickUser?.username}</span>
            </h1>
            <p className="text-xs text-muted-foreground">kicksocially.com</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Feature Cards - 2x2 grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((feature) => (
              <button
                key={feature.key}
                onClick={() => router.push(feature.href)}
                className="group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition-all hover:border-kick/30 hover:bg-surface-hover active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kick/10 text-kick transition-colors group-hover:bg-kick group-hover:text-black">
                  {feature.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{feature.title}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{feature.description}</span>
              </button>
            ))}
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border bg-surface px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kick/10 text-kick">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M22 7l-10 7L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">İş birliği, fikir, öneri veya şikayet için</p>
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
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="h-px w-6 bg-border" />
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground">KICKSOCIALLY</span>
            <div className="h-px w-6 bg-border" />
          </div>

        </div>
      </div>
    </div>
  );
}
