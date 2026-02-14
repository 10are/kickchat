"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  subscribeToDramaClub,
  subscribeToDramaEntries,
  voteDramaEntry,
  getMyEntryVotes,
  DramaClub,
  DramaEntry,
  DramaVote,
} from "@/app/lib/firestore";
import DramaEntryCard from "@/app/components/DramaEntryCard";
import DramaCreateEntryModal from "@/app/components/DramaCreateEntryModal";

type SortBy = "new" | "top";

interface KickChannelInfo {
  followersCount: number;
  isLive: boolean;
}

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { kickUser } = useAuth();
  const clubSlug = params.clubSlug as string;

  const [club, setClub] = useState<DramaClub | null>(null);
  const [entries, setEntries] = useState<DramaEntry[]>([]);
  const [myVotes, setMyVotes] = useState<Map<string, DramaVote>>(new Map());
  const [sortBy, setSortBy] = useState<SortBy>("new");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [kickInfo, setKickInfo] = useState<KickChannelInfo | null>(null);

  // Subscribe to club
  useEffect(() => {
    const unsub = subscribeToDramaClub(clubSlug, (c) => {
      setClub(c);
      setLoading(false);
    });
    return () => unsub();
  }, [clubSlug]);

  // Fetch Kick channel info (live status, followers)
  useEffect(() => {
    fetch(`/api/kick/channel?slug=${encodeURIComponent(clubSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channel) {
          setKickInfo({
            followersCount: data.channel.followersCount || 0,
            isLive: !!data.channel.isLive,
          });
        }
      })
      .catch(() => {});
  }, [clubSlug]);

  // Subscribe to entries
  useEffect(() => {
    const unsub = subscribeToDramaEntries(clubSlug, sortBy, setEntries);
    return () => unsub();
  }, [clubSlug, sortBy]);

  // Fetch my votes
  useEffect(() => {
    if (!kickUser?.uid || entries.length === 0) return;
    const ids = entries.map((e) => e.id);
    getMyEntryVotes(ids, kickUser.uid).then(setMyVotes);
  }, [entries, kickUser?.uid]);

  const handleVote = useCallback(
    async (entryId: string, voteType: "like" | "dislike") => {
      if (!kickUser?.uid) return;

      // Optimistic update
      setMyVotes((prev) => {
        const next = new Map(prev);
        const existing = next.get(entryId);
        if (existing?.voteType === voteType) {
          next.delete(entryId);
        } else {
          next.set(entryId, {
            userId: kickUser.uid,
            voteType,
            createdAt: null,
            updatedAt: null,
          });
        }
        return next;
      });

      try {
        await voteDramaEntry(entryId, kickUser.uid, voteType);
      } catch (err) {
        console.error("Vote error:", err);
      }
    },
    [kickUser?.uid]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 bg-red-400"
              style={{
                animation: `pixel-blink 1s step-end ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Kulup bulunamadi</p>
        <button
          onClick={() => router.push("/drama")}
          className="rounded-lg bg-kick/10 px-4 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-kick hover:bg-kick/20 transition-colors"
        >
          GERI DON
        </button>
      </div>
    );
  }

  const sortTabs: { key: SortBy; label: string }[] = [
    { key: "new", label: "YENI" },
    { key: "top", label: "EN COK BEGENILEN" },
  ];

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Hero Header */}
      <div className="shrink-0 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-kick/8 via-kick/3 to-transparent" />

        <div className="relative px-6 pt-4 pb-0">
          {/* Top bar: back button */}
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push("/drama")}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M13 4l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Profile section */}
          <div className="flex items-start gap-4 max-w-3xl mx-auto">
            {/* Avatar */}
            <div className="relative shrink-0">
              {club.streamerAvatar ? (
                <img
                  src={club.streamerAvatar}
                  alt=""
                  className="h-20 w-20 rounded-2xl border-2 border-border shadow-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-gradient-to-br from-kick/20 to-kick/5 shadow-lg">
                  <span className="font-[family-name:var(--font-pixel)] text-2xl text-kick">
                    {club.streamerName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              {kickInfo?.isLive && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 shadow-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[7px] font-bold text-white tracking-wide">CANLI</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-lg font-bold text-foreground truncate">
                {club.streamerName}
              </h1>

              {/* Stats row */}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                    <path d="M14 2H6a2 2 0 00-2 2v14l5-3 5 3V4a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{club.entryCount}</span> entry
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                    <path d="M16 17v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{club.memberCount}</span> uye
                  </span>
                </div>
                {kickInfo && (
                  <div className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{formatCount(kickInfo.followersCount)}</span> takipci
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Create entry button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl bg-kick px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover transition-colors active:scale-95 shrink-0 shadow-md shadow-kick/20"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 4v12M4 10h12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              ENTRY AT
            </button>
          </div>

          {/* Sort tabs */}
          <div className="flex max-w-3xl mx-auto mt-4">
            {sortTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setSortBy(t.key)}
                className={`px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[9px] transition-colors border-b-2 ${
                  sortBy === t.key
                    ? "text-kick border-kick"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom border */}
        <div className="border-b border-border" />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground opacity-40"
              >
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <p className="text-sm text-muted-foreground">
                Henuz entry yok. Ilk entry&apos;i at!
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-kick/10 px-4 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-kick hover:bg-kick/20 transition-colors"
              >
                ENTRY AT
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <DramaEntryCard
                key={entry.id}
                entry={entry}
                currentVote={myVotes.get(entry.id)?.voteType || null}
                onVote={handleVote}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Entry Modal */}
      {showCreate && (
        <DramaCreateEntryModal
          club={{
            slug: club.streamerSlug,
            name: club.streamerName,
            avatar: club.streamerAvatar,
          }}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
