// Persistent memory for the AI Concierge.
//
// MAA v4.0 trust principle: data is always retrievable and survives across
// sessions. This uses Supabase (Postgres) when DATABASE_URL / service key are
// set, otherwise falls back to an in-memory store so the demo works locally.

export interface Reminder {
  id: string;
  title: string;
  when: string;
  status: string;
  created_at: string;
}

export interface MemoryData {
  name?: string;
  preferences: Record<string, string>;
  reminders: Reminder[];
  tasks: Record<string, unknown>;
}

// Simple in-memory + localStorage-ish fallback for local dev.
// On Vercel, configure Supabase so memory persists across serverless calls.
class Memory {
  private store: MemoryData = { preferences: {}, reminders: [], tasks: {} };
  private db: any = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      // Minimal Supabase REST client (uses PostgREST). No SDK dependency.
      this.db = { url: url.replace(/\/$/, ""), key };
    }
  }

  private async headers() {
    return {
      "Content-Type": "application/json",
      apikey: this.db?.key,
      Authorization: `Bearer ${this.db?.key}`,
    };
  }

  async getProfile(): Promise<MemoryData["preferences"]> {
    if (this.db) {
      const r = await fetch(`${this.db.url}/rest/v1/profile?select=*`, {
        headers: await this.headers(),
      });
      const rows = (await r.json()) as Array<{ data: Record<string, string> }>;
      return rows[0]?.data || {};
    }
    return this.store.preferences;
  }

  async setPreference(key: string, value: string): Promise<void> {
    if (this.db) {
      await fetch(`${this.db.url}/rest/v1/profile`, {
        method: "POST",
        headers: await this.headers(),
        body: JSON.stringify({ id: 1, data: { ...(await this.getProfile()), [key]: value } }),
      });
      return;
    }
    this.store.preferences[key] = value;
  }

  async addReminder(title: string, when: string): Promise<Reminder> {
    const rem: Reminder = {
      id: `rem_${Date.now()}`,
      title,
      when,
      status: "scheduled",
      created_at: new Date().toISOString(),
    };
    if (this.db) {
      await fetch(`${this.db.url}/rest/v1/reminders`, {
        method: "POST",
        headers: await this.headers(),
        body: JSON.stringify(rem),
      });
      return rem;
    }
    this.store.reminders.push(rem);
    return rem;
  }

  async listReminders(): Promise<Reminder[]> {
    if (this.db) {
      const r = await fetch(`${this.db.url}/rest/v1/reminders?select=*`, {
        headers: await this.headers(),
      });
      return (await r.json()) as Reminder[];
    }
    return this.store.reminders;
  }
}

// A singleton shared across route handlers.
export const memory = new Memory();
