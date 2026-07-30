// components/chat/chat-drawer.tsx — the comms center drawer.
// Two views: channel list (inbox) + active chat. Supports send, reply, edit,
// delete (own), multi-select + batch copy/delete.

"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Send,
  Reply,
  Pencil,
  Trash2,
  Check,
  Copy,
  Users,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/use-chat";
import { useTypingStatus, useSendTyping } from "@/hooks/use-typing";
import { sendMessage, editMessage, deleteMessage, batchDeleteMessages } from "@/app/actions/chat";
import type { ChatMessage, ChannelType } from "@/lib/types";

interface Channel {
  key: string;
  name: string;
  type: ChannelType;
  target: string;
  lastMessage?: ChatMessage;
  unread: number;
}

export function ChatDrawer({
  open,
  onOpenChange,
  myEmail,
  myUsername,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myEmail: string | null;
  myUsername: string | null;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, channels, totalUnread, markChannelRead } = useChat(
    myEmail,
    myUsername,
    activeKey
  );

  const activeChannelForTyping = activeKey;
  const typers = useTypingStatus(activeChannelForTyping, myUsername);
  const sendTyping = useSendTyping(activeChannelForTyping, myUsername);

  function openChannel(ch: Channel) {
    setActiveKey(ch.key);
    setActiveChannel(ch);
    markChannelRead(ch.key);
  }
  function backToList() {
    setActiveKey(null);
    setActiveChannel(null);
  }

  function startReply(msg: ChatMessage) {
    setReplyingTo(msg);
    setEditingId(null);
    inputRef.current?.focus();
  }
  function startEdit(msg: ChatMessage) {
    setEditingId(msg.id);
    setReplyingTo(null);
    setInput(msg.text);
    inputRef.current?.focus();
  }
  function cancelSpecial() {
    setReplyingTo(null);
    setEditingId(null);
    setInput("");
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeChannel) return;

    if (editingId) {
      const res = await editMessage(editingId, text);
      if (!res.ok) toast.error("Edit failed", { description: res.error });
      cancelSpecial();
      return;
    }

    const res = await sendMessage({
      text,
      channelType: activeChannel.type,
      target: activeChannel.target,
      replyTo: replyingTo
        ? { id: replyingTo.id, sender: replyingTo.senderDisplay, text: replyingTo.text }
        : null,
    });
    if (!res.ok) toast.error("Send failed", { description: res.error });
    setInput("");
    setReplyingTo(null);
    markChannelRead(activeChannel.key);
  }

  async function handleDelete(msg: ChatMessage) {
    const res = await deleteMessage(msg.id);
    if (res.ok) toast.success("Message deleted");
    else toast.error("Delete failed", { description: res.error });
  }

  async function handleBatchDelete() {
    const ids = [...selectedIds];
    const res = await batchDeleteMessages(ids);
    if (res.ok) {
      toast.success(`Deleted ${res.count} message(s)`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  }

  async function handleBatchCopy() {
    const selected = messages.filter((m) => selectedIds.has(m.id));
    const text = selected
      .map((m) => `[${m.senderDisplay}]: ${m.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-[var(--bg-surface,#0f0f0f)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            {activeChannel && (
              <Button variant="ghost" size="sm" onClick={backToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="font-semibold">
              {activeChannel ? activeChannel.name : "Comms Center"}
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
            <span className="text-sm text-accent-secondary">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleBatchCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleBatchDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Channel list OR active chat */}
        {!activeChannel ? (
          <ChannelList
            channels={channels}
            onOpen={openChannel}
            onLongPress={(ch) => { /* long press could do something */ }}
          />
        ) : (
          <ActiveChat
            messages={messages}
            myEmail={myEmail}
            typers={typers}
            replyTarget={replyingTo}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onReply={startReply}
            onEdit={startEdit}
            onDelete={handleDelete}
            onCancelReply={cancelSpecial}
          />
        )}

        {/* Input bar (only in active chat) */}
        {activeChannel && (
          <ChatInputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onTyping={sendTyping}
            isEditing={!!editingId}
            replyTo={replyingTo}
            editingText={editingId ? "Editing" : null}
            onCancel={cancelSpecial}
            inputRef={inputRef}
          />
        )}
      </div>
    </div>
  );
}

// ============== Channel List ==============

function ChannelList({
  channels,
  onOpen,
}: {
  channels: Channel[];
  onOpen: (ch: Channel) => void;
  onLongPress: (ch: Channel) => void;
}) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {channels.map((ch) => (
        <button
          key={ch.key}
          onClick={() => onOpen(ch)}
          className="flex w-full items-start gap-3 border-b border-white/5 p-4 text-left transition-colors hover:bg-white/5"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              ch.type === "GLOBAL" && "bg-accent-secondary/20 text-accent-secondary",
              ch.type === "TEAM" && "bg-success-green/20 text-success-green",
              ch.type === "PRIVATE" && "bg-white/10 text-white"
            )}
          >
            {ch.type === "GLOBAL" && <Globe className="h-5 w-5" />}
            {ch.type === "TEAM" && <Users className="h-5 w-5" />}
            {ch.type === "PRIVATE" && <Lock className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{ch.name}</span>
              {ch.lastMessage && (
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {formatTime(ch.lastMessage.timestamp)}
                </span>
              )}
            </div>
            {ch.lastMessage && (
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium">{ch.lastMessage.senderDisplay}:</span>{" "}
                {ch.lastMessage.text}
              </p>
            )}
          </div>
          {ch.unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-secondary px-1.5 text-xs font-bold text-white">
              {ch.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============== Active Chat ==============

function ActiveChat({
  messages,
  myEmail,
  typers,
  replyTarget,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onReply,
  onEdit,
  onDelete,
}: {
  messages: ChatMessage[];
  myEmail: string | null;
  typers: string[];
  replyTarget: ChatMessage | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
  onCancelReply: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderEmail === myEmail;
            const selected = selectedIds.has(msg.id);
            return (
              <div
                key={msg.id}
                className={cn(
                  "group flex flex-col rounded-lg px-3 py-1.5 text-sm",
                  mine ? "items-end" : "items-start"
                )}
              >
                {selectionMode && (
                  <button
                    onClick={() => onToggleSelect(msg.id)}
                    className={cn(
                      "mb-1 h-5 w-5 rounded border text-xs",
                      selected ? "border-accent-secondary bg-accent-secondary" : "border-white/20"
                    )}
                  >
                    {selected && "✓"}
                  </button>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-1.5",
                    mine
                      ? "bg-accent-secondary text-white"
                      : "bg-white/10 text-white",
                    selected && "ring-2 ring-accent-secondary"
                  )}
                  onClick={() => selectionMode && onToggleSelect(msg.id)}
                >
                  {!mine && (
                    <p className="text-xs font-semibold text-accent-secondary">
                      {msg.senderDisplay}
                    </p>
                  )}
                  {msg.replyTo && (
                    <div className="mb-1 border-l-2 border-white/30 pl-2 text-xs opacity-70">
                      <p className="font-medium">{msg.replyTo.sender}</p>
                      <p className="truncate">{msg.replyTo.text}</p>
                    </div>
                  )}
                  <p className="break-words">{msg.text}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem] opacity-60">
                    {msg.isEdited && <Pencil className="h-2.5 w-2.5" />}
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                {!selectionMode && (
                  <div className={cn("mt-0.5 hidden gap-1 group-hover:flex", mine ? "flex-row-reverse" : "")}>
                    <button onClick={() => onReply(msg)} className="text-[0.65rem] text-muted-foreground hover:text-white">
                      <Reply className="h-3 w-3" />
                    </button>
                    {mine && (
                      <>
                        <button onClick={() => onEdit(msg)} className="text-[0.65rem] text-muted-foreground hover:text-white">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => onDelete(msg)} className="text-[0.65rem] text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Typing indicator */}
      {typers.length > 0 && (
        <div className="border-t border-white/5 px-4 py-1.5 text-xs text-muted-foreground">
          {typers.length === 1
            ? `${typers[0]} is typing...`
            : typers.length < 4
            ? `${typers.join(", ")} are typing...`
            : "Several people are typing..."}
        </div>
      )}

      {/* Reply preview */}
      {replyTarget && (
        <div className="flex items-center gap-2 border-t border-white/5 px-4 py-2 text-xs">
          <Reply className="h-3 w-3 shrink-0 text-accent-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-accent-secondary">{replyTarget.senderDisplay}</p>
            <p className="truncate text-muted-foreground">{replyTarget.text}</p>
          </div>
          <button onClick={() => {}} className="text-muted-foreground hover:text-white">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============== Input Bar ==============

function ChatInputBar({
  input,
  setInput,
  onSend,
  onTyping,
  isEditing,
  replyTo,
  editingText,
  onCancel,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onTyping: () => void;
  isEditing: boolean;
  replyTo: ChatMessage | null;
  editingText: string | null;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/5 p-3">
      {(isEditing || replyTo) && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      )}
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={isEditing ? "Editing message..." : "Type a message..."}
        className="flex-1"
      />
      <Button size="sm" onClick={onSend} disabled={!input.trim()}>
        {isEditing ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ============== Helpers ==============

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
