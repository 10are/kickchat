import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  updateDoc,
  deleteDoc,
  limitToLast,
  limit,
  endBefore,
  startAfter,
} from "firebase/firestore";
import { app } from "@/app/firebase";

const db = getFirestore(app);

// ── Types ──

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  read: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantUsernames: Record<string, string>;
  participantAvatars: Record<string, string | null>;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
}

export interface UserProfile {
  kickUserId: string;
  username: string;
  avatar: string | null;
  lastSeen: Timestamp | null;
  online?: boolean;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromUsername: string;
  fromAvatar: string | null;
  toId: string;
  toUsername: string;
  toAvatar: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp | null;
}

export interface Friend {
  id: string;
  oderId: string;
  username: string;
  avatar: string | null;
  addedAt: Timestamp | null;
}

export interface BlockedUser {
  id: string;
  blockedId: string;
  username: string;
  avatar: string | null;
  blockedAt: Timestamp | null;
}

// ── Friend System ──

export async function sendFriendRequest(
  from: { uid: string; username: string; avatar: string | null },
  to: { kickUserId: string; username: string; avatar: string | null }
) {
  // Check if blocked
  const blockedDoc = await getDoc(doc(db, "users", from.uid, "blocked", to.kickUserId));
  if (blockedDoc.exists()) return;

  // Check if request already exists
  const q = query(
    collection(db, "friendRequests"),
    where("fromId", "==", from.uid),
    where("toId", "==", to.kickUserId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return;

  // Check reverse direction
  const q2 = query(
    collection(db, "friendRequests"),
    where("fromId", "==", to.kickUserId),
    where("toId", "==", from.uid)
  );
  const existing2 = await getDocs(q2);
  if (!existing2.empty) return;

  // Check if already friends
  const friendDoc = await getDoc(doc(db, "users", from.uid, "friends", to.kickUserId));
  if (friendDoc.exists()) return;

  await addDoc(collection(db, "friendRequests"), {
    fromId: from.uid,
    fromUsername: from.username,
    fromAvatar: from.avatar,
    toId: to.kickUserId,
    toUsername: to.username,
    toAvatar: to.avatar,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(requestId: string, request: FriendRequest) {
  // Update request status
  await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });

  // Add to both users' friends subcollection
  await setDoc(doc(db, "users", request.fromId, "friends", request.toId), {
    oderId: request.toId,
    username: request.toUsername,
    avatar: request.toAvatar,
    addedAt: serverTimestamp(),
  });

  await setDoc(doc(db, "users", request.toId, "friends", request.fromId), {
    oderId: request.fromId,
    username: request.fromUsername,
    avatar: request.fromAvatar,
    addedAt: serverTimestamp(),
  });
}

export async function rejectFriendRequest(requestId: string) {
  await deleteDoc(doc(db, "friendRequests", requestId));
}

export function subscribeToPendingRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
) {
  const q = query(
    collection(db, "friendRequests"),
    where("toId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FriendRequest[];
    callback(requests);
  });
}

export function subscribeToFriends(
  userId: string,
  callback: (friends: Friend[]) => void
) {
  const q = query(collection(db, "users", userId, "friends"));

  return onSnapshot(q, (snapshot) => {
    const friends = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Friend[];
    callback(friends);
  });
}

export async function removeFriend(userId: string, friendId: string) {
  await deleteDoc(doc(db, "users", userId, "friends", friendId));
  await deleteDoc(doc(db, "users", friendId, "friends", userId));
}

// ── Conversations ──

export async function getOrCreateConversation(
  userId1: string,
  userId2: string,
  usernames: Record<string, string>,
  avatars: Record<string, string | null>
): Promise<string> {
  const convsRef = collection(db, "conversations");
  const q = query(convsRef, where("participants", "array-contains", userId1));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.participants.includes(userId2)) {
      return docSnap.id;
    }
  }

  const newConv = await addDoc(convsRef, {
    participants: [userId1, userId2],
    participantUsernames: usernames,
    participantAvatars: avatars,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });

  return newConv.id;
}

export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
) {
  // Use simple query without orderBy to avoid composite index requirement
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Conversation))
        .sort((a, b) => {
          const aTime = a.lastMessageAt?.toMillis() || 0;
          const bTime = b.lastMessageAt?.toMillis() || 0;
          return bTime - aTime;
        });
      callback(conversations);
    },
    (error) => {
      console.error("Conversations subscription error:", error);
      callback([]);
    }
  );
}

// ── Messages ──

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  replyTo?: { id: string; text: string; senderName: string } | null
) {
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const messageData: Record<string, unknown> = {
    senderId,
    text,
    createdAt: serverTimestamp(),
    read: false,
  };

  if (replyTo) {
    messageData.replyTo = replyTo;
  }

  await addDoc(messagesRef, messageData);

  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
}

const MESSAGES_PER_PAGE = 30;

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limitToLast(MESSAGES_PER_PAGE)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ChatMessage[];
    callback(messages);
  });
}

export async function loadOlderMessages(
  conversationId: string,
  oldestTimestamp: Timestamp
): Promise<ChatMessage[]> {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    endBefore(oldestTimestamp),
    limitToLast(MESSAGES_PER_PAGE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ChatMessage[];
}

// ── Users ──

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("username", ">=", searchTerm.toLowerCase()),
    where("username", "<=", searchTerm.toLowerCase() + "\uf8ff")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as UserProfile);
}

