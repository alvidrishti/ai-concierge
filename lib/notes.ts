// MAN — NOTES (first-class, Phase 6/7).
// Personal notes that appear on TODAY and live under PLAN. User-owned,
// isolated by user_id. Additive table `notes`.

import { db, dbEnabled } from "./db";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  category?: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

function iso(): string { return new Date().toISOString(); }

export async function addNote(userId: string, input: {
  title: string; body?: string; category?: string; pinned?: boolean;
}): Promise<Note | null> {
  if (!input.title || !input.title.trim()) return null;
  const row = {
    user_id: userId,
    title: input.title.trim(),
    body: input.body || "",
    category: input.category || "general",
    pinned: !!input.pinned,
    created_at: iso(),
    updated_at: iso(),
  };
  if (dbEnabled()) {
    const r = await db.insert("notes", row).catch(() => null);
    if (r && r[0]) return r[0] as Note;
  }
  return { id: "note_" + Date.now(), ...row } as Note;
}

export async function listNotes(userId: string, pinnedOnly = false): Promise<Note[]> {
  if (dbEnabled()) {
    const f = pinnedOnly
      ? `&user_id=eq.${encodeURIComponent(userId)}&pinned=eq.true&order=updated_at.desc`
      : `&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=100`;
    return (await db.select("notes", f).catch(() => [])) as Note[];
  }
  return [];
}

export async function updateNote(userId: string, id: string, patch: {
  title?: string; body?: string; category?: string; pinned?: boolean;
}): Promise<boolean> {
  if (!dbEnabled()) return false;
  const data: any = { updated_at: iso() };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body !== undefined) data.body = patch.body;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.pinned !== undefined) data.pinned = patch.pinned;
  await db.update("notes", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`, data).catch(() => {});
  return true;
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.del("notes", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
}
