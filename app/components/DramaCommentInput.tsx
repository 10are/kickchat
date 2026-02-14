"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { createDramaComment } from "@/app/lib/firestore";

interface DramaCommentInputProps {
  entryId: string;
  clubId: string;
  parentCommentId?: string | null;
  depth?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function DramaCommentInput({
  entryId,
  clubId,
  parentCommentId,
  depth = 0,
  onSuccess,
  onCancel,
  autoFocus = false,
  placeholder = "Yorum yaz...",
}: DramaCommentInputProps) {
  const { kickUser } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!kickUser || !body.trim()) return;

    setSubmitting(true);
    try {
      await createDramaComment(
        { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar },
        entryId,
        clubId,
        body.trim(),
        parentCommentId || null,
        depth
      );
      setBody("");
      onSuccess?.();
    } catch (err) {
      console.error("Comment error:", err);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 2000))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape" && onCancel) {
            onCancel();
          }
        }}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
        autoFocus={autoFocus}
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !body.trim()}
        className="rounded-lg bg-kick px-3 py-2 text-sm font-medium text-black hover:bg-kick-hover transition-colors disabled:opacity-50 shrink-0"
      >
        {submitting ? "..." : "Gonder"}
      </button>
      {onCancel && (
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors shrink-0"
        >
          Iptal
        </button>
      )}
    </div>
  );
}
