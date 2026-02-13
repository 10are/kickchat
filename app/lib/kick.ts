import { Kick } from "arctic";

export const kick = new Kick(
  process.env.KICK_CLIENT_ID!,
  process.env.KICK_CLIENT_SECRET!,
  process.env.KICK_REDIRECT_URI!
);
