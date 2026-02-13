"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import {
  subscribeToConversations,
  subscribeToFriends,
  subscribeToPendingRequests,
  subscribeToBlockedUsers,
  Conversation,
  Friend,
  FriendRequest,
  BlockedUser,
  getOrCreateConversation,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  unblockUser,
} from "@/app/lib/firestore";
import { useRouter, useParams } from "next/navigation";
import UserSearch from "./UserSearch";

type Tab = "chats" | "friends" | "requests" | "blocked";

export default function ChatSidebar() {
  const { kickUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [tab, setTab] = useState<Tab>("chats");
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const params = useParams();
  const activeId = params?.conversationId as string | undefined;

  useEffect(() => {
    if (!kickUser?.uid) return;
    const unsub1 = subscribeToConversations(kickUser.uid, setConversations);
    const unsub2 = subscribeToFriends(kickUser.uid, setFriends);
    const unsub3 = subscribeToPendingRequests(kickUser.uid, setRequests);
    const unsub4 = subscribeToBlockedUsers(kickUser.uid, setBlockedUsers);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [kickUser?.uid]);

  const getOtherUser = (conv: Conversation) => {
    if (!kickUser) return { username: "?", avatar: null };
    const otherId = conv.participants.find((p) => p !== kickUser.uid);
    return {
      username: otherId ? conv.participantUsernames?.[otherId] || "?" : "?",
      avatar: otherId ? conv.participantAvatars?.[otherId] || null : null,
    };
  };

  const handleStartChatWithFriend = async (friend: Friend) => {
    if (!kickUser) return;
    const usernames = { [kickUser.uid]: kickUser.username, [friend.oderId]: friend.username };
    const avatars = { [kickUser.uid]: kickUser.avatar, [friend.oderId]: friend.avatar };
    const convId = await getOrCreateConversation(kickUser.uid, friend.oderId, usernames, avatars);
    router.push(`/chat/${convId}`);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "chats", label: "Sohbetler" },
    { key: "friends", label: "Arkadaşlar", count: friends.length },
    { key: "requests", label: "İstekler", count: requests.length },
    { key: "blocked", label: "Engelli", count: blockedUsers.length },
  ];

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold text-foreground text-sm">Mesajlar</span>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Kullanıcı ara"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* User Search Overlay */}
      {showSearch && <UserSearch onClose={() => setShowSearch(false)} />}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
              tab === t.key
                ? "text-kick"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count && t.count > 0 ? (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-kick px-1 font-[family-name:var(--font-pixel)] text-[8px] text-black">
                {t.count}
              </span>
            ) : null}
            {tab === t.key && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-kick" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Chats Tab */}
        {tab === "chats" && (
          <>
            {conversations.length === 0 && (
              <EmptyState
                icon="chat"
                text="Henüz sohbet yok"
                action="Arkadaş ekle ve sohbet başlat"
                onAction={() => setTab("friends")}
              />
            )}
            {conversations.map((conv) => {
              const other = getOtherUser(conv);
              const isActive = activeId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-surface-active border-l-2 border-kick" : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="relative">
                    {other.avatar ? (
                      <img src={other.avatar} alt="" className="h-10 w-10 rounded-lg" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-xs text-foreground">
                        {other.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{other.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage || "Sohbet başlatıldı"}
                    </p>
                  </div>
                  {conv.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(conv.lastMessageAt.toDate())}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* Friends Tab */}
        {tab === "friends" && (
          <>
            {friends.length === 0 && (
              <EmptyState
                icon="friends"
                text="Henüz arkadaşın yok"
                action="Kullanıcı ara ve arkadaş ekle"
                onAction={() => setShowSearch(true)}
              />
            )}
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => handleStartChatWithFriend(friend)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover cursor-pointer"
              >
                <div className="relative">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt="" className="h-10 w-10 rounded-lg" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-xs text-foreground">
                      {friend.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {friend.username}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); kickUser && removeFriend(kickUser.uid, friend.oderId); }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-active hover:text-red-400"
                  title="Arkadaşlıktan çıkar"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {/* Requests Tab */}
        {tab === "requests" && (
          <>
            {requests.length === 0 && (
              <EmptyState icon="requests" text="Bekleyen istek yok" />
            )}
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3"
              >
                <div className="relative">
                  {req.fromAvatar ? (
                    <img src={req.fromAvatar} alt="" className="h-10 w-10 rounded-lg" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-xs text-foreground">
                      {req.fromUsername[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{req.fromUsername}</p>
                  <p className="text-xs text-muted-foreground">Arkadaşlık isteği</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => acceptFriendRequest(req.id, req)}
                    className="rounded-lg bg-kick px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-kick-hover"
                  >
                    Kabul
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(req.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-red-400"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Blocked Tab */}
        {tab === "blocked" && (
          <>
            {blockedUsers.length === 0 && (
              <EmptyState icon="blocked" text="Engellenen kullanıcı yok" />
            )}
            {blockedUsers.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover"
              >
                <div className="relative">
                  {blocked.avatar ? (
                    <img src={blocked.avatar} alt="" className="h-10 w-10 rounded-lg opacity-50" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-xs text-foreground opacity-50">
                      {blocked.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{blocked.username}</p>
                  <p className="text-xs text-red-400">Engellendi</p>
                </div>
                <button
                  onClick={() => kickUser && unblockUser(kickUser.uid, blocked.blockedId)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  action,
  onAction,
}: {
  icon: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hover">
        {icon === "chat" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" />
          </svg>
        )}
        {icon === "friends" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "requests" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {icon === "blocked" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" />
            <path d="M5.7 5.7l12.6 12.6" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="font-[family-name:var(--font-pixel)] text-[10px] text-kick hover:underline"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
