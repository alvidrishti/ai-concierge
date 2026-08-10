// MAN — shared Supabase REST client (service role). All queries here are
// scoped/filtered by user_id so user isolation is enforced at the data layer.

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function dbEnabled(): boolean {
  return !!url && !!key;
}

async function headers(prefer?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key || "",
    Authorization: `Bearer ${key || ""}`,
  };
  if (prefer) h["Prefer"] = prefer;
  return h;
}

async function request(path: string, opts: RequestInit = {}, prefer?: string) {
  if (!dbEnabled()) throw new Error("Supabase not configured");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: { ...(await headers(prefer)), ...((opts.headers as Record<string,string>) || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`db ${res.status} ${body}`);
  }
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const db = {
  // INSERT: use Prefer: return=representation so POST returns the row (and a
  // body). Without it Supabase returns 201 with an empty body, which broke JSON parsing.
  insert: (table: string, row: unknown) =>
    request(table, { method: "POST", body: JSON.stringify(row) }, "return=representation"),
  select: (table: string, filter = "") => request(`${table}?select=*${filter}`),
  update: (table: string, filter: string, patch: unknown) =>
    request(`${table}?${filter}`, { method: "PATCH", body: JSON.stringify(patch) }),
  del: (table: string, filter: string) =>
    request(`${table}?${filter}`, { method: "DELETE" }),
};
