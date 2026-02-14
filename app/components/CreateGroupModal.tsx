"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  searchUsers,
  createGroupConversation,
  UserProfile,
  Conversation,
  Friend,
} from "@/app/lib/firestore";

interface Props {
  onClose: () => void;
  conversations: Conversation[];
  friends: Friend[];
}

interface ContactItem {
  uid: string;
  username: string;
  avatar: string | null;
  source: "friend" | "chat";
}

export default function CreateGroupModal({ onClose, conversations, friends }: Props) {
  const { kickUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<
    { uid: string; username: string; avatar: string | null }[]
  >([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Build contacts list from conversations + friends (deduplicated)
  const contacts = useMemo(() => {
    if (!kickUser) return [];
    const map = new Map<string, ContactItem>();

    // Add friends first
    for (const f of friends) {
      map.set(f.oderId, {
        uid: f.oderId,
        username: f.username,
        avatar: f.avatar,
        source: "friend",
      });
    }

    // Add conversation participants (1:1 only)
    for (const conv of conversations) {
      if (conv.isGroup) continue;
      for (const pid of conv.participants) {
        if (pid === kickUser.uid) continue;
        if (!map.has(pid)) {
          map.set(pid, {
            uid: pid,
            username: conv.participantUsernames?.[pid] || "?",
            avatar: conv.participantAvatars?.[pid] || null,
            source: "chat",
          });
        }
      }
    }

    return Array.from(map.values());
  }, [kickUser, conversations, friends]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(
        results.filter((u) => u.kickUserId !== kickUser?.uid)
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const toggleMemberFromContact = (contact: ContactItem) => {
    const existing = selectedMembers.find((m) => m.uid === contact.uid);
    if (existing) {
      setSelectedMembers((prev) => prev.filter((m) => m.uid !== contact.uid));
    } else {
      if (selectedMembers.length >= 4) return;
      setSelectedMembers((prev) => [
        ...prev,
        { uid: contact.uid, username: contact.username, avatar: contact.avatar },
      ]);
    }
  };

  const toggleMember = (user: UserProfile) => {
    const existing = selectedMembers.find((m) => m.uid === user.kickUserId);
    if (existing) {
      setSelectedMembers((prev) =>
        prev.filter((m) => m.uid !== user.kickUserId)
      );
    } else {
      if (selectedMembers.length >= 4) return; // max 4 others + self = 5
      setSelectedMembers((prev) => [
        ...prev,
        {
          uid: user.kickUserId,
          username: user.username,
          avatar: user.avatar,
        },
      ]);
    }
  };

  const isSelected = (userId: string) =>
    selectedMembers.some((m) => m.uid === userId);

  const handleCreate = async () => {
    if (!kickUser || !groupName.trim() || selectedMembers.length === 0) return;
    setCreating(true);
    setError("");
    try {
      const convId = await createGroupConversation(
        {
          uid: kickUser.uid,
          username: kickUser.username,
          avatar: kickUser.avatar || null,
        },
        selectedMembers,
        groupName.trim()
      );
      onClose();
      router.push(`/chat/${convId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Grup olusturulamadi"
      );
    }
    setCreating(false);
  };

  // Filter contacts by search query (local filter)
  const filteredContacts = searchQuery.trim()
    ? contacts.filter((c) =>
        c.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : contacts;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M13 4l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <h2 className="font-[family-name:var(--font-pixel)] text-[10px] text-kick">
              {step === 1 ? "UYE SEC" : "GRUP OLUSTUR"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {selectedMembers.length + 1}/5
            </span>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {step === 1 ? (
          <>
            {/* Selected pills */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                {selectedMembers.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() =>
                      setSelectedMembers((prev) =>
                        prev.filter((p) => p.uid !== m.uid)
                      )
                    }
                    className="flex items-center gap-1.5 rounded-full bg-kick/10 px-2.5 py-1 text-xs text-kick hover:bg-kick/20 transition-colors"
                  >
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt=""
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-kick/20 text-[7px] font-bold text-kick">
                        {m.username[0]?.toUpperCase()}
                      </div>
                    )}
                    {m.username}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M6 6l8 8M14 6l-8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-5 pt-3 pb-2 shrink-0">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setHasSearched(false);
                      setSearchResults([]);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Ara veya kullanici adi yaz..."
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="rounded-lg bg-kick px-3 py-2 text-xs font-medium text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
                >
                  {searching ? "..." : "Ara"}
                </button>
              </div>
            </div>

            {/* Contacts + Search Results */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
              {/* Show contacts (friends & chat people) */}
              {filteredContacts.length > 0 && !hasSearched && (
                <div className="space-y-0.5">
                  {filteredContacts.some((c) => c.source === "friend") && (
                    <p className="text-[10px] text-muted-foreground px-1 pt-1 pb-1.5">
                      Arkadaslar
                    </p>
                  )}
                  {filteredContacts
                    .filter((c) => c.source === "friend")
                    .map((contact) => {
                      const selected = isSelected(contact.uid);
                      return (
                        <button
                          key={contact.uid}
                          onClick={() => toggleMemberFromContact(contact)}
                          disabled={!selected && selectedMembers.length >= 4}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "bg-kick/10 border border-kick/30"
                              : "hover:bg-surface-hover border border-transparent"
                          } disabled:opacity-30`}
                        >
                          {contact.avatar ? (
                            <img src={contact.avatar} alt="" className="h-8 w-8 rounded-lg" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                              {contact.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="flex-1 text-sm text-foreground truncate">
                            {contact.username}
                          </span>
                          {selected && (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-kick shrink-0">
                              <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                  {filteredContacts.some((c) => c.source === "chat") && (
                    <p className="text-[10px] text-muted-foreground px-1 pt-2 pb-1.5">
                      Sohbetler
                    </p>
                  )}
                  {filteredContacts
                    .filter((c) => c.source === "chat")
                    .map((contact) => {
                      const selected = isSelected(contact.uid);
                      return (
                        <button
                          key={contact.uid}
                          onClick={() => toggleMemberFromContact(contact)}
                          disabled={!selected && selectedMembers.length >= 4}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "bg-kick/10 border border-kick/30"
                              : "hover:bg-surface-hover border border-transparent"
                          } disabled:opacity-30`}
                        >
                          {contact.avatar ? (
                            <img src={contact.avatar} alt="" className="h-8 w-8 rounded-lg" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                              {contact.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="flex-1 text-sm text-foreground truncate">
                            {contact.username}
                          </span>
                          {selected && (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-kick shrink-0">
                              <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Filtered contacts when typing (local filter, no API search yet) */}
              {searchQuery.trim() && !hasSearched && filteredContacts.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center pt-2">
                  Enter ile tum kullanicilarda ara
                </p>
              )}

              {/* No contacts at all */}
              {contacts.length === 0 && !hasSearched && !searchQuery && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Kullanici adi yaz ve ara
                </p>
              )}

              {/* No filtered contacts */}
              {searchQuery.trim() && !hasSearched && filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Enter ile tum kullanicilarda ara
                </p>
              )}

              {/* API Search Results */}
              {hasSearched && (
                <div className="space-y-0.5">
                  {searchResults.length > 0 && (
                    <p className="text-[10px] text-muted-foreground px-1 pt-1 pb-1.5">
                      Arama sonuclari
                    </p>
                  )}
                  {searchResults.map((user) => {
                    const selected = isSelected(user.kickUserId);
                    return (
                      <button
                        key={user.kickUserId}
                        onClick={() => toggleMember(user)}
                        disabled={!selected && selectedMembers.length >= 4}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? "bg-kick/10 border border-kick/30"
                            : "hover:bg-surface-hover border border-transparent"
                        } disabled:opacity-30`}
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt=""
                            className="h-8 w-8 rounded-lg"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                            {user.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1 text-sm text-foreground truncate">
                          {user.username}
                        </span>
                        {selected && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-kick shrink-0"
                          >
                            <path
                              d="M4 10l4 4 8-8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  {searchResults.length === 0 && !searching && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Kullanici bulunamadi
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Continue button */}
            <div className="border-t border-border px-5 py-3 shrink-0">
              <button
                onClick={() => setStep(2)}
                disabled={selectedMembers.length === 0}
                className="w-full rounded-xl bg-kick py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover transition-colors disabled:opacity-30 active:scale-[0.98]"
              >
                DEVAM ({selectedMembers.length} kisi secildi)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Group name */}
            <div className="flex-1 px-5 py-5 space-y-4">
              {/* Members preview */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Uyeler ({selectedMembers.length + 1})
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Self */}
                  <div className="flex items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-1">
                    {kickUser?.avatar ? (
                      <img
                        src={kickUser.avatar}
                        alt=""
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-kick text-[7px] font-bold text-black">
                        {kickUser?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] text-foreground">
                      {kickUser?.username}
                    </span>
                    <span className="text-[8px] text-kick font-bold">
                      ADMIN
                    </span>
                  </div>
                  {selectedMembers.map((m) => (
                    <div
                      key={m.uid}
                      className="flex items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-1"
                    >
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt=""
                          className="h-4 w-4 rounded-full"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[7px] font-bold text-foreground">
                          {m.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] text-foreground">
                        {m.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group name input */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1.5 block">
                  Grup Adi
                </label>
                <input
                  value={groupName}
                  onChange={(e) =>
                    setGroupName(e.target.value.slice(0, 50))
                  }
                  placeholder="Grup adini yaz..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                  autoFocus
                />
                <p className="text-[9px] text-muted-foreground mt-1 text-right">
                  {groupName.length}/50
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>

            {/* Create button */}
            <div className="border-t border-border px-5 py-3 shrink-0">
              <button
                onClick={handleCreate}
                disabled={creating || !groupName.trim()}
                className="w-full rounded-xl bg-kick py-2.5 font-[family-name:var(--font-pixel)] text-[9px] text-black hover:bg-kick-hover transition-colors disabled:opacity-30 active:scale-[0.98]"
              >
                {creating ? "OLUSTURULUYOR..." : "GRUP OLUSTUR"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
