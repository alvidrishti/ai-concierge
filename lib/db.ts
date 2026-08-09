// MAN — shared Supabase REST client (service role). All queries here are
// scoped/filtered by user_id so user isolation is enforced at the data layer.

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function dbEnabled(): boolean {
  return !!url && !!key;
}

async function headers() {
  return {
    "Content-Type": "application/json",
    apikey: key || "",
    Authorization: `Bearer ${key || ""}`,
  };
}

async function request(path: string, opts: RequestInit = {}) {
  if (!dbEnabled()) throw new Error("Supabase not configured");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: { ...(await headers()), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`db ${res.status} ${body}`);
  }
  return res.json();
}

export const db = {
  select: (table: string, filter = "") => request(`${table}?select=*${filter}`),
  insert: (table: string, row: unknown) =>
    request(table, { method: "POST", body: JSON.stringify(row) }),
  update: (table: string, filter: string, patch: unknown) =>
    request(`${table}?${filter}`, { method: "PATCH", body: JSON.stringify(patch) }),
  del: (table: string, filter: string) =>
    request(`${table}?${filter}`, { method: "DELETE" }),
};
