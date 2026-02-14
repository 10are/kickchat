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
  writeBatch,
  increment,
  runTransaction,
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
  lastMessageSenderId?: string;
  // Group-specific fields
  isGroup?: boolean;
  groupName?: string;
  adminId?: string;
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
    if (data.participants.includes(userId2) && !data.isGroup && data.participants.length === 2) {
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
    lastMessageSenderId: senderId,
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

// ── Group Conversations ──

export async function createGroupConversation(
  creator: { uid: string; username: string; avatar: string | null },
  members: { uid: string; username: string; avatar: string | null }[],
  groupName: string
): Promise<string> {
  const allMembers = [creator, ...members];
  if (allMembers.length < 2 || allMembers.length > 5) {
    throw new Error("Grup en az 2, en fazla 5 kisi olabilir");
  }

  const participants = allMembers.map((m) => m.uid);
  const participantUsernames: Record<string, string> = {};
  const participantAvatars: Record<string, string | null> = {};

  for (const m of allMembers) {
    participantUsernames[m.uid] = m.username;
    participantAvatars[m.uid] = m.avatar;
  }

  const convsRef = collection(db, "conversations");
  const newConv = await addDoc(convsRef, {
    participants,
    participantUsernames,
    participantAvatars,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    isGroup: true,
    groupName: groupName.trim().slice(0, 50),
    adminId: creator.uid,
  });

  return newConv.id;
}

export async function addGroupMember(
  conversationId: string,
  adminId: string,
  newMember: { uid: string; username: string; avatar: string | null }
): Promise<void> {
  const convRef = doc(db, "conversations", conversationId);

  await runTransaction(db, async (transaction) => {
    const convDoc = await transaction.get(convRef);
    if (!convDoc.exists()) throw new Error("Grup bulunamadi");

    const data = convDoc.data();
    if (data.adminId !== adminId) throw new Error("Yetkiniz yok");
    if (!data.isGroup) throw new Error("Bu bir grup degil");
    if (data.participants.length >= 5) throw new Error("Grup dolu (maks 5 kisi)");
    if (data.participants.includes(newMember.uid))
      throw new Error("Kullanici zaten grupta");

    transaction.update(convRef, {
      participants: [...data.participants, newMember.uid],
      [`participantUsernames.${newMember.uid}`]: newMember.username,
      [`participantAvatars.${newMember.uid}`]: newMember.avatar,
    });
  });
}

export async function removeGroupMember(
  conversationId: string,
  adminId: string,
  memberId: string
): Promise<void> {
  if (adminId === memberId) throw new Error("Admin kendini cikaramaz");

  const convRef = doc(db, "conversations", conversationId);

  await runTransaction(db, async (transaction) => {
    const convDoc = await transaction.get(convRef);
    if (!convDoc.exists()) throw new Error("Grup bulunamadi");

    const data = convDoc.data();
    if (data.adminId !== adminId) throw new Error("Yetkiniz yok");
    if (!data.participants.includes(memberId))
      throw new Error("Kullanici grupta degil");

    const newParticipants = data.participants.filter(
      (p: string) => p !== memberId
    );
    const newUsernames = { ...data.participantUsernames };
    const newAvatars = { ...data.participantAvatars };
    delete newUsernames[memberId];
    delete newAvatars[memberId];

    transaction.update(convRef, {
      participants: newParticipants,
      participantUsernames: newUsernames,
      participantAvatars: newAvatars,
    });
  });
}

export async function leaveGroup(
  conversationId: string,
  userId: string
): Promise<void> {
  const convRef = doc(db, "conversations", conversationId);

  await runTransaction(db, async (transaction) => {
    const convDoc = await transaction.get(convRef);
    if (!convDoc.exists()) throw new Error("Grup bulunamadi");

    const data = convDoc.data();
    if (!data.participants.includes(userId))
      throw new Error("Grupta degilsiniz");

    const newParticipants = data.participants.filter(
      (p: string) => p !== userId
    );

    const newUsernames = { ...data.participantUsernames };
    const newAvatars = { ...data.participantAvatars };
    delete newUsernames[userId];
    delete newAvatars[userId];

    const updates: Record<string, unknown> = {
      participants: newParticipants,
      participantUsernames: newUsernames,
      participantAvatars: newAvatars,
    };

    // Transfer admin if the leaving user is admin
    if (data.adminId === userId && newParticipants.length > 0) {
      updates.adminId = newParticipants[0];
    }

    transaction.update(convRef, updates);
  });
}

export async function updateGroupName(
  conversationId: string,
  adminId: string,
  newName: string
): Promise<void> {
  const convRef = doc(db, "conversations", conversationId);
  const convDoc = await getDoc(convRef);
  if (!convDoc.exists()) throw new Error("Grup bulunamadi");
  if (convDoc.data().adminId !== adminId) throw new Error("Yetkiniz yok");

  await updateDoc(convRef, {
    groupName: newName.trim().slice(0, 50),
  });
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

// ── Drama System ──

export interface DramaClub {
  id: string;
  streamerName: string;
  streamerSlug: string;
  streamerAvatar: string | null;
  createdBy: string;
  createdByUsername: string;
  createdAt: Timestamp | null;
  entryCount: number;
  memberCount: number;
  lastEntryAt: Timestamp | null;
  description: string;
}

export interface DramaEntry {
  id: string;
  clubId: string;
  clubName: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  title: string;
  body: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  status: "active" | "deleted";
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  score: number;
}

export interface DramaVote {
  userId: string;
  voteType: "like" | "dislike";
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DramaComment {
  id: string;
  entryId: string;
  clubId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  body: string;
  parentCommentId: string | null;
  depth: number;
  createdAt: Timestamp | null;
  status: "active" | "deleted";
  likeCount: number;
  dislikeCount: number;
  score: number;
  replyCount: number;
}

export interface DramaReport {
  id: string;
  targetType: "entry" | "comment";
  targetId: string;
  entryId: string;
  clubId: string;
  reporterId: string;
  reporterUsername: string;
  reason: string;
  createdAt: Timestamp | null;
  status: "pending" | "reviewed" | "dismissed";
}

const DRAMA_ENTRIES_PER_PAGE = 15;
const DRAMA_COMMENTS_PER_PAGE = 20;
const DRAMA_CLUBS_PER_PAGE = 20;

// ── Drama Clubs ──

export async function getDramaClub(slug: string): Promise<DramaClub | null> {
  const docSnap = await getDoc(doc(db, "dramaClubs", slug));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as DramaClub;
}

export async function getOrCreateDramaClub(
  streamerSlug: string,
  streamerName: string,
  streamerAvatar: string | null,
  createdBy: { uid: string; username: string }
): Promise<DramaClub> {
  const clubRef = doc(db, "dramaClubs", streamerSlug);

  return await runTransaction(db, async (transaction) => {
    const clubDoc = await transaction.get(clubRef);

    if (clubDoc.exists()) {
      return { id: clubDoc.id, ...clubDoc.data() } as DramaClub;
    }

    const newClub = {
      streamerName,
      streamerSlug,
      streamerAvatar,
      createdBy: createdBy.uid,
      createdByUsername: createdBy.username,
      createdAt: serverTimestamp(),
      entryCount: 0,
      memberCount: 0,
      lastEntryAt: serverTimestamp(),
      description: "",
    };

    transaction.set(clubRef, newClub);

    return {
      id: streamerSlug,
      ...newClub,
      createdAt: null,
      lastEntryAt: null,
    } as DramaClub;
  });
}

export async function getDramaClubs(
  lastMemberCount?: number
): Promise<DramaClub[]> {
  let q;
  if (lastMemberCount !== undefined) {
    q = query(
      collection(db, "dramaClubs"),
      orderBy("memberCount", "desc"),
      startAfter(lastMemberCount),
      limit(DRAMA_CLUBS_PER_PAGE)
    );
  } else {
    q = query(
      collection(db, "dramaClubs"),
      orderBy("memberCount", "desc"),
      limit(DRAMA_CLUBS_PER_PAGE)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DramaClub));
}

export async function searchDramaClubs(searchTerm: string): Promise<DramaClub[]> {
  const q = query(
    collection(db, "dramaClubs"),
    where("streamerSlug", ">=", searchTerm.toLowerCase()),
    where("streamerSlug", "<=", searchTerm.toLowerCase() + "\uf8ff"),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DramaClub));
}

export function subscribeToDramaClub(
  slug: string,
  callback: (club: DramaClub | null) => void
): () => void {
  return onSnapshot(doc(db, "dramaClubs", slug), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback({ id: docSnap.id, ...docSnap.data() } as DramaClub);
  });
}

// ── Drama Membership ──

export async function joinDramaClub(
  clubSlug: string,
  user: { uid: string; username: string; avatar: string | null }
): Promise<boolean> {
  const memberRef = doc(db, "dramaClubs", clubSlug, "members", user.uid);
  const memberDoc = await getDoc(memberRef);

  if (memberDoc.exists()) return false; // Already a member

  const batch = writeBatch(db);

  batch.set(memberRef, {
    userId: user.uid,
    username: user.username,
    avatar: user.avatar,
    joinedAt: serverTimestamp(),
  });

  batch.update(doc(db, "dramaClubs", clubSlug), {
    memberCount: increment(1),
  });

  await batch.commit();
  return true;
}

export async function isDramaClubMember(
  clubSlug: string,
  userId: string
): Promise<boolean> {
  const memberDoc = await getDoc(
    doc(db, "dramaClubs", clubSlug, "members", userId)
  );
  return memberDoc.exists();
}

// ── Drama Entries ──

export async function createDramaEntry(
  author: { uid: string; username: string; avatar: string | null },
  club: { slug: string; name: string; avatar: string | null },
  entry: { title: string; body: string }
): Promise<string> {
  // Ensure club exists
  await getOrCreateDramaClub(club.slug, club.name, club.avatar, {
    uid: author.uid,
    username: author.username,
  });

  // Auto-join: make the author a member if not already
  await joinDramaClub(club.slug, author);

  const batch = writeBatch(db);

  const entryRef = doc(collection(db, "dramaEntries"));
  batch.set(entryRef, {
    clubId: club.slug,
    clubName: club.name,
    authorId: author.uid,
    authorUsername: author.username,
    authorAvatar: author.avatar,
    title: entry.title.slice(0, 200),
    body: entry.body.slice(0, 5000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active",
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    score: 0,
  });

  const clubRef = doc(db, "dramaClubs", club.slug);
  batch.update(clubRef, {
    entryCount: increment(1),
    lastEntryAt: serverTimestamp(),
  });

  await batch.commit();
  return entryRef.id;
}

export function subscribeToDramaEntries(
  clubId: string,
  sortBy: "new" | "top",
  callback: (entries: DramaEntry[]) => void
): () => void {
  const orderField = sortBy === "new" ? "createdAt" : "score";
  const q = query(
    collection(db, "dramaEntries"),
    where("clubId", "==", clubId),
    where("status", "==", "active"),
    orderBy(orderField, "desc"),
    limit(DRAMA_ENTRIES_PER_PAGE)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DramaEntry)
      );
      callback(entries);
    },
    (error) => {
      console.error("Drama entries subscription error:", error);
      callback([]);
    }
  );
}

