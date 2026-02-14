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

  // Subscribe to club
  useEffect(() => {
    const unsub = subscribeToDramaClub(clubSlug, (c) => {
      setClub(c);
      setLoading(false);
    });
    return () => unsub();
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

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          {/* Back */}
          <button
            onClick={() => router.push("/drama")}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors shrink-0"
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

          {/* Club info */}
          {club.streamerAvatar ? (
            <img
              src={club.streamerAvatar}
              alt=""
              className="h-10 w-10 rounded-xl shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 font-[family-name:var(--font-pixel)] text-sm text-red-400 shrink-0">
              {club.streamerName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {club.streamerName}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {club.memberCount} uye · {club.entryCount} entry
            </p>
          </div>

          {/* Create entry */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-kick px-3 py-2 font-[family-name:var(--font-pixel)] text-[8px] text-black hover:bg-kick-hover transition-colors active:scale-95 shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
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
      </div>

      {/* Sort tabs */}
      <div className="flex border-b border-border px-6 shrink-0">
        <div className="max-w-3xl mx-auto flex w-full">
          {sortTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              className={`px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[8px] transition-colors border-b-2 ${
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
