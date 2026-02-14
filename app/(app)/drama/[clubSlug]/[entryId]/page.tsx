"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  subscribeToDramaEntry,
  subscribeToDramaComments,
  voteDramaEntry,
  voteDramaComment,
  getMyEntryVotes,
  getMyCommentVotes,
  deleteDramaEntry,
  reportDramaContent,
  getOrCreateConversation,
  DramaEntry,
  DramaComment,
  DramaVote,
} from "@/app/lib/firestore";
import DramaVoteButtons from "@/app/components/DramaVoteButtons";
import DramaCommentItem from "@/app/components/DramaCommentItem";
import DramaCommentInput from "@/app/components/DramaCommentInput";

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { kickUser } = useAuth();
  const clubSlug = params.clubSlug as string;
  const entryId = params.entryId as string;

  const [entry, setEntry] = useState<DramaEntry | null>(null);
  const [comments, setComments] = useState<DramaComment[]>([]);
  const [myEntryVote, setMyEntryVote] = useState<DramaVote | null>(null);
  const [myCommentVotes, setMyCommentVotes] = useState<
    Map<string, DramaVote>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Subscribe to entry
  useEffect(() => {
    const unsub = subscribeToDramaEntry(entryId, (e) => {
      setEntry(e);
      setLoading(false);
    });
    return () => unsub();
  }, [entryId]);

  // Subscribe to comments
  useEffect(() => {
    const unsub = subscribeToDramaComments(entryId, setComments);
    return () => unsub();
  }, [entryId]);

  // Fetch my entry vote
  useEffect(() => {
    if (!kickUser?.uid) return;
    getMyEntryVotes([entryId], kickUser.uid).then((votes) => {
      setMyEntryVote(votes.get(entryId) || null);
    });
  }, [entryId, kickUser?.uid]);

  // Fetch my comment votes
  useEffect(() => {
    if (!kickUser?.uid || comments.length === 0) return;
    const ids = comments.map((c) => c.id);
    getMyCommentVotes(ids, kickUser.uid).then(setMyCommentVotes);
  }, [comments, kickUser?.uid]);

  const handleEntryVote = useCallback(
    async (voteType: "like" | "dislike") => {
      if (!kickUser?.uid) return;

      // Optimistic update
      setMyEntryVote((prev) => {
        if (prev?.voteType === voteType) return null;
        return { userId: kickUser.uid, voteType, createdAt: null, updatedAt: null };
      });

      try {
        await voteDramaEntry(entryId, kickUser.uid, voteType);
      } catch (err) {
        console.error("Vote error:", err);
      }
    },
    [entryId, kickUser?.uid]
  );

  const handleCommentVote = useCallback(
    async (commentId: string, voteType: "like" | "dislike") => {
      if (!kickUser?.uid) return;

      // Optimistic update
      setMyCommentVotes((prev) => {
        const next = new Map(prev);
        const existing = next.get(commentId);
        if (existing?.voteType === voteType) {
          next.delete(commentId);
        } else {
          next.set(commentId, {
            userId: kickUser.uid,
            voteType,
            createdAt: null,
            updatedAt: null,
          });
        }
        return next;
      });

      try {
        await voteDramaComment(commentId, kickUser.uid, voteType);
      } catch (err) {
        console.error("Comment vote error:", err);
      }
    },
    [kickUser?.uid]
  );

  const handleDeleteEntry = async () => {
    if (!entry) return;
    try {
      await deleteDramaEntry(entry.id, entry.clubId);
      router.push(`/drama/${clubSlug}`);
    } catch (err) {
      console.error("Delete entry error:", err);
    }
  };

  const handleReport = async () => {
    if (!kickUser || !entry || !reportReason.trim()) return;
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

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Entry bulunamadi</p>
        <button
          onClick={() => router.push(`/drama/${clubSlug}`)}
          className="rounded-lg bg-kick/10 px-4 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-kick hover:bg-kick/20 transition-colors"
        >
          GERI DON
        </button>
      </div>
    );
  }

  const isAuthor = kickUser?.uid === entry.authorId;
  const timeAgo = entry.createdAt
    ? formatRelativeTime(entry.createdAt.toDate())
    : "";

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3 shrink-0">
        <button
          onClick={() => router.push(`/drama/${clubSlug}`)}
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
        <span className="font-[family-name:var(--font-pixel)] text-[9px] text-red-400">
          {entry.clubName}
        </span>
      </div>

      {/* Entry content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Author info */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                if (!kickUser || kickUser.uid === entry.authorId) return;
                getOrCreateConversation(
                  kickUser.uid,
                  entry.authorId,
                  { [kickUser.uid]: kickUser.username, [entry.authorId]: entry.authorUsername },
                  { [kickUser.uid]: kickUser.avatar || null, [entry.authorId]: entry.authorAvatar }
                ).then((convId) => router.push(`/chat/${convId}`));
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {entry.authorAvatar ? (
                <img
                  src={entry.authorAvatar}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                  {entry.authorUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <span className="text-sm font-medium text-foreground hover:text-kick transition-colors">
                  {entry.authorUsername}
                </span>
                <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
              </div>
            </button>
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-foreground mb-2">
            {entry.title}
          </h1>

          {/* Body */}
          {entry.body && (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words mb-4 leading-relaxed">
              {entry.body}
            </p>
          )}

          {/* Vote + actions bar */}
          <div className="flex items-center gap-3 border-t border-b border-border py-3 mb-6">
            <DramaVoteButtons
              likeCount={entry.likeCount}
              dislikeCount={entry.dislikeCount}
              currentVote={myEntryVote?.voteType || null}
              onVote={handleEntryVote}
            />

            <div className="flex items-center gap-1 text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-3-.52L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-xs font-medium">
                {entry.commentCount} yorum
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {isAuthor ? (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Silinsin mi?
                      </span>
                      <button
                        onClick={handleDeleteEntry}
                        className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                      >
                        Evet
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
                      >
                        Hayir
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      Sil
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
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
              )}
            </div>
          </div>

          {/* Comment input */}
          <div className="mb-6">
            <DramaCommentInput
              entryId={entry.id}
              clubId={entry.clubId}
              placeholder="Yorum yaz..."
            />
          </div>

          {/* Comments */}
          <div className="space-y-1">
            {comments.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                Henuz yorum yok. Ilk yorumu yaz!
              </p>
            ) : (
              comments.map((comment) => (
                <DramaCommentItem
                  key={comment.id}
                  comment={comment}
                  currentVote={
                    myCommentVotes.get(comment.id)?.voteType || null
                  }
                  onVote={handleCommentVote}
                />
              ))
            )}
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
    </div>
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
