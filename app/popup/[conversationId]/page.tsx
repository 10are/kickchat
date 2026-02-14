"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db, Conversation } from "@/app/lib/firestore";
import MessageList from "@/app/components/MessageList";
import MessageInput from "@/app/components/MessageInput";

interface ReplyTo {
  id: string;
  text: string;
  senderName: string;
}

export default function PopupChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { kickUser, loading } = useAuth();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  useEffect(() => {
    if (!conversationId || !kickUser) return;
    const unsub = onSnapshot(doc(db, "conversations", conversationId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const participants: string[] = data.participants || [];
        if (kickUser.uid && participants.includes(kickUser.uid)) {
          setConv({ id: snap.id, ...data } as Conversation);
        }
      }
    });
    return () => unsub();
  }, [conversationId, kickUser]);

  // Set window title
  useEffect(() => {
    if (!conv || !kickUser) return;
    const name = conv.isGroup
      ? (conv.groupName || "Grup")
      : (() => {
          const otherId = conv.participants.find((p) => p !== kickUser.uid);
          return otherId ? conv.participantUsernames?.[otherId] || "Chat" : "Chat";
        })();
    document.title = `${name} - KickSocially`;
  }, [conv, kickUser]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 bg-kick"
              style={{ animation: `pixel-blink 1s step-end ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!kickUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Giriş yapmalısınız</p>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 bg-kick"
              style={{ animation: `pixel-blink 1s step-end ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const isGroup = conv.isGroup === true;
  const otherId = !isGroup ? conv.participants.find((p) => p !== kickUser.uid) : undefined;
  const otherUsername = isGroup
    ? (conv.groupName || "Grup")
    : (otherId ? conv.participantUsernames?.[otherId] || "?" : "?");
  const otherAvatar = !isGroup && otherId ? conv.participantAvatars?.[otherId] || null : null;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Mini header - draggable area */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2 shrink-0">
        {isGroup ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-kick/10">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-kick">
              <path d="M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM13 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 17c0-2.21 1.79-3 3-3h2c1.21 0 3 .79 3 3M11 17c0-2.21 1.79-3 3-3h2c1.21 0 3 .79 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : otherAvatar ? (
          <img src={otherAvatar} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-[family-name:var(--font-pixel)] text-[7px] text-foreground">
            {otherUsername[0]?.toUpperCase()}
          </div>
        )}
        <span className="flex-1 font-[family-name:var(--font-pixel)] text-[9px] text-foreground truncate">
          {otherUsername}
        </span>
        {isGroup && (
          <span className="text-[8px] text-muted-foreground shrink-0">
            {conv.participants.length} kisi
          </span>
        )}
        <img src="/favicon.svg" alt="" className="h-5 w-5 shrink-0" />
      </div>

      {/* Messages */}
      <MessageList
        conversationId={conversationId}
        participantUsernames={conv.participantUsernames || {}}
        participantAvatars={conv.participantAvatars || {}}
        onReply={setReplyTo}
      />

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
