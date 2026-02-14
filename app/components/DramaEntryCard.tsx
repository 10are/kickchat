"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { DramaEntry, reportDramaContent, getOrCreateConversation } from "@/app/lib/firestore";
import DramaVoteButtons from "./DramaVoteButtons";

interface DramaEntryCardProps {
  entry: DramaEntry;
  showClubName?: boolean;
  currentVote: "like" | "dislike" | null;
  onVote: (entryId: string, voteType: "like" | "dislike") => void;
}

export default function DramaEntryCard({
  entry,
  showClubName = false,
  currentVote,
  onVote,
}: DramaEntryCardProps) {
  const router = useRouter();
  const { kickUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const timeAgo = entry.createdAt
    ? formatRelativeTime(entry.createdAt.toDate())
    : "";

  const handleReport = async () => {
    if (!kickUser || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await reportDramaContent(
        { uid: kickUser.uid, username: kickUser.username },
        { type: "entry", id: entry.id, entryId: entry.id, clubId: entry.clubId },
        reportReason.trim()
      );
      setReportSent(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSent(false);
        setReportReason("");
      }, 1500);
    } catch (err) {
      console.error("Report error:", err);
    }
    setSubmittingReport(false);
  };

  return (
    <>
      <div
        onClick={() => router.push(`/drama/${entry.clubId}/${entry.id}`)}
        className="group cursor-pointer rounded-xl border border-border bg-surface p-4 transition-all hover:border-kick/30 hover:bg-surface-hover active:scale-[0.99]"
      >
        {/* Header: author info + club name */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!kickUser || kickUser.uid === entry.authorId) return;
              getOrCreateConversation(
                kickUser.uid,
                entry.authorId,
                { [kickUser.uid]: kickUser.username, [entry.authorId]: entry.authorUsername },
                { [kickUser.uid]: kickUser.avatar || null, [entry.authorId]: entry.authorAvatar }
              ).then((convId) => router.push(`/chat/${convId}`));
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          >
            {entry.authorAvatar ? (
              <img
                src={entry.authorAvatar}
                alt=""
                className="h-6 w-6 rounded-full shrink-0"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-foreground shrink-0">
                {entry.authorUsername[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-foreground truncate hover:text-kick transition-colors">
              {entry.authorUsername}
            </span>
          </button>
          {showClubName && (
            <>
              <span className="text-[10px] text-muted-foreground">&rarr;</span>
              <span className="text-[10px] text-kick font-medium truncate">
                {entry.clubName}
              </span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {timeAgo}
          </span>

          {/* More menu */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-7 z-10 w-36 rounded-lg border border-border bg-background shadow-lg py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-surface-hover transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M4 22v-7" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Sikayet Et
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
          {entry.title}
        </h3>

        {/* Body preview */}
        {entry.body && (
          <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
            {entry.body}
          </p>
        )}

        {/* Footer: votes + comments */}
        <div className="flex items-center gap-3">
          <DramaVoteButtons
            likeCount={entry.likeCount}
            dislikeCount={entry.dislikeCount}
            currentVote={currentVote}
            onVote={(voteType) => onVote(entry.id, voteType)}
            size="sm"
          />

          {/* Comment count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-3-.52L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-[10px] font-medium">{entry.commentCount}</span>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => {
            setShowReportModal(false);
            setReportReason("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl"
          >
            {reportSent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-kick">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-foreground">Sikayet gonderildi</p>
              </div>
            ) : (
              <>
                <h3 className="font-[family-name:var(--font-pixel)] text-xs text-red-400 mb-3">
                  SIKAYET ET
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Bu entry&apos;i neden sikayet ediyorsun?
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value.slice(0, 500))}
                  placeholder="Sebebi yaz..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick mb-3"
                  autoFocus
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportReason("");
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
                  >
                    Iptal
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={submittingReport || !reportReason.trim()}
                    className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {submittingReport ? "..." : "Gonder"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
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
