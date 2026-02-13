import { generateState, generateCodeVerifier } from "arctic";
import { kick } from "@/app/lib/kick";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = kick.createAuthorizationURL(state, codeVerifier, ["user:read"]);

  const cookieStore = await cookies();

  cookieStore.set("kick_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
  });

  cookieStore.set("kick_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
  });

  return NextResponse.redirect(url);
}
