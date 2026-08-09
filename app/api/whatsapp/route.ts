import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { createPendingAction, resolvePendingAction } from "@/lib/approval";
import { sendWhatsApp } from "@/lib/whatsapp";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// Inbound WhatsApp webhook (Twilio). Twilio POSTs form-encoded messages here.
// Expects body: { From, Body } — From is like "whatsapp:+8801..."
// For approval button taps, Twilio sends the button label as the Body.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const from = String(form.get("From") || "").replace("whatsapp:", "");
    const body = String(form.get("Body") || "").trim();

    if (!from || !body) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // If the inbound text looks like an approval decision for the last pending
    // action, route it to the approval gate (MAA Pillar 10).
    if (/^(approve|yes|confirm|ok)$/i.test(body)) {
      const last = (await listForUser(from)).pop();
      if (last) {
        await resolvePendingAction(last.id, true);
        await sendWhatsApp(`whatsapp:${from}`, "✅ Approved — action saved.");
        return NextResponse.json({ ok: true });
      }
    }
    if (/^(reject|no|cancel)$/i.test(body)) {
      const last = (await listForUser(from)).pop();
      if (last) {
        await resolvePendingAction(last.id, false);
        await sendWhatsApp(`whatsapp:${from}`, "❌ Rejected — nothing saved.");
        return NextResponse.json({ ok: true });
      }
    }

    // Normal agent turn — derive a stable userId from the phone number so
    // memory/conversations are isolated per WhatsApp number.
    const userId = "wa_" + from.replace(/\D+/g, "");
    const turn = await respond(body, userId, false);
    let reply = turn.text;

    // If the agent raised a pending action, tell the user to reply Approve/Reject.
    if (turn.pendingAction) {
      // Bind this pending action to the user so approval can be matched.
      await bindAction(from, turn.pendingAction.id);
      reply += "\n\nReply *Approve* or *Reject* to confirm.";
    }

    await sendWhatsApp(`whatsapp:${from}`, reply);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) },
      { status: 500 });
  }
}

// Minimal per-user pending-action binding. In production, store in Supabase:
// a small table { phone, action_id }.
const userActions = new Map<string, string[]>();
async function bindAction(phone: string, actionId: string) {
  const arr = userActions.get(phone) || [];
  arr.push(actionId);
  userActions.set(phone, arr);
}
async function listForUser(phone: string) {
  const ids = userActions.get(phone) || [];
  const { getPendingAction } = await import("@/lib/approval");
  const out = [];
  for (const id of ids) {
    const a = await getPendingAction(id);
    if (a) out.push(a);
  }
  return out;
}
