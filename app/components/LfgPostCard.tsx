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
  const [showDetail, setShowDetail] = useState(false);

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

  const filledBlocks = Math.round((progress / 100) * 6);
  const blockColor = progress > 50 ? "bg-kick" : progress > 20 ? "bg-yellow-500" : "bg-red-500";
  const blockColorDim = progress > 50 ? "bg-kick/20" : progress > 20 ? "bg-yellow-500/20" : "bg-red-500/20";
  const clipCorner = "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)";

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className={`h-[140px] overflow-hidden cursor-pointer transition-all hover:brightness-110 ${isExpired ? "opacity-40" : ""}`}
      >
        <div
          className="bg-surface-hover h-full flex flex-col"
          style={{ clipPath: clipCorner }}
        >
          {/* Header: Avatar + Nick + Timer */}
          <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt="" className="h-5 w-5 shrink-0"
                style={{ clipPath: "polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px)" }}
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-kick font-[family-name:var(--font-pixel)] text-[6px] text-black"
                style={{ clipPath: "polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px)" }}
              >
                {post.authorUsername[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-[family-name:var(--font-pixel)] text-[8px] text-foreground truncate min-w-0">
              {post.authorUsername}
            </span>
            <div className="flex-1" />
            {!isExpired ? (
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex gap-[1px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-[3px] ${i < filledBlocks ? blockColor : blockColorDim}`} />
                  ))}
                </div>
                <span className="font-[family-name:var(--font-pixel)] text-[6px] text-muted-foreground">{timeLeft}</span>
              </div>
            ) : (
              <span className="font-[family-name:var(--font-pixel)] text-[6px] text-red-400 shrink-0">DOLDU</span>
            )}
          </div>

          {/* Pixel divider */}
          <div className="mx-2.5 flex gap-[2px]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={`h-[1px] flex-1 ${i % 2 === 0 ? "bg-border" : "bg-transparent"}`} />
            ))}
          </div>

          {/* Description - truncated, no expand here */}
          <div className="px-2.5 py-1.5 flex-1 min-h-0 overflow-hidden">
            <p className="text-[10px] text-foreground/80 leading-snug line-clamp-2 break-words">
              {post.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-0.5 px-2.5 pb-1.5">
            <span className="font-[family-name:var(--font-pixel)] text-[6px] bg-background/50 text-muted-foreground px-1 py-0.5">{post.platform}</span>
            <span className="font-[family-name:var(--font-pixel)] text-[6px] bg-background/50 text-muted-foreground px-1 py-0.5">{post.language}</span>
            {post.rank && <span className="font-[family-name:var(--font-pixel)] text-[6px] bg-background/50 text-muted-foreground px-1 py-0.5">{post.rank}</span>}
            {post.micRequired && <span className="font-[family-name:var(--font-pixel)] text-[6px] bg-kick/10 text-kick px-1 py-0.5">MIC</span>}
          </div>

          {/* Owner actions inline */}
          {showActions && isOwn && (
            <div className="flex gap-[1px] mt-auto">
              {!isExpired && onRefresh && (
                <button onClick={(e) => { e.stopPropagation(); onRefresh(post.id); }} className="flex-1 bg-kick/10 py-1 font-[family-name:var(--font-pixel)] text-[7px] text-kick hover:bg-kick/20 active:translate-y-[1px]">
                  YENILE
                </button>
              )}
              {onEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="flex-1 bg-background/50 py-1 font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground hover:text-foreground active:translate-y-[1px]">
                  DUZENLE
                </button>
              )}
              {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="bg-background/50 px-2 py-1 font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground hover:text-red-400 active:translate-y-[1px]">
                  SIL
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail overlay */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[340px] max-h-[80vh] overflow-y-auto bg-surface border border-border"
            style={{ clipPath: "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)" }}
          >
            {/* Detail header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt="" className="h-8 w-8"
                  style={{ clipPath: "polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)" }}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center bg-kick font-[family-name:var(--font-pixel)] text-[10px] text-black"
                  style={{ clipPath: "polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)" }}
                >
                  {post.authorUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground truncate">{post.authorUsername}</p>
                {!isExpired ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex gap-[1px]">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`h-2 w-1 ${i < Math.round((progress / 100) * 8) ? blockColor : blockColorDim}`} />
                      ))}
                    </div>
                    <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground">{timeLeft}</span>
                  </div>
                ) : (
                  <span className="font-[family-name:var(--font-pixel)] text-[7px] text-red-400">DOLDU</span>
                )}
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Pixel divider */}
            <div className="mx-4 flex gap-[2px]">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className={`h-[1px] flex-1 ${i % 2 === 0 ? "bg-border" : "bg-transparent"}`} />
              ))}
            </div>

            {/* Full description */}
            <div className="px-4 py-3">
              <p className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                {post.description}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 px-4 pb-3">
              <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-1.5 py-0.5">{post.platform}</span>
              <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-1.5 py-0.5">{post.language}</span>
              {post.rank && <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-background/50 text-muted-foreground px-1.5 py-0.5">{post.rank}</span>}
              {post.micRequired && <span className="font-[family-name:var(--font-pixel)] text-[8px] bg-kick/10 text-kick px-1.5 py-0.5">MIC</span>}
            </div>

            {/* Actions */}
            {!isOwn && !isExpired && (
              <div className="flex gap-[1px]">
                <button
                  onClick={handleMessage}
                  disabled={messaging}
                  className="flex-1 bg-kick py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover disabled:opacity-50 active:translate-y-[1px]"
                >
                  {messaging ? "..." : "MESAJ GONDER"}
                </button>
                <button
                  onClick={handleAddFriend}
                  disabled={requestSent}
                  className={`py-2.5 px-4 font-[family-name:var(--font-pixel)] text-[9px] active:translate-y-[1px] ${
                    requestSent ? "bg-kick/10 text-kick" : "bg-background/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {requestSent ? "OK" : "ARKADAS EKLE"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
