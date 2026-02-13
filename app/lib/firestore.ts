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

// ── Friend System ──

export async function sendFriendRequest(
  from: { uid: string; username: string; avatar: string | null },
  to: { kickUserId: string; username: string; avatar: string | null }
) {
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
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Conversation[];
      callback(conversations);
    },
    (error) => {
      console.error("Conversations subscription error:", error);
      // Fallback: try without orderBy (index might not exist yet)
      const fallbackQ = query(
        collection(db, "conversations"),
        where("participants", "array-contains", userId)
      );
      onSnapshot(fallbackQ, (snapshot) => {
        const conversations = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as Conversation))
          .sort((a, b) => {
            const aTime = a.lastMessageAt?.toMillis() || 0;
            const bTime = b.lastMessageAt?.toMillis() || 0;
            return bTime - aTime;
          });
        callback(conversations);
      });
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

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ChatMessage[];
    callback(messages);
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

export { db };
