import { kick } from "@/app/lib/kick";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("kick_oauth_state")?.value;
  const codeVerifier = cookieStore.get("kick_code_verifier")?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  try {
    const tokens = await kick.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch Kick user profile
    const userResponse = await fetch("https://api.kick.com/public/v1/users", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL("/?error=kick_api_error", request.url));
    }

    const userData = await userResponse.json();
    const kickUser = userData.data?.[0] || userData.data || userData;

    const kickUserId = String(kickUser.user_id || kickUser.id);
    const username = kickUser.username || kickUser.name || "unknown";
    const avatar = kickUser.profile_picture || kickUser.profile_pic || null;

    // Save/update user in Firestore
    await getAdminDb().collection("users").doc(kickUserId).set(
      {
        username,
        avatar,
        kickUserId,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Create Firebase custom token
    const firebaseToken = await getAdminAuth().createCustomToken(kickUserId, {
      kickUsername: username,
    });

    // Set token in cookie for client-side Firebase auth
    cookieStore.set("firebase_token", firebaseToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    });

    // Also pass kick user info for immediate client use
    cookieStore.set(
      "kick_user",
      JSON.stringify({ uid: kickUserId, username, avatar }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60,
        path: "/",
        sameSite: "lax",
      }
    );

    // Clean up OAuth cookies
    cookieStore.delete("kick_oauth_state");
    cookieStore.delete("kick_code_verifier");

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Kick OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
