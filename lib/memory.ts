// MAN — Per-user memory + conversation history.
//
// Every record is scoped to a userId. Users can NEVER read another user's
// memory/conversations because all queries are filtered by user_id at the
// data layer (see lib/db.ts). Falls back to in-memory per-process store for
// local dev when Supabase isn't configured (still keyed by userId).

import { db, dbEnabled } from "./db";

export interface MemoryItem {
  key: string;
  value: string;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

class Memory {
  // in-memory fallback (dev)
  private mem = new Map<string, Map<string, string>>();
  private conv = new Map<string, ChatMessage[]>();

  // ---- long-term memory ----
  async getMemory(userId: string): Promise<MemoryItem[]> {
    if (dbEnabled()) {
      const rows = await db.select("user_memory", `&user_id=eq.${encodeURIComponent(userId)}`);
      return rows.map((r: any) => ({ key: r.key, value: r.value }));
    }
    return [...(this.mem.get(userId) || new Map())].map(([key, value]) => ({ key, value }));
  }

  async setMemory(userId: string, key: string, value: string): Promise<void> {
    if (dbEnabled()) {
      try {
        await db.insert("user_memory", { user_id: userId, key, value });
      } catch {
        // upsert: delete then insert
        await db.del("user_memory", `user_id=eq.${encodeURIComponent(userId)}&key=eq.${encodeURIComponent(key)}`);
        await db.insert("user_memory", { user_id: userId, key, value });
      }
      return;
    }
    if (!this.mem.has(userId)) this.mem.set(userId, new Map());
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
    if (m) { if (key) m.delete(key); else this.mem.delete(userId); }
  }

  // ---- conversation history ----
  async getConversation(userId: string, limit = 12): Promise<ChatMessage[]> {
    if (dbEnabled()) {
      const rows = await db.select("conversations", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`);
      return rows.reverse().map((r: any) => ({ role: r.role, content: r.content }));
    }
    return (this.conv.get(userId) || []).slice(-limit);
  }

  async saveConversation(userId: string, role: "user" | "assistant", content: string, provider?: string): Promise<void> {
    if (dbEnabled()) {
      await db.insert("conversations", { user_id: userId, role, content, provider }).catch(() => {});
      return;
    }
    if (!this.conv.has(userId)) this.conv.set(userId, []);
    this.conv.get(userId)!.push({ role, content });
    if (this.conv.get(userId)!.length > 200) this.conv.set(userId, this.conv.get(userId)!.slice(-200));
  }

  async clearConversation(userId: string): Promise<void> {
    if (dbEnabled()) {
      await db.del("conversations", `user_id=eq.${encodeURIComponent(userId)}`);
      return;
    }
    this.conv.delete(userId);
  }

  // ---- reminders (kept from Tether, scoped to user) ----
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
