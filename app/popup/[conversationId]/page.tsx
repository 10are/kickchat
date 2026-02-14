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
    const otherId = conv.participants.find((p) => p !== kickUser.uid);
    const otherName = otherId ? conv.participantUsernames?.[otherId] || "Chat" : "Chat";
    document.title = `${otherName} - KickSocially`;
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

  const otherId = conv.participants.find((p) => p !== kickUser.uid);
  const otherUsername = otherId ? conv.participantUsernames?.[otherId] || "?" : "?";
  const otherAvatar = otherId ? conv.participantAvatars?.[otherId] || null : null;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Mini header - draggable area */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2 shrink-0">
        {otherAvatar ? (
          <img src={otherAvatar} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-[family-name:var(--font-pixel)] text-[7px] text-foreground">
            {otherUsername[0]?.toUpperCase()}
          </div>
        )}
        <span className="flex-1 font-[family-name:var(--font-pixel)] text-[9px] text-foreground truncate">
          {otherUsername}
        </span>
        <img src="/logo.png" alt="" className="h-5 w-5 shrink-0" />
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
