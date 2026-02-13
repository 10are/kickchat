"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { subscribeToMessages, ChatMessage } from "@/app/lib/firestore";

export default function MessageList({ conversationId }: { conversationId: string }) {
  const { kickUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToMessages(conversationId, setMessages);
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = msg.createdAt
      ? msg.createdAt.toDate().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
      : "Bugün";
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 w-2 bg-kick" style={{ opacity: 0.2 + i * 0.2 }} />
            ))}
          </div>
          <p className="text-sm">Henüz mesaj yok</p>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-kick">
            İlk mesajı sen gönder!
          </p>
        </div>
      )}

      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 h-px bg-border" />
            <span className="font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Messages */}
          <div className="space-y-1">
            {group.messages.map((msg, idx) => {
              const isMe = msg.senderId === kickUser?.uid;
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const isConsecutive = prevMsg?.senderId === msg.senderId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} ${isConsecutive ? "" : "mt-3"}`}
                >
                  <div
                    className={`relative max-w-[70%] px-4 py-2 ${
                      isMe
                        ? "bg-kick text-black rounded-2xl rounded-br-sm"
                        : "bg-surface-hover text-foreground rounded-2xl rounded-bl-sm"
                    }`}
                  >
                    <p className="break-words text-sm leading-relaxed">{msg.text}</p>
                    {msg.createdAt && (
                      <p
                        className={`mt-1 text-[10px] ${
                          isMe ? "text-kick-dark" : "text-muted-foreground"
                        }`}
                      >
                        {msg.createdAt.toDate().toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
