"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import {
  getDramaClubs,
  subscribeToTrendingEntries,
  searchDramaClubs,
  voteDramaEntry,
  getMyEntryVotes,
  DramaClub,
  DramaEntry,
  DramaVote,
} from "@/app/lib/firestore";
import DramaClubCard from "@/app/components/DramaClubCard";
import DramaEntryCard from "@/app/components/DramaEntryCard";
import DramaCreateEntryModal from "@/app/components/DramaCreateEntryModal";

type Tab = "clubs" | "trending";

export default function DramaPage() {
  const { kickUser } = useAuth();
  const [tab, setTab] = useState<Tab>("clubs");
  const [clubs, setClubs] = useState<DramaClub[]>([]);
  const [trendingEntries, setTrendingEntries] = useState<DramaEntry[]>([]);
  const [myVotes, setMyVotes] = useState<Map<string, DramaVote>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DramaClub[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Load clubs
  useEffect(() => {
    setLoadingClubs(true);
    getDramaClubs()
      .then(setClubs)
      .finally(() => setLoadingClubs(false));
  }, []);

  // Subscribe to trending entries
  useEffect(() => {
    if (tab !== "trending") return;
    const unsub = subscribeToTrendingEntries(setTrendingEntries);
    return () => unsub();
  }, [tab]);

  // Fetch my votes for trending entries
  useEffect(() => {
    if (!kickUser?.uid || trendingEntries.length === 0) return;
    const ids = trendingEntries.map((e) => e.id);
    getMyEntryVotes(ids, kickUser.uid).then(setMyVotes);
  }, [trendingEntries, kickUser?.uid]);

  const handleSearch = async () => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await searchDramaClubs(term);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    }
    setSearching(false);
  };

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

  const displayClubs = searchResults !== null ? searchResults : clubs;

  const tabs: { key: Tab; label: string }[] = [
    { key: "clubs", label: "KULUPLER" },
    { key: "trending", label: "GUNDEM" },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 shrink-0">
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-pixel)] text-sm text-red-400">
            DRAMA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Yayincilar hakkinda tartis, entry at, oy ver
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-kick px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover transition-colors active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          ENTRY YARAT
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-6 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[9px] transition-colors border-b-2 ${
              tab === t.key
                ? "text-kick border-kick"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {/* CLUBS TAB */}
        {tab === "clubs" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Kulup ara..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="rounded-lg bg-surface border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
              >
                {searching ? "..." : "Ara"}
              </button>
            </div>

              {/* Club list */}
              {loadingClubs ? (
                <div className="flex items-center justify-center py-12">
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
              ) : displayClubs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-muted-foreground opacity-40"
                  >
                    <path
                      d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p className="text-sm text-muted-foreground text-center">
                    {searchResults !== null
                      ? "Sonuc bulunamadi"
                      : "Henuz kulup yok. Ilk entry'i atarak kulup olustur!"}
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="rounded-lg bg-kick/10 px-4 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-kick hover:bg-kick/20 transition-colors"
                  >
                    ILK ENTRY&apos;I AT
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {displayClubs.map((club) => (
                  <DramaClubCard key={club.id} club={club} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRENDING TAB */}
        {tab === "trending" && (
          <div className="max-w-3xl mx-auto space-y-3">
            {trendingEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-muted-foreground opacity-40"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-muted-foreground">
                  Henuz gundemde bir sey yok
                </p>
              </div>
            ) : (
              trendingEntries.map((entry) => (
                <DramaEntryCard
                  key={entry.id}
                  entry={entry}
                  showClubName
                  currentVote={myVotes.get(entry.id)?.voteType || null}
                  onVote={handleVote}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Entry Modal */}
      {showCreate && (
        <DramaCreateEntryModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            getDramaClubs().then(setClubs);
          }}
        />
      )}
    </div>
  );
}
