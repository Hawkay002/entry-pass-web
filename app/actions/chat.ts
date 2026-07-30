// app/actions/chat.ts — server actions for chat send/edit/delete + cleanup.
// Authenticated via session cookie. Delete is restricted to own messages
// (admin does NOT get elevated delete — matches original behavior).

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getAppUser } from "@/lib/firebase/server-auth";
import type { ChannelType } from "@/lib/types";

interface ChatReplyRef {
  id: string;
  sender: string;
  text: string;
}

export async function sendMessage(input: {
  text: string;
  channelType: ChannelType;
  target: string;
  replyTo: ChatReplyRef | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!input.text.trim()) return { ok: false, error: "Message is empty." };

  const ref = await getAdminDb()
    .collection(paths.communicationsCollection)
    .add({
      text: input.text.trim(),
      senderEmail: user.email ?? "",
      senderDisplay: user.username || "Unknown",
      channelType: input.channelType,
      target: input.target,
      timestamp: Date.now(),
      replyTo: input.replyTo,
    });

  // Admin triggers cleanup of messages older than 36h (matches original).
  if (user.role === "admin") {
    try {
      const limitTime = Date.now() - 36 * 60 * 60 * 1000;
      const snap = await getAdminDb()
        .collection(paths.communicationsCollection)
        .where("timestamp", "<", limitTime)
        .get();
      const batch = getAdminDb().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      console.error("[chat] cleanup failed:", err);
    }
  }

  return { ok: true, id: ref.id };
}

export async function editMessage(
  messageId: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const ref = getAdminDb().collection(paths.communicationsCollection).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Message not found." };

  const data = snap.data();
  if (data?.senderEmail !== user.email) {
    return { ok: false, error: "You can only edit your own messages." };
  }

  await ref.update({ text: text.trim(), isEdited: true });
  return { ok: true };
}

export async function deleteMessage(
  messageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const ref = getAdminDb().collection(paths.communicationsCollection).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Message not found." };

  const data = snap.data();
  if (data?.senderEmail !== user.email) {
    return { ok: false, error: "You can only delete your own messages." };
  }

  await ref.delete();
  return { ok: true };
}

export async function batchDeleteMessages(
  ids: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const db = getAdminDb();
  const batch = db.batch();
  let count = 0;

  for (const id of ids) {
    const snap = await db.collection(paths.communicationsCollection).doc(id).get();
    const data = snap.data();
    if (data && data.senderEmail === user.email) {
      batch.delete(snap.ref);
      count++;
    }
  }

  if (count > 0) await batch.commit();
  return { ok: true, count };
}
