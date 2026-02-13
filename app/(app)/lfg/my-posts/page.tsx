"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import {
  subscribeToMyLfgPosts,
  deleteLfgPost,
  refreshLfgPost,
  LfgPost,
} from "@/app/lib/firestore";
import LfgPostCard from "@/app/components/LfgPostCard";
import LfgCreateModal from "@/app/components/LfgCreateModal";

export default function MyPostsPage() {
  const { kickUser } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<LfgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<LfgPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!kickUser?.uid) return;
    const unsub = subscribeToMyLfgPosts(kickUser.uid, (p) => {
      setPosts(p);
      setLoading(false);
    });
    return () => unsub();
  }, [kickUser?.uid]);

  const handleDelete = async (postId: string) => {
    if (deleteConfirm !== postId) {
      setDeleteConfirm(postId);
      return;
    }
    try {
      await deleteLfgPost(postId);
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleteConfirm(null);
  };

  const handleRefresh = async (postId: string) => {
    try {
      await refreshLfgPost(postId);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  const activePosts = posts.filter(
    (p) => p.status === "active" && p.expiresAt && p.expiresAt.toMillis() > Date.now()
  );
  const expiredPosts = posts.filter(
    (p) => p.status === "deleted" || (p.expiresAt && p.expiresAt.toMillis() <= Date.now())
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/lfg")}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">İlanlarım</h1>
            <p className="text-xs text-muted-foreground">
              {activePosts.length}/3 aktif ilan
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-hover mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                <path d="M4 4h12M4 8h12M4 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Henüz ilan oluşturmadın</p>
            <p className="text-xs text-muted-foreground mb-4">
              Bir oyun kategorisi seç ve ilan oluştur
            </p>
            <button
              onClick={() => router.push("/lfg")}
              className="font-[family-name:var(--font-pixel)] text-[10px] text-kick hover:underline"
            >
              KATEGORİLERE GİT
            </button>
          </div>
        )}

        {/* Active Posts */}
        {activePosts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Aktif İlanlar
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {activePosts.map((post) => (
                <div key={post.id} className="relative">
                  <LfgPostCard
                    post={post}
                    showActions
                    onEdit={(p) => setEditingPost(p)}
                    onDelete={handleDelete}
                    onRefresh={handleRefresh}
                  />
                  {deleteConfirm === post.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm">
                      <div className="text-center">
                        <p className="text-sm text-foreground mb-3">İlanı silmek istediğine emin misin?</p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600"
                          >
                            Evet, Sil
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired/Deleted Posts */}
        {expiredPosts.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Süresi Dolmuş
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {expiredPosts.map((post) => (
                <LfgPostCard key={post.id} post={post} showActions />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <LfgCreateModal
          category={{
            id: editingPost.categoryId,
            name: editingPost.categoryName,
            slug: editingPost.categorySlug,
            banner: editingPost.categoryBanner,
          }}
          editingPost={editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={() => setEditingPost(null)}
        />
      )}
    </div>
  );
}
