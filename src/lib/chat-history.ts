import { useEffect, useState } from "react";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messages: ChatMsg[];
};

const KEY = "eljot-chat-history-v1";
const EVT = "eljot-chat-history-changed";

function read(): Conversation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Conversation[];
  } catch {
    return [];
  }
}

function write(list: Conversation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function listConversations(): Conversation[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | undefined {
  return read().find((c) => c.id === id);
}

export function upsertConversation(conv: Conversation) {
  const list = read();
  const idx = list.findIndex((c) => c.id === conv.id);
  if (idx === -1) list.push(conv);
  else list[idx] = conv;
  write(list);
}

export function deleteConversation(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function renameConversation(id: string, title: string) {
  const list = read().map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c));
  write(list);
}

export function clearAllConversations() {
  write([]);
}

export function newConversationId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function deriveTitle(messages: ChatMsg[]): string {
  const first = messages.find((m) => m.role === "user")?.content ?? "Nowa rozmowa";
  return first.replace(/\s+/g, " ").slice(0, 60).trim() || "Nowa rozmowa";
}

export function useConversations(): Conversation[] {
  const [list, setList] = useState<Conversation[]>(() => listConversations());
  useEffect(() => {
    const onChange = () => setList(listConversations());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return list;
}
