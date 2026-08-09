// MAA v4.0 Pillar 10 — Human-in-the-Loop Approval Gate.
//
// Before any agent action that changes state, the action enters a PENDING
// state and waits for explicit human approval. No response -> stays PENDING
// (never auto-publishes, never silently discards).
//
// Pending actions are persisted to Supabase when configured so approvals
// survive across serverless invocations (required on Vercel).

export interface PendingAction {
  id: string;
  intent: string;
  summary: string;
  detail: string;
  state: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

const dbUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function headers() {
  return {
    "Content-Type": "application/json",
    apikey: dbKey || "",
    Authorization: `Bearer ${dbKey || ""}`,
  };
}

// Local fallback store (used when Supabase isn't configured). Persists for
// the lifetime of the running process — good for local dev.
const localStore = new Map<string, PendingAction>();

export async function createPendingAction(intent: string, summary: string, detail: string): Promise<PendingAction> {
  const action: PendingAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    intent,
    summary,
    detail,
    state: "PENDING",
    created_at: new Date().toISOString(),
  };
  if (dbUrl && dbKey) {
    await fetch(`${dbUrl}/rest/v1/pending_actions`, {
      method: "POST", headers: await headers(), body: JSON.stringify(action),
    }).catch(() => {});
  }
  localStore.set(action.id, action);
  return action;
}

export async function getPendingAction(id: string): Promise<PendingAction | undefined> {
  if (dbUrl && dbKey) {
    const r = await fetch(`${dbUrl}/rest/v1/pending_actions?id=eq.${id}&select=*`, {
      headers: await headers(),
    }).catch(() => null);
    if (r) {
      const rows = (await r.json()) as PendingAction[];
      if (rows.length) return rows[0];
    }
  }
  return localStore.get(id);
}

export async function resolvePendingAction(id: string, approved: boolean): Promise<PendingAction | undefined> {
  const action = await getPendingAction(id);
  if (!action) return undefined;
  const state = approved ? "APPROVED" : "REJECTED";
  if (dbUrl && dbKey) {
    await fetch(`${dbUrl}/rest/v1/pending_actions?id=eq.${id}`, {
      method: "PATCH", headers: await headers(),
      body: JSON.stringify({ state }),
    }).catch(() => {});
  }
  if (localStore.has(id)) {
    localStore.set(id, { ...localStore.get(id)!, state });
  }
  action.state = state;
  return action;
}

export async function listPendingActions(): Promise<PendingAction[]> {
  if (dbUrl && dbKey) {
    const r = await fetch(`${dbUrl}/rest/v1/pending_actions?state=eq.PENDING&select=*`, {
      headers: await headers(),
    }).catch(() => null);
    if (r) return (await r.json()) as PendingAction[];
  }
  return [...localStore.values()].filter((a) => a.state === "PENDING");
}
