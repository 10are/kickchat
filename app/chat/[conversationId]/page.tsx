"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db, Conversation, blockUser } from "@/app/lib/firestore";
import MessageList from "@/app/components/MessageList";
import MessageInput from "@/app/components/MessageInput";

export interface ReplyTo {
  id: string;
  text: string;
  senderName: string;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const { kickUser } = useAuth();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "conversations", conversationId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const participants: string[] = data.participants || [];

        // Security check: only allow participants to view the conversation
        if (kickUser?.uid && !participants.includes(kickUser.uid)) {
          setUnauthorized(true);
          return;
        }

        setUnauthorized(false);
        setConv({ id: snap.id, ...data } as Conversation);
      }
    });
    return () => unsub();
  }, [conversationId, kickUser?.uid]);

  // Redirect unauthorized users
  if (unauthorized) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Erişim Engellendi</p>
          <p className="text-sm text-muted-foreground mb-4">Bu sohbete erişim yetkiniz yok.</p>
          <button
            onClick={() => router.push("/chat")}
            className="rounded-lg bg-kick px-4 py-2 text-sm font-medium text-black hover:bg-kick-hover transition-colors"
          >
            Sohbetlere Dön
          </button>
        </div>
      </div>
    );
  }

  const otherId = conv?.participants.find((p) => p !== kickUser?.uid);
  const otherUsername = otherId ? conv?.participantUsernames?.[otherId] || "?" : "?";
  const otherAvatar = otherId ? conv?.participantAvatars?.[otherId] || null : null;

  const handleBlock = async () => {
    if (!kickUser || !otherId) return;
    await blockUser(kickUser.uid, {
      kickUserId: otherId,
      username: otherUsername,
      avatar: otherAvatar,
    });
    setShowBlockConfirm(false);
    router.push("/chat");
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shrink-0">
        {otherAvatar ? (
          <img src={otherAvatar} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
            {otherUsername[0]?.toUpperCase()}
          </div>
        )}
        <span className="flex-1 font-medium text-foreground text-sm">{otherUsername}</span>

        {/* Block button */}
        <div className="relative">
          {showBlockConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Engellensin mi?</span>
              <button
                onClick={handleBlock}
                className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors"
              >
                Evet
              </button>
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                İptal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBlockConfirm(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-red-400"
              title="Engelle"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <MessageList
        conversationId={conversationId}
        participantUsernames={conv?.participantUsernames || {}}
        participantAvatars={conv?.participantAvatars || {}}
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
