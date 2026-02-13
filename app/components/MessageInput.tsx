"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { sendMessage } from "@/app/lib/firestore";

export default function MessageInput({ conversationId }: { conversationId: string }) {
  const { kickUser } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() || !kickUser || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, kickUser.uid, text.trim());
      setText("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send error:", err);
    }
    setSending(false);
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Mesaj yaz..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-kick"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-kick text-black transition-all hover:bg-kick-hover disabled:opacity-30 hover:scale-105 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
