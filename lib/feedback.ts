// MAN — FEEDBACK ENGINE (Phase 7 / Phase 8).
//
// Every authenticated user can submit structured feedback. It becomes product
// intelligence: classification → priority → clustering → pattern → insight →
// admin review → fix/experiment → resolution → metric.
//
// PRIVACY: feedback is NOT an automatic dump of the user's conversation. Only
// explicit, user-approved context (thread_id / message_id / capability) is
// attached when the user chooses. Users submit feedback directly.
//
// Feedback is evidence, not authority: MAN never auto-changes production
// behaviour based on a single piece of feedback.

export type FeedbackCategory =
  | "bug"
  | "wrong_answer"
  | "missing_capability"
  | "feature_request"
  | "ux_issue"
  | "safety"
  | "general";

export type FeedbackStatus = "open" | "in_review" | "resolved" | "rejected";
export type FeedbackPriority = "low" | "normal" | "high" | "critical";

export interface Feedback {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;            // 1..5 where appropriate
  conversation_id?: string;   // only when explicitly allowed
  thread_id?: string;
  message_id?: string;
  capability?: string;        // capability id the feedback relates to
  created_at: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  admin_notes?: string;
  resolution?: string;
  resolved_at?: string;
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "bug", "wrong_answer", "missing_capability", "feature_request", "ux_issue", "safety", "general",
];

const PRIORITY_ORDER: Record<FeedbackPriority, number> = { low: 0, normal: 1, high: 2, critical: 3 };

import { db, dbEnabled } from "./db";

// In-memory fallback (dev/tests) keyed by user. Production persists to Supabase.
const store = new Map<string, Feedback[]>();

function iso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

export async function createFeedback(userId: string, input: {
  category: FeedbackCategory;
  message: string;
  rating?: number;
  conversation_id?: string;
  thread_id?: string;
  message_id?: string;
  capability?: string;
}): Promise<Feedback> {
  const fb: Feedback = {
    id: newId(),
    user_id: userId,
    category: input.category,
    message: input.message.slice(0, 4000),
    rating: input.rating && input.rating >= 1 && input.rating <= 5 ? input.rating : undefined,
    conversation_id: input.conversation_id,
    thread_id: input.thread_id,
    message_id: input.message_id,
    capability: input.capability,
    created_at: iso(),
    status: "open",
    priority: defaultPriority(input.category),
  };
  if (dbEnabled()) {
    const row = await db.insert("feedback", {
      id: fb.id, user_id: fb.user_id, category: fb.category, message: fb.message,
      rating: fb.rating ?? null, conversation_id: fb.conversation_id ?? null,
      thread_id: fb.thread_id ?? null, message_id: fb.message_id ?? null,
      capability: fb.capability ?? null, created_at: fb.created_at,
      status: fb.status, priority: fb.priority,
    }).catch(() => null);
    if (row && row[0]) return { ...fb, ...row[0] };
  }
  const list = store.get(userId) || [];
  list.push(fb);
  store.set(userId, list);
  return fb;
}

function defaultPriority(cat: FeedbackCategory): FeedbackPriority {
  switch (cat) {
    case "safety": return "critical";
    case "bug": return "high";
    case "missing_capability": return "normal";
    default: return "normal";
  }
}

// Own feedback (user isolation: only this user's records).
export async function listUserFeedback(userId: string): Promise<Feedback[]> {
  if (dbEnabled()) {
    const rows = await db.select("feedback", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`).catch(() => []);
    return rows as Feedback[];
  }
  return (store.get(userId) || []).slice().reverse();
}

// ---- Admin functions (Phase 8) ----
export async function listAllFeedback(limit = 200): Promise<Feedback[]> {
  if (dbEnabled()) {
    const rows = await db.select("feedback", `&order=created_at.desc&limit=${limit}`).catch(() => []);
    return rows as Feedback[];
  }
  return [...store.values()].flat().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export async function updateFeedback(feedbackId: string, patch: {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  admin_notes?: string;
  resolution?: string;
}): Promise<Feedback | null> {
  const resolvedAt = patch.status === "resolved" ? iso() : patch.status === "open" ? null : undefined;
  const data: any = {};
  if (patch.status) data.status = patch.status;
  if (patch.priority) data.priority = patch.priority;
  if (patch.admin_notes !== undefined) data.admin_notes = patch.admin_notes;
  if (patch.resolution !== undefined) data.resolution = patch.resolution;
  if (resolvedAt !== undefined) data.resolved_at = resolvedAt;

  if (dbEnabled()) {
    const rows = await db.update("feedback", `id=eq.${feedbackId}`, data).catch(() => null);
    const updated = await db.select("feedback", `&id=eq.${feedbackId}`).catch(() => []);
    return updated[0] || null;
  }
  for (const [userId, list] of store) {
    const idx = list.findIndex((f) => f.id === feedbackId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      if (resolvedAt !== undefined) list[idx].resolved_at = resolvedAt as any;
      return list[idx];
    }
  }
  return null;
}

// ---- Feedback intelligence / metrics (Phase 8) ----
export interface FeedbackMetrics {
  total: number;
  open: number;
  resolved: number;
  highPriority: number;
  byCategory: Record<FeedbackCategory, number>;
  byStatus: Record<FeedbackStatus, number>;
  capabilityRequests: Record<string, number>;
  avgRating: number | null;
}

export function feedbackMetrics(list: Feedback[]): FeedbackMetrics {
  const byCategory: any = {};
  const byStatus: any = {};
  const capabilityRequests: Record<string, number> = {};
  let open = 0, resolved = 0, highPriority = 0, ratingSum = 0, ratingCount = 0;
  for (const f of list) {
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    if (f.status === "open") open++;
    if (f.status === "resolved") resolved++;
    if (f.priority === "high" || f.priority === "critical") highPriority++;
    if (f.capability) capabilityRequests[f.capability] = (capabilityRequests[f.capability] || 0) + 1;
    if (typeof f.rating === "number") { ratingSum += f.rating; ratingCount++; }
  }
  return {
    total: list.length,
    open,
    resolved,
    highPriority,
    byCategory,
    byStatus,
    capabilityRequests,
    avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
  };
}
