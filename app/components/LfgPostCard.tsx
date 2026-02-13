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
  const [expanded, setExpanded] = useState(false);

  const isOwn = kickUser?.uid === post.authorId;
  const isExpired = post.expiresAt ? post.expiresAt.toMillis() < Date.now() : false;

  useEffect(() => {
    if (!post.expiresAt || !post.createdAt) return;
    const update = () => {
      const now = Date.now();
      const expires = post.expiresAt!.toMillis();
      const created = post.createdAt!.toMillis();
      const total = expires - created;
      const diff = expires - now;
      if (diff <= 0) { setTimeLeft("DOLDU"); setProgress(0); return; }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(hours > 0 ? `${hours}S ${mins}DK` : `${mins}DK`);
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
      const convId = await getOrCreateConversation(
        kickUser.uid, post.authorId,
        { [kickUser.uid]: kickUser.username, [post.authorId]: post.authorUsername },
        { [kickUser.uid]: kickUser.avatar, [post.authorId]: post.authorAvatar }
      );
      router.push(`/chat/${convId}`);
    } catch (err) { console.error("Failed to start conversation:", err); }
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
    } catch (err) { console.error("Failed to send friend request:", err); }
  };

  const filledBlocks = Math.round((progress / 100) * 8);
  const blockColor = progress > 50 ? "bg-kick" : progress > 20 ? "bg-yellow-500" : "bg-red-500";
  const blockColorDim = progress > 50 ? "bg-kick/20" : progress > 20 ? "bg-yellow-500/20" : "bg-red-500/20";
  const descTruncated = post.description.length > 80;

  return (
    <div className={`overflow-hidden transition-all ${isExpired ? "opacity-40" : ""}`}>
      <div
        className="bg-surface-hover"
        style={{ clipPath: "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)" }}
      >
        {/* Row 1: Avatar + Nick + Tags + Timer */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* Avatar - clickable for chat */}
          <button
            onClick={handleMessage}
            disabled={isOwn || isExpired || messaging}
            className="shrink-0 disabled:cursor-default"
          >
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt="" className="h-7 w-7"
                style={{ clipPath: "polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)" }}
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center bg-kick font-[family-name:var(--font-pixel)] text-[8px] text-black"
                style={{ clipPath: "polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)" }}
              >
                {post.authorUsername[0]?.toUpperCase()}
              </div>
            )}
          </button>

          {/* Nick + category */}
          <button
            onClick={handleMessage}
            disabled={isOwn || isExpired || messaging}
            className="min-w-0 text-left disabled:cursor-default group/nick"
          >
            <p className={`font-[family-name:var(--font-pixel)] text-[9px] text-foreground truncate ${!isOwn && !isExpired ? "group-hover/nick:text-kick transition-colors" : ""}`}>
              {post.authorUsername}
            </p>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tags inline */}
          <div className="flex gap-1 shrink-0">
            <span className="font-[family-name:var(--font-pixel)] text-[7px] bg-background/50 text-muted-foreground px-1.5 py-0.5">
              {post.platform}
            </span>
            <span className="font-[family-name:var(--font-pixel)] text-[7px] bg-background/50 text-muted-foreground px-1.5 py-0.5">
              {post.language}
            </span>
            {post.micRequired && (
              <span className="font-[family-name:var(--font-pixel)] text-[7px] bg-kick/10 text-kick px-1.5 py-0.5">
                MIC
              </span>
            )}
          </div>

          {/* Timer */}
          {!isExpired ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex gap-[1px]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`h-2 w-1 ${i < filledBlocks ? blockColor : blockColorDim}`} />
                ))}
              </div>
              <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground">
                {timeLeft}
              </span>
            </div>
          ) : (
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-red-400 shrink-0">DOLDU</span>
          )}
        </div>

        {/* Row 2: Description (compact) */}
        <div className="px-3 pb-2">
          <p className={`text-[12px] text-foreground/80 leading-snug whitespace-pre-wrap break-words ${!expanded ? "line-clamp-2" : ""}`}>
            {post.description}
          </p>
          {descTruncated && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="font-[family-name:var(--font-pixel)] text-[7px] text-kick mt-0.5 hover:underline"
            >
              DEVAMINI OKU
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground mt-0.5 hover:underline"
            >
              KAPAT
            </button>
          )}
          {post.rank && (
            <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground ml-1">
              RANK: {post.rank}
            </span>
          )}
        </div>

        {/* Row 3: Actions */}
        {showActions && isOwn ? (
          <div className="flex gap-[1px]">
            {!isExpired && onRefresh && (
              <button onClick={() => onRefresh(post.id)} className="flex-1 bg-kick/10 py-1.5 font-[family-name:var(--font-pixel)] text-[8px] text-kick hover:bg-kick/20 active:translate-y-[1px]">
                YENILE
              </button>
            )}
            {onEdit && (
              <button onClick={() => onEdit(post)} className="flex-1 bg-background/50 py-1.5 font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground hover:text-foreground active:translate-y-[1px]">
                DUZENLE
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(post.id)} className="bg-background/50 px-3 py-1.5 font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground hover:text-red-400 active:translate-y-[1px]">
                SIL
              </button>
            )}
          </div>
        ) : !isOwn && !isExpired ? (
          <div className="flex gap-[1px]">
            <button onClick={handleMessage} disabled={messaging} className="flex-1 bg-kick py-1.5 font-[family-name:var(--font-pixel)] text-[8px] text-black hover:bg-kick-hover disabled:opacity-50 active:translate-y-[1px]">
              {messaging ? "..." : "MESAJ GONDER"}
            </button>
            <button
              onClick={handleAddFriend}
              disabled={requestSent}
              className={`py-1.5 px-3 font-[family-name:var(--font-pixel)] text-[8px] active:translate-y-[1px] ${
                requestSent ? "bg-kick/10 text-kick" : "bg-background/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {requestSent ? "OK" : "ARKADAS EKLE"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
