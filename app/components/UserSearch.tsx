"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import {
  searchUsers,
  sendFriendRequest,
  getOrCreateConversation,
  UserProfile,
} from "@/app/lib/firestore";
import { useRouter } from "next/navigation";

export default function UserSearch({ onClose }: { onClose: () => void }) {
  const { kickUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const users = await searchUsers(query.trim());
      setResults(users.filter((u) => u.kickUserId !== kickUser?.uid));
    } catch (err) {
      console.error("Search error:", err);
    }
    setSearching(false);
  };

  const handleAddFriend = async (targetUser: UserProfile) => {
    if (!kickUser) return;
    await sendFriendRequest(
      { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar },
      targetUser
    );
    setSentRequests((prev) => new Set(prev).add(targetUser.kickUserId));
  };

  const handleStartChat = async (targetUser: UserProfile) => {
    if (!kickUser) return;
    const usernames = { [kickUser.uid]: kickUser.username, [targetUser.kickUserId]: targetUser.username };
    const avatars = { [kickUser.uid]: kickUser.avatar, [targetUser.kickUserId]: targetUser.avatar };
    const convId = await getOrCreateConversation(kickUser.uid, targetUser.kickUserId, usernames, avatars);
    onClose();
    router.push(`/chat/${convId}`);
  };

  return (
    <div className="border-b border-border bg-surface-hover p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-kick flex-1">
          KULLANICI ARA
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Kullanıcı adı..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg bg-kick px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-kick-hover disabled:opacity-50"
        >
          {searching ? "..." : "Ara"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 space-y-1">
          {results.map((user) => (
            <div
              key={user.kickUserId}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-active"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-lg" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-[8px] text-foreground">
                  {user.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="flex-1 text-sm text-foreground truncate">{user.username}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleStartChat(user)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-kick"
                  title="Mesaj gönder"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M18 10c0 4.418-3.582 7-8 7a9.06 9.06 0 01-3-.5L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  onClick={() => handleAddFriend(user)}
                  disabled={sentRequests.has(user.kickUserId)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    sentRequests.has(user.kickUserId)
                      ? "text-kick"
                      : "text-muted-foreground hover:text-kick"
                  }`}
                  title={sentRequests.has(user.kickUserId) ? "İstek gönderildi" : "Arkadaş ekle"}
                >
                  {sentRequests.has(user.kickUserId) ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && !searching && query && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Kullanıcı bulunamadı</p>
      )}
    </div>
  );
}
