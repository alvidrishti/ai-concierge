import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addNote, listNotes, updateNote, deleteNote } from "@/lib/notes";

export const runtime = "nodejs";

// GET /api/notes?pinned=1 — list the authenticated user's notes (isolated)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const pinnedOnly = new URL(req.url).searchParams.get("pinned") === "1";
  const notes = await listNotes(session.userId, pinnedOnly);
  return NextResponse.json({ notes });
}

// POST /api/notes  { title, body?, category?, pinned? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { title, body, category, pinned } = await req.json();
    const note = await addNote(session.userId, { title, body, category, pinned });
    if (!note) return NextResponse.json({ error: "title required" }, { status: 400 });
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch { return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); }
}

// PATCH /api/notes  { id, title?, body?, category?, pinned? }
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { id, title, body, category, pinned } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await updateNote(session.userId, id, { title, body, category, pinned });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); }
}

// DELETE /api/notes?id=...
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteNote(session.userId, id);
  return NextResponse.json({ ok: true });
}
