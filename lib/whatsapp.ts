// WhatsApp helpers — Twilio Messages API + signature verification.
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env.

import { createHmac, timingSafeEqual } from "crypto";

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return false;

  const creds = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      { method: "POST", headers: { Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// R2: Verify X-Twilio-Signature.
// Twilio signs (full URL + each POST param as key+value, sorted) with HMAC-SHA1
// using the Account Auth Token. Fail CLOSED: missing token/signature -> invalid.
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken?: string,
): boolean {
  const token = authToken || process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;

  const entries = Object.keys(params).sort().map((k) => `${k}${params[k]}`);
  const payload = url + entries.join("");
  const expected = createHmac("sha1", token).update(payload).digest();
  const provided = Buffer.from(signature, "base64");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
