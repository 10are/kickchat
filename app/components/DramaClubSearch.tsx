"use client";

import { useState } from "react";
import { searchDramaClubs, DramaClub } from "@/app/lib/firestore";

interface KickChannel {
  slug: string;
  username: string;
  avatar: string | null;
  followersCount: number;
  isLive: boolean;
}

interface DramaClubSearchProps {
  onSelect: (club: { slug: string; name: string; avatar: string | null }) => void;
  placeholder?: string;
}

export default function DramaClubSearch({
  onSelect,
  placeholder = "Yayinci adi yaz...",
}: DramaClubSearchProps) {
  const [query, setQuery] = useState("");
  const [kickChannel, setKickChannel] = useState<KickChannel | null>(null);
  const [existingClubs, setExistingClubs] = useState<DramaClub[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const term = query.trim();
    if (!term) return;

    setSearching(true);
    setSearched(true);
    setKickChannel(null);

    try {
      // Search existing clubs + Kick API in parallel
      const [foundClubs, kickRes] = await Promise.all([
        searchDramaClubs(term),
        fetch(`/api/kick/channel?slug=${encodeURIComponent(term)}`).then((r) =>
          r.json()
        ),
      ]);

      setExistingClubs(foundClubs);
      setKickChannel(kickRes.channel || null);
    } catch (err) {
      console.error("Search error:", err);
    }
    setSearching(false);
  };

  // Check if the Kick channel already has an existing club
  const existingClubSlugs = new Set(existingClubs.map((c) => c.streamerSlug));
  const showKickChannel =
    kickChannel && !existingClubSlugs.has(kickChannel.slug);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="rounded-lg bg-kick px-3 py-2 text-sm font-medium text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
        >
          {searching ? "..." : "Ara"}
        </button>
      </div>

      {/* Existing clubs */}
      {existingClubs.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground px-1">
            Mevcut kulupler
          </span>
          {existingClubs.map((club) => (
            <button
              key={club.id}
              onClick={() =>
                onSelect({
                  slug: club.streamerSlug,
                  name: club.streamerName,
                  avatar: club.streamerAvatar,
                })
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-surface-hover transition-colors"
            >
              {club.streamerAvatar ? (
                <img
                  src={club.streamerAvatar}
                  alt=""
                  className="h-8 w-8 rounded-lg shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-400 shrink-0">
                  {club.streamerName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground truncate block">
                  {club.streamerName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {club.memberCount} uye · {club.entryCount} entry
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Kick channel result (new club) */}
      {showKickChannel && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground px-1">
            Kick yayincisi
          </span>
          <button
            onClick={() =>
              onSelect({
                slug: kickChannel.slug,
                name: kickChannel.username,
                avatar: kickChannel.avatar,
              })
            }
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-kick/20 px-3 py-2 text-left hover:bg-kick/5 transition-colors"
          >
            {kickChannel.avatar ? (
              <img
                src={kickChannel.avatar}
                alt=""
                className="h-8 w-8 rounded-lg shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kick/10 text-xs font-bold text-kick shrink-0">
                {kickChannel.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground truncate">
                  {kickChannel.username}
                </span>
                {kickChannel.isLive && (
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                    CANLI
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {kickChannel.followersCount.toLocaleString("tr-TR")} takipci · Yeni kulup olustur
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              className="text-kick shrink-0"
            >
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* No results */}
      {searched &&
        !searching &&
        existingClubs.length === 0 &&
        !kickChannel && (
          <p className="text-center text-[10px] text-muted-foreground py-2">
            Yayinci bulunamadi
          </p>
        )}
    </div>
  );
}
