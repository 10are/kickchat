"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { subscribeToLfgPosts, loadMoreLfgPosts, LfgPost } from "@/app/lib/firestore";
import LfgPostCard from "@/app/components/LfgPostCard";
import LfgCreateModal from "@/app/components/LfgCreateModal";

export default function CategoryPostsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const categorySlug = params.categorySlug as string;
  const categoryId = Number(searchParams.get("cid") || "0");
  const categoryName = searchParams.get("name") || categorySlug;
  const categoryBanner = searchParams.get("banner") || null;

  const [posts, setPosts] = useState<LfgPost[]>([]);
  const [olderPosts, setOlderPosts] = useState<LfgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Subscribe to latest posts
  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    setOlderPosts([]);
    setHasMore(true);
    const unsub = subscribeToLfgPosts(categoryId, (newPosts) => {
      setPosts(newPosts);
      setLoading(false);
    });
    return () => unsub();
  }, [categoryId]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const allPosts = [...posts, ...olderPosts];
    const last = allPosts[allPosts.length - 1];
    if (!last?.expiresAt) return;

    setLoadingMore(true);
    try {
      const older = await loadMoreLfgPosts(categoryId, last.expiresAt);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setOlderPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOlder = older.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newOlder];
        });
      }
    } catch (err) {
      console.error("Load more LFG posts error:", err);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts, olderPosts, categoryId]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  // Deduplicate
  const allPosts = [...posts, ...olderPosts];
  const seen = new Set<string>();
  const uniquePosts = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const category = {
    id: categoryId,
    name: categoryName,
    slug: categorySlug,
    banner: categoryBanner,
  };

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
      <div className="border-b border-border">
        {/* Banner */}
        {categoryBanner && (
          <div className="relative h-28 overflow-hidden">
            <img
              src={categoryBanner}
              alt={categoryName}
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          </div>
        )}

        <div className={`flex items-center justify-between px-6 ${categoryBanner ? "-mt-10 relative z-10 pb-4" : "py-4"}`}>
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
              <h1 className="text-lg font-bold text-foreground">{categoryName}</h1>
              <p className="text-xs text-muted-foreground">
                {uniquePosts.length} aktif ilan
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-kick px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-kick-hover"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            İlan Oluştur
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {uniquePosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-hover mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Bu oyun için henüz ilan yok
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              İlk ilanı sen oluştur!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="font-[family-name:var(--font-pixel)] text-[10px] text-kick hover:underline"
            >
              İLAN OLUŞTUR
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {uniquePosts.map((post) => (
            <LfgPostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Load more sentinel */}
        {hasMore && uniquePosts.length > 0 && (
          <div ref={observerRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 bg-kick"
                    style={{ animation: `pixel-blink 1s step-end ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <LfgCreateModal
          category={category}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
