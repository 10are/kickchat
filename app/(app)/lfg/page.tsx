"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface KickCategory {
  id: number;
  name: string;
  slug: string;
  tags: string[];
  description: string | null;
  banner: { responsive: string; url: string } | null;
  category: { id: number; name: string; slug: string } | null;
}

export default function LFGPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<KickCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await fetch(`/api/categories?page=${pageNum}&limit=20`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const items: KickCategory[] = data.data || [];
      if (pageNum >= (data.last_page || 1)) setHasMore(false);
      setCategories((prev) => append ? [...prev, ...items] : items);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories(1);
  }, [fetchCategories]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchCategories(page + 1, true);
  }, [page, loadingMore, hasMore, fetchCategories]);

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

  const filtered = search
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : categories;

  const getBannerUrl = (cat: KickCategory) => {
    if (!cat.banner) return "";
    if (cat.banner.responsive) {
      // responsive is srcset format: "url1 600w, url2 501w, ..."
      const first = cat.banner.responsive.split(",")[0]?.trim().split(" ")[0];
      if (first) return first;
    }
    return cat.banner.url || "";
  };

  const handleCategoryClick = (cat: KickCategory) => {
    const bannerUrl = getBannerUrl(cat);
    router.push(
      `/lfg/${cat.slug}?cid=${cat.id}&name=${encodeURIComponent(cat.name)}&banner=${encodeURIComponent(bannerUrl)}`
    );
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
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Oyun Arkadaşı Bul
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bir oyun kategorisi seç ve birlikte oynayacak arkadaş bul
            </p>
          </div>
          <button
            onClick={() => router.push("/lfg/my-posts")}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-kick"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M4 4h12M4 8h12M4 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            İlanlarım
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Oyun ara..."
            className="w-full rounded-xl border border-border bg-surface-hover px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-kick focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "Sonuç bulunamadı" : "Kategori bulunamadı"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-kick hover:shadow-lg hover:shadow-kick/5"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-hover">
                {cat.banner?.url ? (
                  <img
                    src={cat.banner.url}
                    srcSet={cat.banner.responsive || undefined}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="font-[family-name:var(--font-pixel)] text-[9px] text-kick">
                    ARKADAŞ BUL
                  </span>
                </div>
              </div>
              <div className="px-2 py-2">
                <p className="text-xs font-medium text-foreground truncate">{cat.name}</p>
                {cat.category && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {cat.category.name}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {hasMore && (
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
    </div>
  );
}
