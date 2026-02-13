"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { createLfgPost, updateLfgPost, LfgPost } from "@/app/lib/firestore";

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Mobile", "Hepsi"] as const;
const LANGUAGES = ["Türkçe", "English", "Deutsch", "Français", "Español", "Diğer"] as const;
const MAX_DESC = 500;
const MAX_RANK = 50;

interface Props {
  category: { id: number; name: string; slug: string; banner: string | null };
  editingPost?: LfgPost | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LfgCreateModal({ category, editingPost, onClose, onSuccess }: Props) {
  const { kickUser } = useAuth();
  const [description, setDescription] = useState(editingPost?.description || "");
  const [platform, setPlatform] = useState(editingPost?.platform || "PC");
  const [language, setLanguage] = useState(editingPost?.language || "Türkçe");
  const [rank, setRank] = useState(editingPost?.rank || "");
  const [micRequired, setMicRequired] = useState(editingPost?.micRequired || false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editingPost;

  const handleSubmit = async () => {
    if (!kickUser || !description.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (isEditing) {
        await updateLfgPost(editingPost.id, {
          description: description.trim(),
          platform,
          language,
          rank: rank.trim(),
          micRequired,
        });
      } else {
        await createLfgPost(
          { uid: kickUser.uid, username: kickUser.username, avatar: kickUser.avatar },
          category,
          {
            description: description.trim(),
            platform,
            language,
            rank: rank.trim(),
            micRequired,
          }
        );
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {isEditing ? "İlanı Düzenle" : "İlan Oluştur"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{category.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-5 py-4">
          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Ne tür bir oyun arkadaşı arıyorsun? Detay ver..."
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-kick focus:outline-none transition-colors"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${description.length > MAX_DESC * 0.9 ? "text-red-400" : "text-muted-foreground"}`}>
                {description.length}/{MAX_DESC}
              </span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Platform
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    platform === p
                      ? "bg-kick text-black"
                      : "border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Dil
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    language === l
                      ? "bg-kick text-black"
                      : "border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Rank */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rank / Seviye (opsiyonel)
            </label>
            <input
              type="text"
              value={rank}
              onChange={(e) => setRank(e.target.value.slice(0, MAX_RANK))}
              placeholder="Diamond 2, Gold, MG2..."
              className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-kick focus:outline-none transition-colors"
            />
          </div>

          {/* Mic Required */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Mikrofon Gerekli</p>
              <p className="text-[10px] text-muted-foreground">Sesli iletişim zorunlu mu?</p>
            </div>
            <button
              onClick={() => setMicRequired(!micRequired)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                micRequired ? "bg-kick" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  micRequired ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="flex-1 rounded-xl bg-kick px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-kick-hover disabled:opacity-50"
          >
            {submitting ? "..." : isEditing ? "Kaydet" : "İlan Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
