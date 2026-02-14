"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  loadDramaReplies,
  deleteDramaComment,
  reportDramaContent,
  getOrCreateConversation,
  getMyCommentVotes,
  voteDramaComment,
  DramaComment,
  DramaVote,
} from "@/app/lib/firestore";
import DramaVoteButtons from "./DramaVoteButtons";
import DramaCommentInput from "./DramaCommentInput";

interface DramaCommentItemProps {
  comment: DramaComment;
  currentVote?: "like" | "dislike" | null;
  onVote?: (commentId: string, voteType: "like" | "dislike") => void;
}

export default function DramaCommentItem({
  comment,
  currentVote: externalVote,
  onVote: externalOnVote,
}: DramaCommentItemProps) {
  const router = useRouter();
  const { kickUser } = useAuth();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replies, setReplies] = useState<DramaComment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selfVote, setSelfVote] = useState<DramaVote | null>(null);
  const [selfVoteLoaded, setSelfVoteLoaded] = useState(false);

  // Self-manage vote state: fetch own vote on mount
  useEffect(() => {
    if (!kickUser?.uid) return;
    getMyCommentVotes([comment.id], kickUser.uid).then((votes) => {
      setSelfVote(votes.get(comment.id) || null);
      setSelfVoteLoaded(true);
    });
  }, [comment.id, kickUser?.uid]);

  // Determine current vote: use self-managed state if loaded, otherwise fall back to external prop
  const currentVote = selfVoteLoaded
    ? selfVote?.voteType || null
    : externalVote ?? null;

  // Self-managed vote handler
  const handleVote = useCallback(
    async (commentId: string, voteType: "like" | "dislike") => {
      if (!kickUser?.uid) return;

      // Optimistic update
      setSelfVote((prev) => {
        if (prev?.voteType === voteType) return null;
        return { userId: kickUser.uid, voteType, createdAt: null, updatedAt: null };
      });

      try {
        await voteDramaComment(commentId, kickUser.uid, voteType);
      } catch (err) {
        console.error("Comment vote error:", err);
      }

      // Also call external handler so parent can track if needed
      if (externalOnVote) externalOnVote(commentId, voteType);
    },
    [kickUser?.uid, externalOnVote]
  );

  // Auto-load replies on mount when replyCount > 0
  useEffect(() => {
    if (comment.replyCount > 0) {
      loadDramaReplies(comment.id)
        .then((loaded) => {
          setReplies(loaded);
          setShowReplies(true);
        })
        .catch((err) => console.error("Auto-load replies error:", err));
    }
  }, [comment.id, comment.replyCount]);

  const timeAgo = comment.createdAt
    ? formatRelativeTime(comment.createdAt.toDate())
    : "";

  const isAuthor = kickUser?.uid === comment.authorId;
  const canReply = comment.depth < 2;

  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setLoadingReplies(true);
    try {
      const loaded = await loadDramaReplies(comment.id);
      setReplies(loaded);
      setShowReplies(true);
    } catch (err) {
      console.error("Load replies error:", err);
    }
    setLoadingReplies(false);
  };

  const refreshReplies = async () => {
    try {
      const loaded = await loadDramaReplies(comment.id);
      setReplies(loaded);
      setShowReplies(true);
    } catch (err) {
      console.error("Refresh replies error:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDramaComment(
        comment.id,
        comment.entryId,
        comment.parentCommentId
      );
    } catch (err) {
      console.error("Delete comment error:", err);
    }
    setConfirmDelete(false);
  };

  const handleReport = async () => {
    if (!kickUser || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await reportDramaContent(
        { uid: kickUser.uid, username: kickUser.username },
        {
          type: "comment",
          id: comment.id,
          entryId: comment.entryId,
          clubId: comment.clubId,
        },
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
        className={`${
          comment.depth > 0 ? "ml-6 border-l-2 border-border pl-3" : ""
        }`}
      >
        <div className="py-2.5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => {
                if (!kickUser || kickUser.uid === comment.authorId) return;
                getOrCreateConversation(
                  kickUser.uid,
                  comment.authorId,
                  { [kickUser.uid]: kickUser.username, [comment.authorId]: comment.authorUsername },
                  { [kickUser.uid]: kickUser.avatar || null, [comment.authorId]: comment.authorAvatar }
                ).then((convId) => router.push(`/chat/${convId}`));
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {comment.authorAvatar ? (
                <img
                  src={comment.authorAvatar}
                  alt=""
                  className="h-5 w-5 rounded-full shrink-0"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[7px] font-bold text-foreground shrink-0">
                  {comment.authorUsername[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-foreground hover:text-kick transition-colors">
                {comment.authorUsername}
              </span>
            </button>
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>

          {/* Body */}
          <p className="text-sm text-foreground mb-2 whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <DramaVoteButtons
              likeCount={comment.likeCount}
              dislikeCount={comment.dislikeCount}
              currentVote={currentVote}
              onVote={(voteType) => handleVote(comment.id, voteType)}
              size="sm"
            />

            {canReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Yanitla
              </button>
            )}

            {comment.replyCount > 0 && (
              <button
                onClick={handleLoadReplies}
                disabled={loadingReplies}
                className="text-[10px] text-kick hover:text-kick-hover transition-colors"
              >
                {loadingReplies
                  ? "..."
                  : showReplies
                  ? "Yanitlari gizle"
                  : `${comment.replyCount} yanit`}
              </button>
            )}

            {isAuthor ? (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDelete}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                      Sil
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Iptal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    Sil
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowReportModal(true)}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
              >
                Sikayet
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2">
              <DramaCommentInput
                entryId={comment.entryId}
                clubId={comment.clubId}
                parentCommentId={comment.id}
                depth={comment.depth + 1}
                autoFocus
                placeholder={`@${comment.authorUsername} yanit yaz...`}
                onSuccess={() => {
                  setShowReplyInput(false);
                  refreshReplies();
                }}
                onCancel={() => setShowReplyInput(false)}
              />
            </div>
          )}
        </div>

        {/* Replies */}
        {showReplies && replies.length > 0 && (
          <div className="space-y-0">
            {replies.map((reply) => (
              <DramaCommentItem
                key={reply.id}
                comment={reply}
              />
            ))}
          </div>
        )}
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
                  Bu yorumu neden sikayet ediyorsun?
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
