"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { subscribeToMessages, ChatMessage } from "@/app/lib/firestore";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToMessages(conversationId, setMessages);
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReply = (msg: ChatMessage) => {
    const senderName = participantUsernames[msg.senderId] || "?";
    onReply({
      id: msg.id,
      text: msg.text.length > 80 ? msg.text.slice(0, 80) + "..." : msg.text,
      senderName,
    });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Henüz mesaj yok</p>
        </div>
      )}

      <div className="space-y-0.5">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === kickUser?.uid;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
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
