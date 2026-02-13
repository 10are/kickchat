"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db, Conversation } from "@/app/lib/firestore";
import MessageList from "@/app/components/MessageList";
import MessageInput from "@/app/components/MessageInput";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { kickUser } = useAuth();
  const [otherUsername, setOtherUsername] = useState("");
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!kickUser) return;

    const fetchConv = async () => {
      const convDoc = await getDoc(doc(db, "conversations", conversationId));
      if (convDoc.exists()) {
        const data = convDoc.data() as Conversation;
        const otherId = data.participants.find((p) => p !== kickUser.uid);
        if (otherId) {
          setOtherUsername(data.participantUsernames?.[otherId] || "?");
          setOtherAvatar(data.participantAvatars?.[otherId] || null);
        }
      }
    };

    fetchConv();
  }, [conversationId, kickUser]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="relative">
          {otherAvatar ? (
            <img src={otherAvatar} alt="" className="h-9 w-9 rounded-lg" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-[family-name:var(--font-pixel)] text-xs text-foreground">
              {otherUsername[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <span className="font-semibold text-foreground text-sm">{otherUsername}</span>
        </div>
        {/* Pixel decoration */}
        <div className="ml-auto flex gap-0.5">
          {[1, 1, 0, 1, 1].map((on, i) => (
            <div key={i} className={`h-1.5 w-1.5 ${on ? "bg-kick opacity-30" : "bg-transparent"}`} />
          ))}
        </div>
      </div>

      {/* Messages */}
      <MessageList conversationId={conversationId} />

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
