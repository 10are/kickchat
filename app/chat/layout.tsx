"use client";

import { useAuth } from "@/app/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ChatSidebar from "@/app/components/ChatSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

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
      <ChatSidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
