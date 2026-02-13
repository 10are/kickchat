"use client";

import ChatSidebar from "@/app/components/ChatSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0">
      <ChatSidebar />
      <div className="flex flex-1 flex-col min-h-0">{children}</div>
    </div>
  );
}
