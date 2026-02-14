"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { createDramaEntry } from "@/app/lib/firestore";
import DramaClubSearch from "./DramaClubSearch";

interface DramaCreateEntryModalProps {
  club?: { slug: string; name: string; avatar: string | null } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DramaCreateEntryModal({
  club: preselectedClub,
  onClose,
  onSuccess,
}: DramaCreateEntryModalProps) {
  const { kickUser } = useAuth();
  const [selectedClub, setSelectedClub] = useState<{
    slug: string;
    name: string;
    avatar: string | null;
  } | null>(preselectedClub || null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!kickUser) {
      setError("Giris yapman gerekiyor.");
      return;
    }
    if (!selectedClub) {
      setError("Kulup secmelisin.");
      return;
    }
    if (!title.trim()) {
      setError("Baslik bos olamaz.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createDramaEntry(
        { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar || null },
        selectedClub,
        { title: title.trim(), body: body.trim() }
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Create entry error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Entry olusturulamadi: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-pixel)] text-xs text-kick">
            ENTRY OLUSTUR
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Club selector */}
        {!preselectedClub && !selectedClub && (
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Kulup Sec
            </label>
            <DramaClubSearch
              onSelect={(club) => setSelectedClub(club)}
              placeholder="Yayinci adi yaz..."
            />
          </div>
        )}

        {/* Selected club badge */}
        {selectedClub && !preselectedClub && (
          <div className="flex items-center gap-2 mb-4 rounded-lg border border-kick/20 bg-kick/5 px-3 py-2">
            {selectedClub.avatar ? (
              <img
                src={selectedClub.avatar}
                alt=""
                className="h-6 w-6 rounded-lg"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-[8px] font-bold text-red-400">
                {selectedClub.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm text-foreground font-medium flex-1">
              {selectedClub.name}
            </span>
            <button
              onClick={() => setSelectedClub(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Title input */}
        {selectedClub && (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">Baslik</label>
                <span
                  className={`text-[10px] ${
                    title.length > 180 ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {title.length}/200
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                placeholder="Entry basligi..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
                autoFocus
              />
            </div>

            {/* Body textarea */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">
                  Icerik <span className="text-muted">(opsiyonel)</span>
                </label>
                <span
                  className={`text-[10px] ${
                    body.length > 4500
                      ? "text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {body.length}/5000
                </span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 5000))}
                placeholder="Detay yaz... (opsiyonel)"
                rows={5}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-kick"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 mb-3">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="rounded-lg bg-kick px-4 py-2 text-sm font-medium text-black hover:bg-kick-hover transition-colors disabled:opacity-50"
              >
                {submitting ? "Gonderiliyor..." : "Gonder"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
