"use client";

import { useAuth } from "@/app/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import MainNav from "@/app/components/MainNav";
import { subscribeToConversations, Conversation } from "@/app/lib/firestore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, kickUser, loading } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const seenTimesRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Track unread messages via title badge
  useEffect(() => {
    if (!kickUser?.uid) return;

    const unsub = subscribeToConversations(kickUser.uid, (conversations: Conversation[]) => {
      const seen = seenTimesRef.current;

      // First load: mark all current timestamps as seen
      if (!initializedRef.current) {
        conversations.forEach((conv) => {
          seen.set(conv.id, conv.lastMessageAt?.toMillis() || 0);
        });
        initializedRef.current = true;
        return;
      }

      // Count new messages from others since last seen
      let count = 0;
      conversations.forEach((conv) => {
        const convTime = conv.lastMessageAt?.toMillis() || 0;
        const seenTime = seen.get(conv.id) || 0;

        if (
          conv.lastMessageSenderId &&
          conv.lastMessageSenderId !== kickUser.uid &&
          convTime > seenTime
        ) {
          count++;
        }
      });

      setUnreadCount(count);

      // If page is visible, mark as seen
      if (!document.hidden) {
        conversations.forEach((conv) => {
          seen.set(conv.id, conv.lastMessageAt?.toMillis() || 0);
        });
        setUnreadCount(0);
      }
    });

    return () => unsub();
  }, [kickUser?.uid]);

  // Clear unread when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && unreadCount > 0) {
        setUnreadCount(0);
        // Mark all current as seen on next tick
        initializedRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [unreadCount]);

  // Update document title with unread badge
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) KickSocially` : "KickSocially";
  }, [unreadCount]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 bg-kick"
                style={{ animation: `pixel-blink 1s step-end ${i * 0.3}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <MainNav />
      <div className="flex flex-1 flex-col min-h-0">{children}</div>
    </div>
  );
}
