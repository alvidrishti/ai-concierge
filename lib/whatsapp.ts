// WhatsApp helper — Twilio Messages API.
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env.

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return false;

  const creds = btoa(`${sid}:${token}`);
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
