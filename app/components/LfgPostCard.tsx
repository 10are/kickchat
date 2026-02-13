"use client";

import { useAuth } from "@/app/lib/AuthContext";
import { useRouter } from "next/navigation";
import {
  LfgPost,
  getOrCreateConversation,
  sendFriendRequest,
} from "@/app/lib/firestore";
import { useState, useEffect } from "react";

interface Props {
  post: LfgPost;
  showActions?: boolean;
  onEdit?: (post: LfgPost) => void;
  onDelete?: (postId: string) => void;
  onRefresh?: (postId: string) => void;
}

export default function LfgPostCard({ post, showActions, onEdit, onDelete, onRefresh }: Props) {
  const { kickUser } = useAuth();
  const router = useRouter();
  const [requestSent, setRequestSent] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(100);

  const isOwn = kickUser?.uid === post.authorId;
  const isExpired = post.expiresAt ? post.expiresAt.toMillis() < Date.now() : false;

  // Live countdown
  useEffect(() => {
    if (!post.expiresAt || !post.createdAt) return;

    const update = () => {
      const now = Date.now();
      const expires = post.expiresAt!.toMillis();
      const created = post.createdAt!.toMillis();
      const total = expires - created;
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("DOLDU");
        setProgress(0);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hours > 0) setTimeLeft(`${hours}S ${mins}DK`);
      else setTimeLeft(`${mins}DK`);

      setProgress(Math.max(0, Math.min(100, (diff / total) * 100)));
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [post.expiresAt, post.createdAt]);

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

  // Pixel progress bar segments (8 blocks)
  const filledBlocks = Math.round((progress / 100) * 8);
  const blockColor = progress > 50 ? "bg-kick" : progress > 20 ? "bg-yellow-500" : "bg-red-500";
  const blockColorDim = progress > 50 ? "bg-kick/20" : progress > 20 ? "bg-yellow-500/20" : "bg-red-500/20";

  return (
    <div
      className={`group relative overflow-hidden transition-all h-[280px] flex flex-col ${
        isExpired ? "opacity-40" : ""
      }`}
    >
      {/* Card body */}
      <div
        className="bg-surface-hover flex flex-col flex-1"
        style={{ clipPath: "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)" }}
      >
        {/* Header: Author row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={handleMessage}
            disabled={isOwn || isExpired || messaging}
            className="flex items-center gap-2.5 group/author disabled:cursor-default"
          >
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt=""
                className="h-8 w-8"
                style={{ clipPath: "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)" }}
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center bg-kick font-[family-name:var(--font-pixel)] text-[9px] text-black"
                style={{ clipPath: "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)" }}
              >
                {post.authorUsername[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className={`font-[family-name:var(--font-pixel)] text-[10px] text-foreground ${!isOwn && !isExpired ? "group-hover/author:text-kick transition-colors" : ""}`}>
                {post.authorUsername}
              </p>
              {post.categoryName && !showActions && (
                <p className="text-[9px] text-muted-foreground">{post.categoryName}</p>
              )}
            </div>
          </button>

          {/* Pixel timer */}
          {!isExpired ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-[2px]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-1.5 ${i < filledBlocks ? blockColor : blockColorDim}`}
                  />
                ))}
              </div>
              <span className="font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground">
                {timeLeft}
              </span>
            </div>
          ) : (
            <span className="font-[family-name:var(--font-pixel)] text-[8px] text-red-400">
              DOLDU
            </span>
          )}
        </div>

        {/* Pixel divider */}
        <div className="mx-4 flex gap-[2px]">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className={`h-[2px] flex-1 ${i % 2 === 0 ? "bg-border" : "bg-transparent"}`} />
          ))}
        </div>

        {/* Description - fixed height, truncated */}
        <div className="px-4 py-3 flex-1 min-h-0 overflow-hidden">
          <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
            {post.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-2 py-1">
            {post.platform}
          </span>
          <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-2 py-1">
            {post.language}
          </span>
          {post.rank && (
            <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-2 py-1">
              {post.rank}
            </span>
          )}
          {post.micRequired && (
            <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-kick/10 text-kick px-2 py-1">
              MIC
            </span>
          )}
        </div>

        {/* Actions - always at bottom */}
        {showActions && isOwn ? (
          <div className="flex gap-[2px] px-4 pb-3 mt-auto">
            {!isExpired && onRefresh && (
              <button
                onClick={() => onRefresh(post.id)}
                className="flex-1 bg-kick/10 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-kick transition-colors hover:bg-kick/20 active:translate-y-[1px]"
              >
                YENILE
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(post)}
                className="flex-1 bg-background/50 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:translate-y-[1px]"
              >
                DUZENLE
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="bg-background/50 px-3 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 active:translate-y-[1px]"
              >
                SIL
              </button>
            )}
          </div>
        ) : !isOwn && !isExpired ? (
          <div className="flex gap-[2px] px-4 pb-3 mt-auto">
            <button
              onClick={handleMessage}
              disabled={messaging}
              className="flex-1 bg-kick py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black transition-all hover:bg-kick-hover disabled:opacity-50 active:translate-y-[1px]"
            >
              {messaging ? "..." : "MESAJ GONDER"}
            </button>
            <button
              onClick={handleAddFriend}
              disabled={requestSent}
              className={`py-2.5 px-3 font-[family-name:var(--font-pixel)] text-[9px] transition-all active:translate-y-[1px] ${
                requestSent
                  ? "bg-kick/10 text-kick"
                  : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              {requestSent ? "GONDERILDI" : "ARKADAS EKLE"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
