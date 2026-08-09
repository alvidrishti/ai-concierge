// MAN — Rate limiting + usage monitoring.
//
// Limits are configurable via env (MAN_TEXT_DAILY, MAN_VOICE_MIN_DAILY) and
// NOT hardcoded. Uses in-memory counters (per process) as a fast guard, and
// persists usage to Supabase for the admin view. Production should also use
// a Redis/Vercel KV counter for multi-instance accuracy.

import { db, dbEnabled } from "./db";

const TEXT_DAILY = parseInt(process.env.MAN_TEXT_DAILY || "100", 10);
const VOICE_MIN_DAILY = parseInt(process.env.MAN_VOICE_MIN_DAILY || "15", 10);

// in-memory counters keyed by `${userId}:${kind}:${yyyymmdd}`
const counters = new Map<string, number>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function countKey(userId: string, kind: string): string {
  return `${userId}:${kind}:${today()}`;
}

export function checkLimit(userId: string, kind: "text" | "voice", extra = 1): { allowed: boolean; used: number; limit: number } {
  const limit = kind === "voice" ? VOICE_MIN_DAILY : TEXT_DAILY;
  const k = countKey(userId, kind);
  const used = counters.get(k) || 0;
  if (used + extra > limit) return { allowed: false, used, limit };
  return { allowed: true, used, limit };
}

export function consume(userId: string, kind: "text" | "voice", extra = 1): void {
  const k = countKey(userId, kind);
  counters.set(k, (counters.get(k) || 0) + extra);
}

export async function logUsage(userId: string, kind: "text" | "voice", provider?: string, tokens?: number, error?: string) {
  if (dbEnabled()) {
    await db.insert("usage_log", { user_id: userId, kind, provider, tokens, error }).catch(() => {});
  }
}

export async function adminUsage(): Promise<{ byUser: Record<string, number>; providers: Record<string, number>; errors: number }> {
  if (!dbEnabled()) {
    return { byUser: {}, providers: {}, errors: 0 };
  }
  const rows = await db.select("usage_log").catch(() => []);
  const byUser: Record<string, number> = {};
  const providers: Record<string, number> = {};
  let errors = 0;
  for (const r of rows as any[]) {
    byUser[r.user_id] = (byUser[r.user_id] || 0) + 1;
    if (r.provider) providers[r.provider] = (providers[r.provider] || 0) + 1;
    if (r.error) errors++;
  }
  return { byUser, providers, errors };
}
