"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db, Conversation, blockUser, sendFriendRequest } from "@/app/lib/firestore";
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
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [friendLoading, setFriendLoading] = useState(false);

  // Derived values
  const otherId = conv?.participants.find((p) => p !== kickUser?.uid);
  const otherUsername = otherId ? conv?.participantUsernames?.[otherId] || "?" : "?";
  const otherAvatar = otherId ? conv?.participantAvatars?.[otherId] || null : null;

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

  // Check friendship status
  useEffect(() => {
    if (!kickUser?.uid || !otherId) return;

    const friendDoc = doc(db, "users", kickUser.uid, "friends", otherId);
    const unsubFriend = onSnapshot(friendDoc, async (snap) => {
      if (snap.exists()) {
        setFriendStatus("friends");
        return;
      }
      // Check pending requests (both directions)
      const q1 = query(
        collection(db, "friendRequests"),
        where("fromId", "==", kickUser.uid),
        where("toId", "==", otherId)
      );
      const q2 = query(
        collection(db, "friendRequests"),
        where("fromId", "==", otherId),
        where("toId", "==", kickUser.uid)
      );
      const [r1, r2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      setFriendStatus(!r1.empty || !r2.empty ? "pending" : "none");
    });
    return () => unsubFriend();
  }, [kickUser?.uid, otherId]);

  const handleAddFriend = async () => {
    if (!kickUser || !otherId || friendStatus !== "none") return;
    setFriendLoading(true);
    try {
      await sendFriendRequest(
        { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar },
        { kickUserId: otherId, username: otherUsername, avatar: otherAvatar }
      );
      setFriendStatus("pending");
    } finally {
      setFriendLoading(false);
    }
  };

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

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Chat Header */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 shrink-0">
        {otherAvatar ? (
          <img src={otherAvatar} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
            {otherUsername[0]?.toUpperCase()}
          </div>
        )}
        <span className="font-medium text-foreground text-sm">{otherUsername}</span>

        {/* Action buttons - left aligned */}
        <button
          onClick={() => {
            window.open(
              `/popup/${conversationId}`,
              `kickchat-${conversationId}`,
              "width=380,height=520,resizable=yes,scrollbars=no"
            );
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 3v4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-[family-name:var(--font-pixel)] text-[7px]">POPUP</span>
        </button>

        <button
          onClick={() => router.push(`/watch?conv=${conversationId}`)}
          className="flex items-center gap-1.5 rounded-lg border border-kick/30 bg-kick/10 px-2.5 py-1.5 text-kick transition-colors hover:bg-kick/20"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8l4 2.5-4 2.5V8z" fill="currentColor" />
          </svg>
          <span className="font-[family-name:var(--font-pixel)] text-[7px]">YAYIN IZLE</span>
        </button>

        <div className="flex-1" />

        {/* Friend status / Add friend button */}
        {friendStatus === "friends" ? (
          <span className="flex items-center gap-1 rounded-lg bg-kick/10 px-2 py-1">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-kick">
              <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-kick">ARKADAS</span>
          </span>
        ) : friendStatus === "pending" ? (
          <span className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-yellow-500">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-yellow-500">ISTEK GONDERILDI</span>
          </span>
        ) : (
          <button
            onClick={handleAddFriend}
            disabled={friendLoading}
            className="flex items-center gap-1 rounded-lg bg-kick/10 px-2 py-1 transition-colors hover:bg-kick/20 disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-kick">
              <path d="M12 13a4 4 0 00-8 0M8 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M15 6v4M17 8h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-kick">
              {friendLoading ? "..." : "ARKADAS EKLE"}
            </span>
          </button>
        )}

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
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-red-400"
              title="Engelle"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
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
