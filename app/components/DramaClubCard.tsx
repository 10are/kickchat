"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DramaClub } from "@/app/lib/firestore";

interface DramaClubCardProps {
  club: DramaClub;
}

export default function DramaClubCard({ club }: DramaClubCardProps) {
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);

  const timeAgo = club.lastEntryAt
    ? formatRelativeTime(club.lastEntryAt.toDate())
    : "";

  useEffect(() => {
    fetch(`/api/kick/channel?slug=${encodeURIComponent(club.streamerSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channel?.isLive) setIsLive(true);
      })
      .catch(() => {});
  }, [club.streamerSlug]);

  return (
    <button
      onClick={() => router.push(`/drama/${club.streamerSlug}`)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-kick hover:shadow-lg hover:shadow-kick/5"
    >
      {/* Avatar area */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-hover">
        {club.streamerAvatar ? (
          <img
            src={club.streamerAvatar}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
            <span className="font-[family-name:var(--font-pixel)] text-3xl text-red-400">
              {club.streamerName[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Live badge */}
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-red-500 px-1.5 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[8px] font-bold text-white">CANLI</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="font-[family-name:var(--font-pixel)] text-[9px] text-kick">
            GORUNTULE
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium text-kick truncate">
          {club.streamerName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {club.memberCount} uye
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            {club.entryCount} entry
          </span>
          {timeAgo && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
