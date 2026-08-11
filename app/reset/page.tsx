"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ManLogo from "@/components/ManLogo";

export default function ResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setErr("No reset token provided. Use the link from your reset email.");
  }, [token]);

  async function submit() {
    if (!pass) { setErr("Enter a new password."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pass !== confirm) { setErr("Passwords do not match."); return; }
    setBusy(true); setErr(""); setMsg("");
    const res = await fetch("/api/auth/reset", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: pass }) });
    const d = await res.json();
    setBusy(false);
    if (d.ok) { setDone(true); setMsg(d.message || "Password updated."); }
    else setErr(d.error || "Couldn't reset password.");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><ManLogo size={52} /></div>
        <h1>{done ? "Password updated" : "Set a new password"}</h1>
        <p className="auth-sub">{done ? "You can now log in with your new password." : "Enter your new password below."}</p>

        {!done ? (
          <>
            <div className="auth-field">
              <label htmlFor="reset-pass">New password</label>
              <input id="reset-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>
            <div className="auth-field">
              <label htmlFor="reset-confirm">Confirm new password</label>
              <input id="reset-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Re-enter password" autoComplete="new-password" />
            </div>
            {err && <div className="auth-err" role="alert">{err}</div>}
            {msg && <div className="auth-ok">{msg}</div>}
            <button className="auth-btn" onClick={submit} disabled={busy}>{busy ? "Updating…" : "Reset password"}</button>
            <a className="link-btn" href="/" style={{ textAlign: "center" }}>Back to login</a>
          </>
        ) : (
          <>
            <div className="auth-ok">{msg}</div>
            <a className="auth-btn" href="/" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Go to login</a>
          </>
        )}
      </div>
    </div>
  );
}
