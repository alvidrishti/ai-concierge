import { NextResponse } from "next/server";
import { db, dbEnabled } from "@/lib/db";
import { consumeVerificationToken, markVerified } from "@/lib/account";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS } from "@/lib/ratelimit";

export const runtime = "nodejs";

// GET /api/auth/verify-email?token=...&uid=...
// Consumes the one-time, hashed, expiring verification token. On success marks
// email_verified_at and sets status = active. One-time use + attempt-limited.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const uid = url.searchParams.get("uid") || "";
    if (!token || !uid) {
      return html("Verification failed: missing token.", false);
    }
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: "verify_email_" + uid });
    if (!rl.allowed) {
      return html("Too many attempts. Please try again later.", false);
    }
    if (!dbEnabled()) {
      return html("Verification requires a configured database.", false);
    }

    const account = await db.select("users", `&id=eq.${encodeURIComponent(uid)}`).catch(() => []);
    if (!account.length) {
      return html("Verification failed: account not found.", false);
    }

    const res = await consumeVerificationToken(uid, token, "email");
    if (!res.ok) {
      return html(`Verification failed: ${res.reason || "invalid or expired token"}.`, false);
    }

    await markVerified(uid, "email");
    return html("Email verified! Your MAN account is now active. You can close this tab and log in.", true);
  } catch (e: any) {
    return html("Verification failed. Please try again.", false);
  }
}

function html(message: string, ok: boolean): Response {
  const body = `<!doctype html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0b0e14;color:#e5e7eb">
  <div style="max-width:420px;text-align:center;padding:32px">
    <h1 style="font-size:28px;margin:0 0 12px">MAN</h1>
    <p>Personal AI Intelligence Agent</p>
    <div style="margin-top:20px;padding:16px;border:1px solid #2b3342;border-radius:12px;font-size:15px;color:${ok ? "#34d399" : "#f87171"}">${message}</div>
  </div></body></html>`;
  return new Response(body, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
