"use client";

import { useAuth } from "@/app/lib/AuthContext";
import { useRouter } from "next/navigation";
import {
  LfgPost,
  getOrCreateConversation,
  sendFriendRequest,
} from "@/app/lib/firestore";
import { useState } from "react";

interface Props {
  post: LfgPost;
  showActions?: boolean;
  onEdit?: (post: LfgPost) => void;
  onDelete?: (postId: string) => void;
  onRefresh?: (postId: string) => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  PC: "💻",
  PlayStation: "🎮",
  Xbox: "🎮",
  Mobile: "📱",
  Hepsi: "🌐",
};

export default function LfgPostCard({ post, showActions, onEdit, onDelete, onRefresh }: Props) {
  const { kickUser } = useAuth();
  const router = useRouter();
  const [requestSent, setRequestSent] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const isOwn = kickUser?.uid === post.authorId;
  const isExpired = post.expiresAt ? post.expiresAt.toMillis() < Date.now() : false;

  const timeRemaining = () => {
    if (!post.expiresAt) return "";
    const diff = post.expiresAt.toMillis() - Date.now();
    if (diff <= 0) return "Süresi doldu";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}sa ${mins}dk kaldı`;
    return `${mins}dk kaldı`;
  };

  const handleMessage = async () => {
    if (!kickUser || isOwn || messaging) return;
    setMessaging(true);
    try {
      const usernames = {
        [kickUser.uid]: kickUser.username,
        [post.authorId]: post.authorUsername,
      };
      const avatars = {
        [kickUser.uid]: kickUser.avatar,
        [post.authorId]: post.authorAvatar,
      };
      const convId = await getOrCreateConversation(
        kickUser.uid,
        post.authorId,
        usernames,
        avatars
      );
      router.push(`/chat/${convId}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
    setMessaging(false);
  };

  const handleAddFriend = async () => {
    if (!kickUser || isOwn || requestSent) return;
    try {
      await sendFriendRequest(
        { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar },
        { kickUserId: post.authorId, username: post.authorUsername, avatar: post.authorAvatar }
      );
      setRequestSent(true);
    } catch (err) {
      console.error("Failed to send friend request:", err);
    }
  };

  return (
    <div
      className={`rounded-xl border bg-surface p-4 transition-colors ${
        isExpired ? "border-border opacity-50" : "border-border hover:border-kick/30"
      }`}
    >
      {/* Header: Author + Time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {post.authorAvatar ? (
            <img src={post.authorAvatar} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
              {post.authorUsername[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{post.authorUsername}</p>
            {post.categoryName && !showActions && (
              <p className="text-[10px] text-muted-foreground">{post.categoryName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpired && (
            <span className="text-[10px] text-kick font-medium">
              {timeRemaining()}
            </span>
          )}
          {isExpired && (
            <span className="text-[10px] text-red-400 font-medium">
              Süresi doldu
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap break-words">
        {post.description}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-[11px] text-muted-foreground">
          {PLATFORM_ICONS[post.platform] || "🎮"} {post.platform}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-[11px] text-muted-foreground">
          🌍 {post.language}
        </span>
        {post.rank && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-[11px] text-muted-foreground">
            ⭐ {post.rank}
          </span>
        )}
        {post.micRequired && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-kick/10 px-2 py-1 text-[11px] text-kick">
            🎤 Mikrofon
          </span>
        )}
      </div>

      {/* Actions */}
      {showActions && isOwn ? (
        <div className="flex gap-2">
          {!isExpired && onRefresh && (
            <button
              onClick={() => onRefresh(post.id)}
              className="flex-1 rounded-lg bg-kick/10 px-3 py-2 text-xs font-medium text-kick transition-colors hover:bg-kick/20"
            >
              Yenile
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(post)}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Düzenle
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-red-400"
            >
              Sil
            </button>
          )}
        </div>
      ) : !isOwn && !isExpired ? (
        <div className="flex gap-2">
          <button
            onClick={handleMessage}
            disabled={messaging}
            className="flex-1 rounded-lg bg-kick px-3 py-2 text-xs font-medium text-black transition-colors hover:bg-kick-hover disabled:opacity-50"
          >
            {messaging ? "..." : "Mesaj Gönder"}
          </button>
          <button
            onClick={handleAddFriend}
            disabled={requestSent}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              requestSent
                ? "border-kick/30 text-kick"
                : "border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {requestSent ? "✓ Gönderildi" : "Arkadaş Ekle"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
