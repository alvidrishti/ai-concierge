import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAllFeedback, updateFeedback, feedbackMetrics, FEEDBACK_CATEGORIES, FeedbackStatus, FeedbackPriority } from "@/lib/feedback";

export const runtime = "nodejs";

// Admin Feedback Engine (Phase 8). Only the admin (creator) may access.
const STATUSES: FeedbackStatus[] = ["open", "in_review", "resolved", "rejected"];
const PRIORITIES: FeedbackPriority[] = ["low", "normal", "high", "critical"];

function deny(): NextResponse {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

// GET /api/admin/feedback?scope=all|metrics
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  if (session.role !== "admin") return deny();
  const scope = new URL(req.url).searchParams.get("scope") || "all";
  const list = await listAllFeedback(500);
  if (scope === "metrics") {
    return NextResponse.json({ metrics: feedbackMetrics(list) });
  }
  return NextResponse.json({ feedback: list });
}

// PATCH /api/admin/feedback  { id, status?, priority?, admin_notes?, resolution? }
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  if (session.role !== "admin") return deny();
  try {
    const body = await req.json();
    const { id, status, priority, admin_notes, resolution } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const patch: any = {};
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
      patch.status = status;
    }
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) return NextResponse.json({ error: "invalid priority" }, { status: 400 });
      patch.priority = priority;
    }
    if (admin_notes !== undefined) patch.admin_notes = admin_notes.slice(0, 4000);
    if (resolution !== undefined) patch.resolution = resolution.slice(0, 4000);
    const updated = await updateFeedback(id, patch);
    if (!updated) return NextResponse.json({ error: "feedback not found" }, { status: 404 });
    return NextResponse.json({ ok: true, feedback: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