export async function loadMoreDramaEntries(
  clubId: string,
  sortBy: "new" | "top",
  lastValue: Timestamp | number
): Promise<DramaEntry[]> {
  const orderField = sortBy === "new" ? "createdAt" : "score";
  const q = query(
    collection(db, "dramaEntries"),
    where("clubId", "==", clubId),
    where("status", "==", "active"),
    orderBy(orderField, "desc"),
    startAfter(lastValue),
    limit(DRAMA_ENTRIES_PER_PAGE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DramaEntry));
}

export function subscribeToTrendingEntries(
  callback: (entries: DramaEntry[]) => void
): () => void {
  const q = query(
    collection(db, "dramaEntries"),
    where("status", "==", "active"),
    orderBy("score", "desc"),
    limit(DRAMA_ENTRIES_PER_PAGE)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DramaEntry)
      );
      callback(entries);
    },
    (error) => {
      console.error("Trending entries subscription error:", error);
      callback([]);
    }
  );
}

export function subscribeToDramaEntry(
  entryId: string,
  callback: (entry: DramaEntry | null) => void
): () => void {
  return onSnapshot(doc(db, "dramaEntries", entryId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback({ id: docSnap.id, ...docSnap.data() } as DramaEntry);
  });
}

export async function deleteDramaEntry(entryId: string, clubId: string): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "dramaEntries", entryId), {
    status: "deleted",
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, "dramaClubs", clubId), {
    entryCount: increment(-1),
  });

  await batch.commit();
}

