"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db, Conversation, subscribeToConversations, searchUsers, getOrCreateConversation, UserProfile } from "@/app/lib/firestore";
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
  const initialConvId = searchParams.get("conv") || "";

  const [activeConvId, setActiveConvId] = useState(initialConvId);
  const [streamUrl, setStreamUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [conv, setConv] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to all conversations (for the picker)
  useEffect(() => {
    if (!kickUser?.uid) return;
    const unsub = subscribeToConversations(kickUser.uid, setConversations);
    return () => unsub();
  }, [kickUser?.uid]);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeConvId || !kickUser) return;
    const unsub = onSnapshot(doc(db, "conversations", activeConvId), (snap) => {
      if (snap.exists()) {
        setConv({ id: snap.id, ...snap.data() } as Conversation);
      }
    });
    return () => unsub();
  }, [activeConvId, kickUser]);

  // Reset reply when switching conversations
  useEffect(() => {
    setReplyTo(null);
  }, [activeConvId]);

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

  const selectConversation = (id: string) => {
    setActiveConvId(id);
    setConv(null);
  };

  const handleUserSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const users = await searchUsers(searchQuery.trim());
      setSearchResults(users.filter((u) => u.kickUserId !== kickUser?.uid));
    } catch (err) {
      console.error("Search error:", err);
    }
    setSearching(false);
  };

  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!kickUser) return;
    const usernames = { [kickUser.uid]: kickUser.username, [targetUser.kickUserId]: targetUser.username };
    const avatars = { [kickUser.uid]: kickUser.avatar, [targetUser.kickUserId]: targetUser.avatar };
    const convId = await getOrCreateConversation(kickUser.uid, targetUser.kickUserId, usernames, avatars);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    selectConversation(convId);
  };

  return (
    <div ref={containerRef} className="flex flex-1 flex-col min-h-0 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0 bg-surface">
        <button
          onClick={() => router.push(activeConvId ? `/chat/${activeConvId}` : "/chat")}
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
                  <path d="M4 12h4v4M16 8h-4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 8V4h4M16 12v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Right panel - Chat or Conversation picker */}
        {!chatCollapsed && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
            {activeConvId && conv ? (
              <>
                {/* Chat header mini */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
                  <button
                    onClick={() => { setActiveConvId(""); setConv(null); }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="font-[family-name:var(--font-pixel)] text-[8px] text-kick flex-1">
                    SOHBET
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {otherUsername}
                  </span>
                </div>

                {/* Messages */}
                <MessageList
                  conversationId={activeConvId}
                  participantUsernames={conv.participantUsernames || {}}
                  participantAvatars={conv.participantAvatars || {}}
                  onReply={setReplyTo}
                />

                {/* Input */}
                <MessageInput
                  conversationId={activeConvId}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                />
              </>
            ) : (
              <>
                {/* Conversation list header */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
                  <span className="font-[family-name:var(--font-pixel)] text-[8px] text-kick flex-1">
                    SOHBET SEC
                  </span>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`rounded-lg p-1.5 transition-colors ${showSearch ? "text-kick bg-kick/10" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
                    title="Kullanıcı ara"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="2" />
                      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* User search */}
                {showSearch && (
                  <div className="border-b border-border px-3 py-2 bg-surface-hover space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                        placeholder="Kullanıcı adı..."
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                        autoFocus
                      />
                      <button
                        onClick={handleUserSearch}
                        disabled={searching}
                        className="rounded-lg bg-kick px-2.5 py-1.5 text-xs font-medium text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
                      >
                        {searching ? "..." : "Ara"}
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-0.5">
                        {searchResults.map((user) => (
                          <button
                            key={user.kickUserId}
                            onClick={() => handleStartChatWithUser(user)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-active transition-colors"
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="h-7 w-7 rounded-full shrink-0" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground shrink-0">
                                {user.username[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs text-foreground truncate">{user.username}</span>
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-kick shrink-0 ml-auto">
                              <path d="M18 10c0 4.418-3.582 7-8 7a9.06 9.06 0 01-3-.5L2 18l1.5-3.5C2.5 13.5 2 11.846 2 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.length === 0 && !searching && searchQuery && (
                      <p className="text-center text-[10px] text-muted-foreground py-1">Kullanıcı bulunamadı</p>
                    )}
                  </div>
                )}

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 && !showSearch ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-muted-foreground opacity-40">
                        <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-3.68-.71L3 21l1.87-3.75C3.69 15.73 3 14 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <p className="text-xs text-muted-foreground text-center">Henuz sohbet yok</p>
                      <button
                        onClick={() => router.push("/chat")}
                        className="rounded-lg bg-kick/10 px-3 py-1.5 font-[family-name:var(--font-pixel)] text-[8px] text-kick hover:bg-kick/20 transition-colors"
                      >
                        SOHBET BASLAT
                      </button>
                    </div>
                  ) : (
                    conversations.map((c) => {
                      const cOtherId = c.participants.find((p) => p !== kickUser?.uid);
                      const cUsername = cOtherId ? c.participantUsernames?.[cOtherId] || "?" : "?";
                      const cAvatar = cOtherId ? c.participantAvatars?.[cOtherId] || null : null;
                      const lastMsg = c.lastMessage || "";
                      const lastTime = c.lastMessageAt?.toDate?.();

                      return (
                        <button
                          key={c.id}
                          onClick={() => selectConversation(c.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover border-b border-border/50"
                        >
                          {cAvatar ? (
                            <img src={cAvatar} alt="" className="h-8 w-8 rounded-full shrink-0" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground shrink-0">
                              {cUsername[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground truncate">{cUsername}</span>
                              {lastTime && (
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {formatTime(lastTime)}
                                </span>
                              )}
                            </div>
                            {lastMsg && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat collapsed indicator */}
        {chatCollapsed && embedUrl && (
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
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
