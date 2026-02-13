"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { sendMessage } from "@/app/lib/firestore";
import type { ReplyTo } from "@/app/chat/[conversationId]/page";

interface Props {
  conversationId: string;
  replyTo: ReplyTo | null;
  onCancelReply: () => void;
}

export default function MessageInput({ conversationId, replyTo, onCancelReply }: Props) {
  const { kickUser } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() || !kickUser || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, kickUser.uid, text.trim(), replyTo);
      setText("");
      onCancelReply();
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send error:", err);
    }
    setSending(false);
  };

  return (
    <div className="border-t border-border bg-surface shrink-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="h-full w-0.5 bg-kick rounded-full self-stretch" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-kick">{replyTo.senderName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{replyTo.text}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Mesaj yaz..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-kick"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-kick text-black transition-all hover:bg-kick-hover disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M18 2L9 11M18 2l-5 16-4-7-7-4 16-5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