export async function updateOnlineStatus(userId: string, online: boolean) {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    { online, lastSeen: serverTimestamp() },
    { merge: true }
  );
}

// ── Block System ──

export async function blockUser(
  userId: string,
  target: { kickUserId: string; username: string; avatar: string | null }
) {
  await setDoc(doc(db, "users", userId, "blocked", target.kickUserId), {
    blockedId: target.kickUserId,
    username: target.username,
    avatar: target.avatar,
    blockedAt: serverTimestamp(),
  });

  // Also remove from friends if they were friends
  const friendDoc = await getDoc(doc(db, "users", userId, "friends", target.kickUserId));
  if (friendDoc.exists()) {
    await deleteDoc(doc(db, "users", userId, "friends", target.kickUserId));
    await deleteDoc(doc(db, "users", target.kickUserId, "friends", userId));
  }
}

export async function unblockUser(userId: string, blockedId: string) {
  await deleteDoc(doc(db, "users", userId, "blocked", blockedId));
}

export function subscribeToBlockedUsers(
  userId: string,
  callback: (blocked: BlockedUser[]) => void
) {
  const q = query(collection(db, "users", userId, "blocked"));
  return onSnapshot(q, (snapshot) => {
    const blocked = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as BlockedUser[];
    callback(blocked);
  });
}

export async function isBlockedByMe(userId: string, otherId: string): Promise<boolean> {
  const docSnap = await getDoc(doc(db, "users", userId, "blocked", otherId));
  return docSnap.exists();
}

// ── LFG System ──

export interface LfgPost {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryBanner: string | null;
  description: string;
  platform: string;
  language: string;
  rank: string;
  micRequired: boolean;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
  updatedAt: Timestamp | null;
  status: "active" | "deleted";
}

const LFG_POSTS_PER_PAGE = 20;
const LFG_TTL_HOURS = 4;
const MAX_ACTIVE_POSTS = 3;

export async function createLfgPost(
  author: { uid: string; username: string; avatar: string | null },
  category: { id: number; name: string; slug: string; banner: string | null },
  post: { description: string; platform: string; language: string; rank: string; micRequired: boolean }
): Promise<string> {
  // Check active post limit
  const countQ = query(
    collection(db, "lfgPosts"),
    where("authorId", "==", author.uid),
    where("status", "==", "active"),
    where("expiresAt", ">", Timestamp.now())
  );
  const countSnap = await getDocs(countQ);
  if (countSnap.size >= MAX_ACTIVE_POSTS) {
    throw new Error("Maksimum aktif ilan sayısına ulaştınız (3)");
  }

  const expiresAt = new Date(Date.now() + LFG_TTL_HOURS * 60 * 60 * 1000);

  const docRef = await addDoc(collection(db, "lfgPosts"), {
    authorId: author.uid,
    authorUsername: author.username,
    authorAvatar: author.avatar,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryBanner: category.banner,
    description: post.description.slice(0, 500),
    platform: post.platform,
    language: post.language,
    rank: post.rank.slice(0, 50),
    micRequired: post.micRequired,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
    status: "active",
  });

  return docRef.id;
}

export function subscribeToLfgPosts(
  categoryId: number,
  callback: (posts: LfgPost[]) => void
): () => void {
  const now = Timestamp.now();
  const q = query(
    collection(db, "lfgPosts"),
    where("categoryId", "==", categoryId),
    where("status", "==", "active"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc"),
    limit(LFG_POSTS_PER_PAGE)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as LfgPost))
        .filter((p) => p.expiresAt && p.expiresAt.toMillis() > Date.now());
      callback(posts);
    },
    (error) => {
      console.error("LFG posts subscription error:", error);
      callback([]);
    }
  );
}

export async function loadMoreLfgPosts(
  categoryId: number,
  lastExpiresAt: Timestamp
): Promise<LfgPost[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, "lfgPosts"),
    where("categoryId", "==", categoryId),
    where("status", "==", "active"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc"),
    startAfter(lastExpiresAt),
    limit(LFG_POSTS_PER_PAGE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as LfgPost[];
}

export function subscribeToMyLfgPosts(
  userId: string,
  callback: (posts: LfgPost[]) => void
): () => void {
  const q = query(
    collection(db, "lfgPosts"),
    where("authorId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LfgPost[];
      callback(posts);
    },
    (error) => {
      console.error("My LFG posts subscription error:", error);
      callback([]);
    }
  );
}

export async function updateLfgPost(
  postId: string,
  updates: Partial<Pick<LfgPost, "description" | "platform" | "language" | "rank" | "micRequired">>
): Promise<void> {
  await updateDoc(doc(db, "lfgPosts", postId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLfgPost(postId: string): Promise<void> {
  await updateDoc(doc(db, "lfgPosts", postId), {
    status: "deleted",
    updatedAt: serverTimestamp(),
  });
}

export async function refreshLfgPost(postId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + LFG_TTL_HOURS * 60 * 60 * 1000);
  await updateDoc(doc(db, "lfgPosts", postId), {
    expiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
  });
}

export { db };
