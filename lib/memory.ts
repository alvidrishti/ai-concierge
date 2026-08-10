// MAN — Per-user memory + conversation history (thread-aware, Phase 1).
//
// Every record is scoped to a userId. Users can NEVER read another user's
// memory/conversations because all queries are filtered by user_id at the
// data layer (see lib/db.ts). Conversation messages belong to a thread
// (conversation_threads) so each user can have multiple named conversations.
// Falls back to an in-memory per-process store for local dev when Supabase
// isn't configured (still keyed by userId).

import { db, dbEnabled } from "./db";

export interface MemoryItem {
  key: string;
  value: string;
  created_at?: string;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface Thread {
  id: string;
  title: string | null;
  updated_at?: string;
}

class Memory {
  // in-memory fallback (dev)
  private mem = new Map<string, Map<string, string>>();
  private memCreated = new Map<string, Map<string, string>>();
  private conv = new Map<string, Map<string, ChatMessage[]>>(); // userId -> threadId -> msgs
  private threads = new Map<string, Map<string, Thread>>(); // userId -> threadId -> thread
  private threadSeq = new Map<string, number>();

  // ================= MEMORY =================
  async getMemory(userId: string): Promise<MemoryItem[]> {
    if (dbEnabled()) {
      const rows = await db.select("user_memory", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`);
      return rows.map((r: any) => ({ key: r.key, value: r.value, created_at: r.created_at }));
    }
    const m = this.mem.get(userId);
    const mc = this.memCreated.get(userId);
    if (!m) return [];
    return [...m.entries()].map(([key, value]) => ({ key, value, created_at: mc?.get(key) }));
  }

  async setMemory(userId: string, key: string, value: string): Promise<void> {
    if (dbEnabled()) {
      try {
        await db.insert("user_memory", { user_id: userId, key, value });
      } catch {
        await db.del("user_memory", `user_id=eq.${encodeURIComponent(userId)}&key=eq.${encodeURIComponent(key)}`);
        await db.insert("user_memory", { user_id: userId, key, value });
      }
      return;
    }
    if (!this.mem.has(userId)) { this.mem.set(userId, new Map()); this.memCreated.set(userId, new Map()); }
    if (!this.mem.get(userId)!.has(key)) this.memCreated.get(userId)!.set(key, new Date().toISOString());
    this.mem.get(userId)!.set(key, value);
  }

  async deleteMemory(userId: string, key?: string): Promise<void> {
    if (dbEnabled()) {
      const f = key
        ? `user_id=eq.${encodeURIComponent(userId)}&key=eq.${encodeURIComponent(key)}`
        : `user_id=eq.${encodeURIComponent(userId)}`;
      await db.del("user_memory", f);
      return;
    }
    const m = this.mem.get(userId);
    if (m) { if (key) { m.delete(key); this.memCreated.get(userId)?.delete(key); } else { this.mem.delete(userId); this.memCreated.delete(userId); } }
  }

  // ================= THREADS =================
  async listThreads(userId: string): Promise<Thread[]> {
    if (dbEnabled()) {
      const rows = await db.select("conversation_threads", `&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`);
      return rows.map((r: any) => ({ id: r.id, title: r.title, updated_at: r.updated_at }));
    }
    const t = this.threads.get(userId);
    if (!t) return [];
    return [...t.values()].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }

  async createThread(userId: string, title = "New chat"): Promise<Thread> {
    if (dbEnabled()) {
      const row = { user_id: userId, title };
      await db.insert("conversation_threads", row);
      const created = await db.select("conversation_threads", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
      const t = created[0];
      return { id: t.id, title: t.title, updated_at: t.updated_at };
    }
    const id = `th_${Date.now()}_${(this.threadSeq.get(userId) || 0)}`;
    this.threadSeq.set(userId, (this.threadSeq.get(userId) || 0) + 1);
    if (!this.threads.has(userId)) { this.threads.set(userId, new Map()); this.conv.set(userId, new Map()); }
    const thread = { id, title, updated_at: new Date().toISOString() };
    this.threads.get(userId)!.set(id, thread);
    this.conv.get(userId)!.set(id, []);
    return thread;
  }

  async renameThread(userId: string, threadId: string, title: string): Promise<void> {
    if (dbEnabled()) {
      await db.update("conversation_threads", `id=eq.${threadId}&user_id=eq.${encodeURIComponent(userId)}`, { title, updated_at: new Date().toISOString() }).catch(() => {});
      return;
    }
    const t = this.threads.get(userId)?.get(threadId);
    if (t) { t.title = title; t.updated_at = new Date().toISOString(); }
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    if (dbEnabled()) {
      await db.del("conversation_threads", `id=eq.${threadId}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
      return;
    }
    this.threads.get(userId)?.delete(threadId);
    this.conv.get(userId)?.delete(threadId);
  }

  // ================= CONVERSATION (thread-scoped) =================
  async getConversation(userId: string, threadId?: string, limit = 12): Promise<ChatMessage[]> {
    if (dbEnabled()) {
      const f = threadId ? `&thread_id=eq.${threadId}` : "";
      const rows = await db.select("conversations", `&user_id=eq.${encodeURIComponent(userId)}${f}&order=created_at.desc&limit=${limit}`);
      return rows.reverse().map((r: any) => ({ role: r.role, content: r.content }));
    }
    const tId = threadId || this.threads.get(userId)?.keys().next().value as string | undefined;
    return (tId ? (this.conv.get(userId)?.get(tId) || []) : []).slice(-limit);
  }

  async saveConversation(userId: string, threadId: string, role: "user" | "assistant", content: string, provider?: string): Promise<void> {
    if (dbEnabled()) {
      await db.insert("conversations", { thread_id: threadId, user_id: userId, role, content, provider }).catch(() => {});
      await db.update("conversation_threads", `id=eq.${threadId}`, { updated_at: new Date().toISOString() }).catch(() => {});
      return;
    }
    if (!this.conv.has(userId) || !this.conv.get(userId)!.has(threadId)) {
      if (!this.conv.has(userId)) this.conv.set(userId, new Map());
      this.conv.get(userId)!.set(threadId, []);
    }
    this.conv.get(userId)!.get(threadId)!.push({ role, content });
    const arr = this.conv.get(userId)!.get(threadId)!;
    if (arr.length > 500) this.conv.get(userId)!.set(threadId, arr.slice(-500));
    const t = this.threads.get(userId)?.get(threadId);
    if (t) t.updated_at = new Date().toISOString();
  }

  async clearConversation(userId: string, threadId?: string): Promise<void> {
    if (dbEnabled()) {
      const f = threadId ? `&thread_id=eq.${threadId}` : "";
      await db.del("conversations", `user_id=eq.${encodeURIComponent(userId)}${f}`);
      return;
    }
    if (threadId) this.conv.get(userId)?.delete(threadId);
    else this.conv.delete(userId);
  }

  // ================= REMINDERS =================
  async addReminder(userId: string, title: string, when: string): Promise<void> {
    if (dbEnabled()) {
      await db.insert("reminders", { id: `rem_${Date.now()}`, user_id: userId, title, when }).catch(() => {});
      return;
    }
  }
  async listReminders(userId: string) {
    if (dbEnabled()) return db.select("reminders", `&user_id=eq.${encodeURIComponent(userId)}`).catch(() => []);
    return [];
  }
}

export const memory = new Memory();