// ── Drama Votes ──

export async function voteDramaEntry(
  entryId: string,
  userId: string,
  voteType: "like" | "dislike"
): Promise<void> {
  const voteRef = doc(db, "dramaEntries", entryId, "votes", userId);
  const entryRef = doc(db, "dramaEntries", entryId);

  await runTransaction(db, async (transaction) => {
    const voteDoc = await transaction.get(voteRef);
    const existingVote = voteDoc.exists()
      ? (voteDoc.data() as DramaVote)
      : null;

    if (!existingVote) {
      // New vote
      transaction.set(voteRef, {
        userId,
        voteType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.update(entryRef, {
        [`${voteType}Count`]: increment(1),
        score: increment(voteType === "like" ? 1 : -1),
      });
    } else if (existingVote.voteType === voteType) {
      // Same vote again → remove (toggle off)
      transaction.delete(voteRef);
      transaction.update(entryRef, {
        [`${voteType}Count`]: increment(-1),
        score: increment(voteType === "like" ? -1 : 1),
      });
    } else {
      // Switching vote (like→dislike or dislike→like)
      transaction.update(voteRef, {
        voteType,
        updatedAt: serverTimestamp(),
      });
      transaction.update(entryRef, {
        [`${existingVote.voteType}Count`]: increment(-1),
        [`${voteType}Count`]: increment(1),
        score: increment(voteType === "like" ? 2 : -2),
      });
    }
  });
}

export async function voteDramaComment(
  commentId: string,
  userId: string,
  voteType: "like" | "dislike"
): Promise<void> {
  const voteRef = doc(db, "dramaComments", commentId, "votes", userId);
  const commentRef = doc(db, "dramaComments", commentId);

  await runTransaction(db, async (transaction) => {
    const voteDoc = await transaction.get(voteRef);
    const existingVote = voteDoc.exists()
      ? (voteDoc.data() as DramaVote)
      : null;

    if (!existingVote) {
      transaction.set(voteRef, {
        userId,
        voteType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.update(commentRef, {
        [`${voteType}Count`]: increment(1),
        score: increment(voteType === "like" ? 1 : -1),
      });
    } else if (existingVote.voteType === voteType) {
      transaction.delete(voteRef);
      transaction.update(commentRef, {
        [`${voteType}Count`]: increment(-1),
        score: increment(voteType === "like" ? -1 : 1),
      });
    } else {
      transaction.update(voteRef, {
        voteType,
        updatedAt: serverTimestamp(),
      });
      transaction.update(commentRef, {
        [`${existingVote.voteType}Count`]: increment(-1),
        [`${voteType}Count`]: increment(1),
        score: increment(voteType === "like" ? 2 : -2),
      });
    }
  });
}

export async function getMyEntryVotes(
  entryIds: string[],
  userId: string
): Promise<Map<string, DramaVote>> {
  const votes = new Map<string, DramaVote>();
  const promises = entryIds.map(async (entryId) => {
    const voteDoc = await getDoc(
      doc(db, "dramaEntries", entryId, "votes", userId)
    );
    if (voteDoc.exists()) {
      votes.set(entryId, voteDoc.data() as DramaVote);
    }
  });
  await Promise.all(promises);
  return votes;
}

export async function getMyCommentVotes(
  commentIds: string[],
  userId: string
): Promise<Map<string, DramaVote>> {
  const votes = new Map<string, DramaVote>();
  const promises = commentIds.map(async (commentId) => {
    const voteDoc = await getDoc(
      doc(db, "dramaComments", commentId, "votes", userId)
    );
    if (voteDoc.exists()) {
      votes.set(commentId, voteDoc.data() as DramaVote);
    }
  });
  await Promise.all(promises);
  return votes;
}

// ── Drama Comments ──

export async function createDramaComment(
  author: { uid: string; username: string; avatar: string | null },
  entryId: string,
  clubId: string,
  body: string,
  parentCommentId?: string | null,
  depth?: number
): Promise<string> {
  const batch = writeBatch(db);

  const commentRef = doc(collection(db, "dramaComments"));
  batch.set(commentRef, {
    entryId,
    clubId,
    authorId: author.uid,
    authorUsername: author.username,
    authorAvatar: author.avatar,
    body: body.slice(0, 2000),
    parentCommentId: parentCommentId || null,
    depth: depth || 0,
    createdAt: serverTimestamp(),
    status: "active",
    likeCount: 0,
    dislikeCount: 0,
    score: 0,
    replyCount: 0,
  });

  // Increment entry comment count
  batch.update(doc(db, "dramaEntries", entryId), {
    commentCount: increment(1),
  });

  // If replying to a comment, increment parent's reply count
  if (parentCommentId) {
    batch.update(doc(db, "dramaComments", parentCommentId), {
      replyCount: increment(1),
    });
  }

  await batch.commit();
  return commentRef.id;
}

export function subscribeToDramaComments(
  entryId: string,
  callback: (comments: DramaComment[]) => void
): () => void {
  const q = query(
    collection(db, "dramaComments"),
    where("entryId", "==", entryId),
    where("parentCommentId", "==", null),
    where("status", "==", "active"),
    orderBy("createdAt", "asc"),
    limit(DRAMA_COMMENTS_PER_PAGE)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DramaComment)
      );
      callback(comments);
    },
    (error) => {
      console.error("Drama comments subscription error:", error);
      callback([]);
    }
  );
}

export async function loadMoreDramaComments(
  entryId: string,
  lastCreatedAt: Timestamp
): Promise<DramaComment[]> {
  const q = query(
    collection(db, "dramaComments"),
    where("entryId", "==", entryId),
    where("parentCommentId", "==", null),
    where("status", "==", "active"),
    orderBy("createdAt", "asc"),
    startAfter(lastCreatedAt),
    limit(DRAMA_COMMENTS_PER_PAGE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DramaComment));
}

export async function loadDramaReplies(
  parentCommentId: string
): Promise<DramaComment[]> {
  const q = query(
    collection(db, "dramaComments"),
    where("parentCommentId", "==", parentCommentId),
    where("status", "==", "active"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DramaComment));
}

export async function deleteDramaComment(
  commentId: string,
  entryId: string,
  parentCommentId?: string | null
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "dramaComments", commentId), {
    status: "deleted",
  });

  batch.update(doc(db, "dramaEntries", entryId), {
    commentCount: increment(-1),
  });

  if (parentCommentId) {
    batch.update(doc(db, "dramaComments", parentCommentId), {
      replyCount: increment(-1),
    });
  }

  await batch.commit();
}

// ── Drama Reports ──

export async function reportDramaContent(
  reporter: { uid: string; username: string },
  target: {
    type: "entry" | "comment";
    id: string;
    entryId: string;
    clubId: string;
  },
  reason: string
): Promise<string> {
  const reportRef = await addDoc(collection(db, "dramaReports"), {
    targetType: target.type,
    targetId: target.id,
    entryId: target.entryId,
    clubId: target.clubId,
    reporterId: reporter.uid,
    reporterUsername: reporter.username,
    reason: reason.slice(0, 500),
    createdAt: serverTimestamp(),
    status: "pending",
  });
  return reportRef.id;
}

export { db };
