// MAA v4.0 Pillar 10 — Human-in-the-Loop Approval Gate (user-scoped).
//
// Before any consequential action, the action enters a PENDING state and
// waits for explicit human approval. No response -> stays PENDING (never
// auto-publishes, never silently discards). Every action is bound to a
// userId so one user can never approve another user's action.

import { db, dbEnabled } from "./db";

export interface PendingAction {
  id: string;
  user_id: string;
  intent: string;
  summary: string;
  detail: string;
  state: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

const localStore = new Map<string, PendingAction>(); // dev fallback

export async function createPendingAction(userId: string, intent: string, summary: string, detail: string): Promise<PendingAction> {
  const action: PendingAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    intent,
    summary,
    detail,
    state: "PENDING",
    created_at: new Date().toISOString(),
  };
  if (dbEnabled()) await db.insert("pending_actions", action).catch(() => {});
  localStore.set(action.id, action);
  return action;
}

export async function getPendingAction(id: string, userId?: string): Promise<PendingAction | undefined> {
  if (dbEnabled()) {
    const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
    const rows = await db.select("pending_actions", `&id=eq.${id}${filter}`).catch(() => []);
    if (rows.length) return rows[0] as PendingAction;
  }
  const a = localStore.get(id);
  if (a && userId && a.user_id !== userId) return undefined;
  return a;
}

export async function resolvePendingAction(id: string, approved: boolean, userId?: string): Promise<PendingAction | undefined> {
  const action = await getPendingAction(id, userId);
  if (!action) return undefined;
  const state = approved ? "APPROVED" : "REJECTED";
  if (dbEnabled()) await db.update("pending_actions", `id=eq.${id}`, { state }).catch(() => {});
  if (localStore.has(id)) localStore.set(id, { ...localStore.get(id)!, state });
  action.state = state;
  return action;
}

export async function listPendingActions(userId?: string): Promise<PendingAction[]> {
  if (dbEnabled()) {
    const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
    return db.select("pending_actions", `&state=eq.PENDING${filter}`).catch(() => []);
  }
  return [...localStore.values()].filter((a) => a.state === "PENDING" && (!userId || a.user_id === userId));
}
