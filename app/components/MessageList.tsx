"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { subscribeToMessages, loadOlderMessages, ChatMessage } from "@/app/lib/firestore";
import type { ReplyTo } from "@/app/chat/[conversationId]/page";

interface Props {
  conversationId: string;
  participantUsernames: Record<string, string>;
  participantAvatars: Record<string, string | null>;
  onReply: (reply: ReplyTo) => void;
}

export default function MessageList({
  conversationId,
  participantUsernames,
  participantAvatars,
  onReply,
}: Props) {
  const { kickUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevScrollHeight = useRef(0);

  // Subscribe to latest messages
  useEffect(() => {
    isInitialLoad.current = true;
    setOlderMessages([]);
    setHasMore(true);
    const unsub = subscribeToMessages(conversationId, setMessages);
    return () => unsub();
  }, [conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;
    if (isInitialLoad.current) {
      // Use requestAnimationFrame to ensure DOM has rendered
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
      isInitialLoad.current = false;
      return;
    }
    // Only auto-scroll if user is near the bottom
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load older messages when scrolling to top
  const handleScroll = useCallback(async () => {
    if (!scrollRef.current || loadingOlder || !hasMore) return;
    if (scrollRef.current.scrollTop > 50) return;

    const allMessages = [...olderMessages, ...messages];
    const oldest = allMessages.find((m) => m.createdAt);
    if (!oldest?.createdAt) return;

    setLoadingOlder(true);
    prevScrollHeight.current = scrollRef.current.scrollHeight;

    try {
      const older = await loadOlderMessages(conversationId, oldest.createdAt);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setOlderMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = older.filter((m) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      }
    } catch (err) {
      console.error("Load older messages error:", err);
    }
    setLoadingOlder(false);
  }, [loadingOlder, hasMore, olderMessages, messages, conversationId]);

  // Preserve scroll position after loading older messages
  useEffect(() => {
    if (!scrollRef.current || prevScrollHeight.current === 0) return;
    const newScrollHeight = scrollRef.current.scrollHeight;
    scrollRef.current.scrollTop = newScrollHeight - prevScrollHeight.current;
    prevScrollHeight.current = 0;
  }, [olderMessages]);

  const handleReply = (msg: ChatMessage) => {
    const senderName = participantUsernames[msg.senderId] || "?";
    onReply({
      id: msg.id,
      text: msg.text.length > 80 ? msg.text.slice(0, 80) + "..." : msg.text,
      senderName,
    });
  };

  const allMessages = [...olderMessages, ...messages];
  // Deduplicate (older messages might overlap with realtime)
  const seen = new Set<string>();
  const uniqueMessages = allMessages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
      {loadingOlder && (
        <div className="flex justify-center py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                style={{ animation: `pixel-blink 1s step-end ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {uniqueMessages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Henüz mesaj yok</p>
        </div>
      )}

      <div className="space-y-0.5">
        {uniqueMessages.map((msg, idx) => {
          const isMe = msg.senderId === kickUser?.uid;
          const prevMsg = idx > 0 ? uniqueMessages[idx - 1] : null;
          const isConsecutive = prevMsg?.senderId === msg.senderId;
          const senderName = participantUsernames[msg.senderId] || "?";
          const senderAvatar = participantAvatars[msg.senderId] || null;

          return (
            <div key={msg.id} className={isConsecutive ? "" : "pt-3"}>
              <div className={`flex gap-2.5 group ${isMe ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {!isConsecutive ? (
                      senderAvatar ? (
                        <img src={senderAvatar} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                          {senderName[0]?.toUpperCase()}
                        </div>
                      )
                    ) : null}
                  </div>
                )}

                <div className={`max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Username */}
                  {!isMe && !isConsecutive && (
                    <p className="mb-0.5 text-[11px] font-medium text-muted-foreground ml-1">
                      {senderName}
                    </p>
                  )}

                  {/* Reply preview */}
                  {msg.replyTo && (
                    <div className={`mb-0.5 ml-1 flex items-center gap-1.5 text-[11px] text-muted-foreground ${isMe ? "justify-end mr-1" : ""}`}>
                      <div className="h-3 w-0.5 bg-kick rounded-full shrink-0" />
                      <span className="truncate">
                        <span className="font-medium">{msg.replyTo.senderName}</span>
                        {": "}
                        {msg.replyTo.text}
                      </span>
                    </div>
                  )}

                  <div className="flex items-end gap-1">
                    {/* Message bubble */}
                    <div
                      className={`px-3 py-1.5 text-[13px] leading-relaxed ${
                        isMe
                          ? "bg-kick text-black rounded-2xl rounded-br-md"
                          : "bg-surface-hover text-foreground rounded-2xl rounded-bl-md"
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Reply button */}
                    <button
                      onClick={() => handleReply(msg)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
                      title="Yanıtla"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path d="M8 4L3 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 9h10a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Time */}
                  {msg.createdAt && (
                    <p className={`mt-0.5 text-[10px] text-muted-foreground ${isMe ? "text-right mr-1" : "ml-1"}`}>
                      {msg.createdAt.toDate().toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
