// MAN — Rate limiting + usage monitoring.
//
// Limits are configurable via env (MAN_TEXT_DAILY, MAN_VOICE_MIN_DAILY) and
// NOT hardcoded.
//
// SECURITY / DEPLOYMENT NOTE (R-rate):
// The rate-limit counters are PROCESS-LOCAL (in-memory Maps). This is safe for
// the current target of 10 trusted users on a single Next.js instance and on
// Vercel's serverless where each instance enforces its own budget — the app
// does NOT claim a globally-consistent limit. If the deployment scales to many
// serverless instances or many more users, move the counters to a shared store
// (Vercel KV / Redis) for globally accurate limiting. No single user can
// exhaust another user's budget because counters are keyed by userId.
//
// Usage is persisted to Supabase for the admin view.

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

export interface AdminUsage {
  byUser: Record<string, number>;
  providers: Record<string, number>;
  errors: number;
  messagesToday: number;
  voiceUsage: number;
  fallbackCount: number;
}

// Aggregate usage stats for the admin dashboard (Phase 8/9).
// Privacy-conscious: reports counts per user/provider only — never the
// content of anyone's private conversations.
export async function adminUsage(): Promise<AdminUsage> {
  if (!dbEnabled()) {
    return { byUser: {}, providers: {}, errors: 0, messagesToday: 0, voiceUsage: 0, fallbackCount: 0 };
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await db.select("usage_log").catch(() => [] as any[]);
  const byUser: Record<string, number> = {};
  const providers: Record<string, number> = {};
  let errors = 0, messagesToday = 0, voiceUsage = 0, fallbackCount = 0;
  for (const r of rows) {
    byUser[r.user_id] = (byUser[r.user_id] || 0) + 1;
    if (r.kind === "voice") voiceUsage++;
    if (r.created_at?.startsWith(todayStr)) {
      if (r.kind === "text") messagesToday++;
    }
    if (r.provider) providers[r.provider] = (providers[r.provider] || 0) + 1;
    if (r.error) { errors++; fallbackCount++; }
  }
  return { byUser, providers, errors, messagesToday, voiceUsage, fallbackCount };
}

// Provider availability (Phase 8): report only whether each provider is
// configured — never expose keys. A provider with no key shows "not configured".
export function providerStatus(): { name: string; status: string }[] {
  const checks: [string, string][] = [
    ["Gemini", "GEMINI_API_KEY"],
    ["Groq", "GROQ_API_KEY"],
    ["OpenRouter", "OPENROUTER_API_KEY"],
    ["GitHub Models", "GITHUB_TOKEN"],
  ];
  return checks.map(([name, env]) => ({
    name,
    status: process.env[env] ? "configured" : "not_configured",
  }));
}
