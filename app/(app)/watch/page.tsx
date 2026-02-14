"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db, Conversation } from "@/app/lib/firestore";
import MessageList from "@/app/components/MessageList";
import MessageInput from "@/app/components/MessageInput";

interface ReplyTo {
  id: string;
  text: string;
  senderName: string;
}

export default function WatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { kickUser } = useAuth();
  const convId = searchParams.get("conv") || "";

  const [streamUrl, setStreamUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [conv, setConv] = useState<Conversation | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to conversation
  useEffect(() => {
    if (!convId || !kickUser) return;
    const unsub = onSnapshot(doc(db, "conversations", convId), (snap) => {
      if (snap.exists()) {
        setConv({ id: snap.id, ...snap.data() } as Conversation);
      }
    });
    return () => unsub();
  }, [convId, kickUser]);

  // Parse stream URL to embed
  const parseStreamUrl = (url: string) => {
    try {
      const parsed = new URL(url);

      // Kick embed
      if (parsed.hostname.includes("kick.com")) {
        const channel = parsed.pathname.replace("/", "").split("/")[0];
        if (channel) return `https://player.kick.com/${channel}`;
      }

      // Twitch embed
      if (parsed.hostname.includes("twitch.tv")) {
        const channel = parsed.pathname.replace("/", "").split("/")[0];
        if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
      }

      // YouTube embed
      if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
        let videoId = "";
        if (parsed.hostname.includes("youtu.be")) {
          videoId = parsed.pathname.slice(1);
        } else {
          videoId = parsed.searchParams.get("v") || "";
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      // Direct iframe URL
      return url;
    } catch {
      return "";
    }
  };

  const handleSetStream = () => {
    if (!inputUrl.trim()) return;
    const embed = parseStreamUrl(inputUrl.trim());
    if (embed) {
      setStreamUrl(inputUrl.trim());
      setEmbedUrl(embed);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const otherId = conv?.participants.find((p) => p !== kickUser?.uid);
  const otherUsername = otherId ? conv?.participantUsernames?.[otherId] || "?" : "?";

  return (
    <div ref={containerRef} className="flex flex-1 flex-col min-h-0 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0 bg-surface">
        <button
          onClick={() => router.push(convId ? `/chat/${convId}` : "/chat")}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-kick shrink-0">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8l4 2.5-4 2.5V8z" fill="currentColor" />
          </svg>
          <span className="font-[family-name:var(--font-pixel)] text-[10px] text-foreground truncate">
            {streamUrl ? "YAYIN IZLE" : "YAYIN LINKI EKLE"}
          </span>
          {conv && (
            <span className="font-[family-name:var(--font-pixel)] text-[8px] text-muted-foreground">
              • {otherUsername} ile
            </span>
          )}
        </div>

        {embedUrl && (
          <>
            <button
              onClick={() => setChatCollapsed(!chatCollapsed)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
              title={chatCollapsed ? "Chati göster" : "Chati gizle"}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M18 10c0 4.418-3.582 7-8 7a9.06 9.06 0 01-3-.5L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" stroke="currentColor" strokeWidth="2" />
                {chatCollapsed && <path d="M6 10h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
              </svg>
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
              title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                {isFullscreen ? (
                  <>
                    <path d="M4 12h4v4M16 8h-4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  <>
                    <path d="M4 8V4h4M16 12v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Stream area */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          {!embedUrl ? (
            /* URL input */
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="w-full max-w-md text-center">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-surface-hover mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-kick">
                    <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M9.5 8.5l5 3.5-5 3.5v-7z" fill="currentColor" />
                  </svg>
                </div>
                <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-foreground mb-2">
                  YAYIN IZLERKEN KONUS
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Kick, Twitch veya YouTube yayın linkini yapıştır
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetStream()}
                    placeholder="https://kick.com/kanal-adi"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                    autoFocus
                  />
                  <button
                    onClick={handleSetStream}
                    className="rounded-lg bg-kick px-4 py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover transition-colors"
                  >
                    IZLE
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="font-[family-name:var(--font-pixel)] text-[7px] text-muted-foreground">DESTEKLENEN:</span>
                  <span className="font-[family-name:var(--font-pixel)] text-[7px] text-kick">KICK</span>
                  <span className="font-[family-name:var(--font-pixel)] text-[7px] text-purple-400">TWITCH</span>
                  <span className="font-[family-name:var(--font-pixel)] text-[7px] text-red-400">YOUTUBE</span>
                </div>
              </div>
            </div>
          ) : (
            /* Stream iframe */
            <div className="flex-1 min-h-0 bg-black relative">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                frameBorder="0"
              />
              {/* Change stream overlay */}
              <button
                onClick={() => { setEmbedUrl(""); setStreamUrl(""); setInputUrl(""); }}
                className="absolute top-2 left-2 z-10 rounded-lg bg-black/60 px-2 py-1 font-[family-name:var(--font-pixel)] text-[7px] text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
              >
                YAYIN DEGISTIR
              </button>
            </div>
          )}
        </div>

        {/* Chat panel (right side) */}
        {conv && !chatCollapsed && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
            {/* Chat header mini */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
              <span className="font-[family-name:var(--font-pixel)] text-[8px] text-kick flex-1">
                SOHBET
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {otherUsername}
              </span>
            </div>

            {/* Messages */}
            <MessageList
              conversationId={convId}
              participantUsernames={conv.participantUsernames || {}}
              participantAvatars={conv.participantAvatars || {}}
              onReply={setReplyTo}
            />

            {/* Input */}
            <MessageInput
              conversationId={convId}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </div>
        )}

        {/* Chat collapsed indicator */}
        {conv && chatCollapsed && embedUrl && (
          <button
            onClick={() => setChatCollapsed(false)}
            className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-kick text-black shadow-lg hover:bg-kick-hover transition-colors"
            title="Chati aç"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M18 10c0 4.418-3.582 7-8 7a9.06 9.06 0 01-3-.5L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        )}
      </div>

      {/* No conversation selected */}
      {!conv && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Önce bir sohbet seçmelisin</p>
            <button
              onClick={() => router.push("/chat")}
              className="rounded-lg bg-kick px-4 py-2 text-sm font-medium text-black hover:bg-kick-hover transition-colors"
            >
              Sohbetlere Git
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
