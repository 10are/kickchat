import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://kick.com/api/v1/channels/${encodeURIComponent(slug.toLowerCase())}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ channel: null });
    }

    const data = await res.json();

    return NextResponse.json({
      channel: {
        slug: data.slug,
        username: data.user?.username || data.slug,
        avatar: data.user?.profile_pic || null,
        followersCount: data.followersCount || 0,
        isLive: !!data.livestream,
      },
    });
  } catch (err) {
    console.error("Kick channel lookup error:", err);
    return NextResponse.json({ channel: null });
  }
}
