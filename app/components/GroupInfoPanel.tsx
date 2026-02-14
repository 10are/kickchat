"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  Conversation,
  searchUsers,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  updateGroupName,
  UserProfile,
} from "@/app/lib/firestore";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function GroupInfoPanel({ conversation, onClose }: Props) {
  const { kickUser } = useAuth();
  const router = useRouter();
  const isAdmin = kickUser?.uid === conversation.adminId;

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.groupName || "");
  const [savingName, setSavingName] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState<string | null>(null);

  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  const members = conversation.participants.map((uid) => ({
    uid,
    username: conversation.participantUsernames[uid] || "?",
    avatar: conversation.participantAvatars[uid] || null,
    isAdmin: uid === conversation.adminId,
  }));

  const handleSaveName = async () => {
    if (!kickUser || !newName.trim()) return;
    setSavingName(true);
    try {
      await updateGroupName(conversation.id, kickUser.uid, newName.trim());
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
    setSavingName(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(
        results.filter(
          (u) =>
            u.kickUserId !== kickUser?.uid &&
            !conversation.participants.includes(u.kickUserId)
        )
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleAddMember = async (user: UserProfile) => {
    if (!kickUser) return;
    setAddingMember(user.kickUserId);
    setError("");
    try {
      await addGroupMember(conversation.id, kickUser.uid, {
        uid: user.kickUserId,
        username: user.username,
        avatar: user.avatar,
      });
      setSearchResults((prev) =>
        prev.filter((u) => u.kickUserId !== user.kickUserId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uye eklenemedi");
    }
    setAddingMember(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!kickUser) return;
    setRemovingMember(memberId);
    setError("");
    try {
      await removeGroupMember(conversation.id, kickUser.uid, memberId);
      setConfirmRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uye cikarilmadi");
    }
    setRemovingMember(null);
  };

  const handleLeave = async () => {
    if (!kickUser) return;
    setLeaving(true);
    setError("");
    try {
      await leaveGroup(conversation.id, kickUser.uid);
      onClose();
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gruptan ayrilamadi");
    }
    setLeaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="font-[family-name:var(--font-pixel)] text-[10px] text-kick">
            GRUP BILGI
          </h2>
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

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Group name */}
          <div className="px-5 py-4 border-b border-border">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 50))}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-kick"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !newName.trim()}
                  className="rounded-lg bg-kick px-3 py-2 text-xs text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
                >
                  {savingName ? "..." : "Kaydet"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNewName(conversation.groupName || "");
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
                >
                  Iptal
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kick/10 text-kick shrink-0">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M14 15v-1a3 3 0 00-3-3H7a3 3 0 00-3 3v1M9 8a3 3 0 100-6 3 3 0 000 6zM17 15v-1a3 3 0 00-2-2.83M14 3.17a3 3 0 010 5.66"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {conversation.groupName || "Grup"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {conversation.participants.length} uye
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Grup adini duzenle"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M14.5 2.5a2.121 2.121 0 013 3L7 16l-4 1 1-4 10.5-10.5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="px-5 py-3">
            <p className="text-[10px] text-muted-foreground mb-2">
              UYELER ({members.length}/5)
            </p>
            <div className="space-y-1">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                      className="h-8 w-8 rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground shrink-0">
                      {member.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-foreground truncate">
                        {member.username}
                      </span>
                      {member.isAdmin && (
                        <span className="text-[7px] font-bold text-kick bg-kick/10 px-1.5 py-0.5 rounded">
                          ADMIN
                        </span>
                      )}
                      {member.uid === kickUser?.uid && (
                        <span className="text-[9px] text-muted-foreground">
                          (sen)
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin &&
                    member.uid !== kickUser?.uid &&
                    (confirmRemove === member.uid ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleRemoveMember(member.uid)
                          }
                          disabled={removingMember === member.uid}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          {removingMember === member.uid
                            ? "..."
                            : "Cikar"}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Iptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.uid)}
                        className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        Cikar
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Add member (admin only, <5 members) */}
          {isAdmin && conversation.participants.length < 5 && (
            <div className="px-5 py-3 border-t border-border">
              {showAddMember ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearch()
                      }
                      placeholder="Kullanici ara..."
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                      autoFocus
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="rounded-lg bg-kick px-3 py-2 text-xs text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
                    >
                      {searching ? "..." : "Ara"}
                    </button>
                  </div>
                  {searchResults.map((user) => (
                    <button
                      key={user.kickUserId}
                      onClick={() => handleAddMember(user)}
                      disabled={addingMember === user.kickUserId}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-7 w-7 rounded-lg"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                          {user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm text-foreground text-left truncate">
                        {user.username}
                      </span>
                      <span className="text-[10px] text-kick">
                        {addingMember === user.kickUserId
                          ? "..."
                          : "Ekle"}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-hover transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kick/10 text-kick">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 4v12M4 10h12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-kick">Uye Ekle</span>
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-5 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Leave group */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          {confirmLeave ? (
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs text-muted-foreground">
                Emin misin?
              </span>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                {leaving ? "..." : "Evet, ayril"}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Iptal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full rounded-xl border border-red-500/30 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Gruptan Ayril
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
