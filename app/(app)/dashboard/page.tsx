"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";

const sections = [
  {
    key: "chat",
    title: "Chat",
    description: "Kick kullanıcılarıyla özel mesajlaş",
    href: "/chat",
    color: "kick",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    pixelArt: [
      0,1,1,1,1,1,0,
      1,0,0,0,0,0,1,
      1,0,1,0,1,0,1,
      1,0,0,0,0,0,1,
      1,0,1,1,1,0,1,
      0,1,1,1,1,1,0,
      0,0,0,0,1,0,0,
    ],
    available: true,
  },
  {
    key: "lfg",
    title: "Oyun Arkadaşı Bul",
    description: "Birlikte oynayacak arkadaş bul",
    href: "/lfg",
    color: "kick",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    pixelArt: [
      0,0,1,0,1,0,0,
      0,1,1,0,1,1,0,
      0,0,1,0,1,0,0,
      0,1,1,1,1,1,0,
      1,0,0,1,0,0,1,
      0,0,0,1,0,0,0,
      0,0,1,0,1,0,0,
    ],
    available: true,
  },
  {
    key: "dedikodu",
    title: "Dedikodu",
    description: "Kick dünyasından haberler ve dedikodular",
    href: "/dedikodu",
    color: "kick",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v2m0 4h.01M5.07 19H19a2.18 2.18 0 001.85-3.36l-6.93-12a2.18 2.18 0 00-3.84 0l-6.93 12A2.18 2.18 0 005.07 19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    pixelArt: [
      0,0,0,1,0,0,0,
      0,0,1,1,1,0,0,
      0,1,1,0,1,1,0,
      0,1,0,1,0,1,0,
      1,1,0,1,0,1,1,
      1,0,0,0,0,0,1,
      1,1,0,1,0,1,1,
    ],
    available: false,
  },
  {
    key: "drama",
    title: "Drama",
    description: "Kick platformundaki dramalar ve tartışmalar",
    href: "/drama",
    color: "red-500",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    pixelArt: [
      0,1,1,1,1,1,0,
      0,1,0,0,0,1,0,
      0,1,0,1,0,1,0,
      0,1,0,0,0,1,0,
      0,1,1,1,1,1,0,
      0,1,0,0,0,0,0,
      0,1,0,0,0,0,0,
    ],
    available: false,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { kickUser } = useAuth();

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border px-6 py-6">
        <div className="flex items-center gap-3">
          {kickUser?.avatar ? (
            <img src={kickUser.avatar} alt="" className="h-10 w-10 rounded-xl" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kick font-[family-name:var(--font-pixel)] text-sm text-black">
              {kickUser?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Hoş geldin, <span className="text-kick">{kickUser?.username}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Ne yapmak istersin?
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => router.push(section.href)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 text-left transition-all hover:border-kick hover:shadow-lg hover:shadow-kick/5 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Pixel art background */}
              <div className="absolute top-3 right-3 grid grid-cols-7 gap-[2px] opacity-10 group-hover:opacity-20 transition-opacity">
                {section.pixelArt.map((on, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 ${on ? "bg-kick" : "bg-transparent"}`}
                  />
                ))}
              </div>

              {/* Icon */}
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                section.available
                  ? "bg-kick/10 text-kick"
                  : "bg-surface-hover text-muted-foreground"
              }`}>
                {section.icon}
              </div>

              {/* Content */}
              <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                {section.title}
                {!section.available && (
                  <span className="font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground bg-surface-hover px-2 py-0.5 rounded">
                    YAKINDA
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>

              {/* Arrow */}
              <div className="mt-4 flex items-center gap-1 text-kick opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-[family-name:var(--font-pixel)] text-[9px]">
                  {section.available ? "GİT" : "YAKINDA"}
                </span>
                {section.available && (
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12M12 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer decoration */}
        <div className="flex items-center justify-center gap-2 mt-8 mb-4">
          <div className="h-px w-12 bg-border" />
          <div className="flex gap-1">
            {[30, 50, 70, 100, 70, 50, 30].map((op, i) => (
              <div key={i} className="h-1 w-1 bg-kick" style={{ opacity: op / 100 }} />
            ))}
          </div>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>
    </div>
  );
}
