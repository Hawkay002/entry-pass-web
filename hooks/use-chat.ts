// hooks/use-chat.ts — realtime chat subscription + channel/unread logic.
// Mirrors the original setupChatListener (script.js:3143) and
// processAllMessages (script.js:3158-3214).

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import type { ChatMessage, ChannelType } from "@/lib/types";

const MANAGED_EMAILS = [
  "eveman.test@gmail.com",
  "regdesk.test@gmail.com",
  "sechead.test@gmail.com",
];

/** Channel key format: GLOBAL_ALL / TEAM_{email} / PRIVATE_{otherPerson}. */
export function channelKey(
  msg: Pick<ChatMessage, "channelType" | "target" | "senderDisplay">,
  myUsername: string
): string {
  if (msg.channelType === "GLOBAL") return "GLOBAL_ALL";
  if (msg.channelType === "TEAM") return `TEAM_${msg.target}`;
  if (msg.channelType === "PRIVATE") {
    const other = msg.senderDisplay === myUsername ? msg.target : msg.senderDisplay;
    return `PRIVATE_${other}`;
  }
  return "UNKNOWN";
}

/** Is this message visible to the given user? (relevance filter) */
export function isRelevant(
  msg: ChatMessage,
  myEmail: string | null,
  myUsername: string | null
): boolean {
  if (msg.channelType === "GLOBAL") return true;
  if (msg.channelType === "TEAM")
    return (
      !!myEmail && (msg.target === myEmail || msg.senderEmail === myEmail)
    );
  if (msg.channelType === "PRIVATE")
    return (
      !!myUsername &&
      (msg.target === myUsername || msg.senderDisplay === myUsername)
    );
  return false;
}

export function useChat(
  myEmail: string | null,
  myUsername: string | null,
  activeChannelKey: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Subscribe to the last 300 messages (desc), reverse to ascending.
  useEffect(() => {
    const q = query(
      collection(db, paths.communicationsCollection),
      orderBy("timestamp", "desc"),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      const next: ChatMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        next.push({
          id: d.id,
          text: String(data.text ?? ""),
          senderEmail: String(data.senderEmail ?? ""),
          senderDisplay: String(data.senderDisplay ?? "Unknown"),
          channelType: data.channelType as ChannelType,
          target: String(data.target ?? ""),
          timestamp: Number(data.timestamp ?? 0),
          replyTo: (data.replyTo as ChatMessage["replyTo"]) ?? null,
          isEdited: Boolean(data.isEdited),
        });
      });
      next.reverse();
      setMessages(next);
    });
    return unsub;
  }, []);

  // Compute unread counts (derived, not stored in state set from an effect).
  const unreadByChannel = useMemo(() => {
    if (!myEmail) return {};
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      if (!isRelevant(m, myEmail, myUsername)) return;
      if (m.senderEmail === myEmail) return;
      const key = channelKey(m, myUsername || "");
      if (key === activeChannelKey) return; // open channel = read
      const lastRead = Number(localStorage.getItem(`lastRead_${key}`) ?? 0);
      if (m.timestamp > lastRead) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    });
    return counts;
  }, [messages, myEmail, myUsername, activeChannelKey]);

  const markChannelRead = useCallback((key: string) => {
    localStorage.setItem(`lastRead_${key}`, String(Date.now()));
  }, []);

  const totalUnread = Object.values(unreadByChannel).reduce((a, b) => a + b, 0);

  // Build the channel list.
  const channels = buildChannelList(
    messages,
    unreadByChannel,
    myEmail,
    myUsername,
    myEmail ? MANAGED_EMAILS.includes(myEmail) || myUsername === "ADMIN" : false
  );

  // Filter messages for the active channel.
  const activeMessages = activeChannelKey
    ? filterByChannel(messages, activeChannelKey, myEmail, myUsername)
    : [];

  return {
    messages: activeMessages,
    channels,
    unreadByChannel,
    totalUnread,
    markChannelRead,
  };
}

function buildChannelList(
  messages: ChatMessage[],
  unread: Record<string, number>,
  myEmail: string | null,
  myUsername: string | null,
  isAdmin: boolean
) {
  const lastByChannel: Record<string, ChatMessage> = {};
  messages.forEach((m) => {
    if (!isRelevant(m, myEmail, myUsername)) return;
    const key = channelKey(m, myUsername || "");
    lastByChannel[key] = m;
  });

  const channels: {
    key: string;
    name: string;
    type: ChannelType;
    target: string;
    lastMessage?: ChatMessage;
    unread: number;
  }[] = [];

  // GLOBAL
  channels.push({
    key: "GLOBAL_ALL",
    name: "Global Broadcast",
    type: "GLOBAL",
    target: "ALL",
    lastMessage: lastByChannel["GLOBAL_ALL"],
    unread: unread["GLOBAL_ALL"] ?? 0,
  });

  // TEAM — staff sees only their own; admin sees all three.
  const teamList = isAdmin
    ? [
        { name: "Event Managers", email: "eveman.test@gmail.com" },
        { name: "Registration Desk", email: "regdesk.test@gmail.com" },
        { name: "Security Team", email: "sechead.test@gmail.com" },
      ]
    : myEmail
    ? [
        {
          name: "My Team",
          email: myEmail,
        },
      ]
    : [];

  teamList.forEach((t) => {
    const key = `TEAM_${t.email}`;
    channels.push({
      key,
      name: t.name,
      type: "TEAM",
      target: t.email,
      lastMessage: lastByChannel[key],
      unread: unread[key] ?? 0,
    });
  });

  // PRIVATE — admin sees a directory; staff sees only active conversations.
  const privateKeys = Object.keys(lastByChannel).filter((k) =>
    k.startsWith("PRIVATE_")
  );
  privateKeys.forEach((key) => {
    const target = key.replace("PRIVATE_", "");
    channels.push({
      key,
      name: target,
      type: "PRIVATE",
      target,
      lastMessage: lastByChannel[key],
      unread: unread[key] ?? 0,
    });
  });

  return channels;
}

function filterByChannel(
  messages: ChatMessage[],
  activeKey: string,
  myEmail: string | null,
  myUsername: string | null
): ChatMessage[] {
  return messages.filter((m) => {
    if (!isRelevant(m, myEmail, myUsername)) return false;
    return channelKey(m, myUsername || "") === activeKey;
  });
}
