import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { resolvePendingAction } from "@/lib/approval";
import { sendWhatsApp, verifyTwilioSignature } from "@/lib/whatsapp";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// R2: Build the full request URL Twilio signed. Behind a proxy, reconstruct
// from forwarded headers so signature verification is correct.
function requestUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const path = new URL(req.url).pathname;
  const search = new URL(req.url).search;
  return `${proto}://${host}${path}${search}`;
}

// Inbound WhatsApp webhook (Twilio). Requires a valid X-Twilio-Signature.
// Spoofed requests are rejected BEFORE any action/approval can occur.
export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-twilio-signature");
    const url = requestUrl(req);

    // Gather POST params for signature + processing.
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) params[k] = String(v);

    // R2: verify signature — reject spoofed requests before anything else.
    if (!verifyTwilioSignature(url, params, signature)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const from = String(params.From || "").replace("whatsapp:", "");
    const body = String(params.Body || "").trim();
    if (!from || !body) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const userId = "wa_" + from.replace(/\D+/g, "");

    // Approval decisions (user-scoped)
    if (/^(approve|yes|confirm|ok)$/i.test(body)) {
      const last = (await listForUser(from)).pop();
      if (last) {
        await resolvePendingAction(last.id, true, userId);
        await sendWhatsApp(`whatsapp:${from}`, "✅ Approved — action saved.");
        return NextResponse.json({ ok: true });
      }
    }
    if (/^(reject|no|cancel)$/i.test(body)) {
      const last = (await listForUser(from)).pop();
      if (last) {
        await resolvePendingAction(last.id, false, userId);
        await sendWhatsApp(`whatsapp:${from}`, "❌ Rejected — nothing saved.");
        return NextResponse.json({ ok: true });
      }
    }

    const turn = await respond(body, userId, false);
    let reply = turn.text;
    if (turn.pendingAction) {
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

// Per-user pending-action binding (dev in-memory; production -> Supabase).
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
    const a = await getPendingAction(id, "wa_" + phone.replace(/\D+/g, ""));
    if (a) out.push(a);
  }
  return out;
}
