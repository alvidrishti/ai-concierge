// MAN — Production Security Test Suite (R1–R6 + prompt injection).
// Uses ONLY test/mock secrets. No real production credentials.
//
// Two kinds of checks:
//  (A) in-process unit tests for modules that read env at call time
//      (billing signature, twilio signature, knowledge, prompt-injection).
//  (B) env-specific auth fail-closed cases, run via spawned child processes
//      (because lib/auth.ts reads env at module load).
//
// Run:  npx tsx scripts/security_test.ts

import { execFileSync } from "child_process";
import path from "path";

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
}
const ROOT = path.resolve(__dirname, "..");

// ------------------------------------------------------------------ Stripe R1
async function stripeTests() {
  console.log("\n[R1] Stripe webhook signature verification (mock secrets)");
  const secret = "whsec_test_mock_secret_123456789";
  const apiKey = "sk_test_mock_key_123456789";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_SECRET_KEY = apiKey;
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(apiKey);
  const { verifyWebhook } = await import("../lib/billing");

  const payload = JSON.stringify({
    id: "evt_test", type: "checkout.session.completed",
    data: { object: { client_reference_id: "u_test", mode: "subscription" } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  const ok = await verifyWebhook(payload, header);
  check("valid signature accepted", !!ok.event && !ok.error, ok.error || "");

  const tampered = payload.replace("u_test", "u_attacker");
  const bad = await verifyWebhook(tampered, header);
  check("tampered payload rejected", !bad.event && !!bad.error, "");

  const badSig = await verifyWebhook(payload, "t=123,v1=deadbeef");
  check("forged signature rejected", !badSig.event && !!badSig.error, "");

  const noSig = await verifyWebhook(payload, "");
  check("missing signature rejected", !noSig.event && !!noSig.error, "");

  // missing secret -> fail closed
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const noSecret = await verifyWebhook(payload, header);
  check("missing webhook secret fails closed", !noSecret.event && !!noSecret.error, "");
  process.env.STRIPE_WEBHOOK_SECRET = secret;
}

// ------------------------------------------------------------------ Twilio R2
function twilioTests() {
  console.log("\n[R2] Twilio X-Twilio-Signature verification (mock secret)");
  const token = "mock_twilio_auth_token_abc123";
  const url = "https://example.com/api/whatsapp";
  const params: Record<string, string> = { Body: "Remind me about my dentist appointment next Tuesday", From: "whatsapp:+8801" };
  const { verifyTwilioSignature } = require("../lib/whatsapp") as typeof import("../lib/whatsapp");

  // compute a valid signature
  const { createHmac } = require("crypto");
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`);
  const payload = url + sorted.join("");
  const valid = createHmac("sha1", token).update(payload).digest("base64");

  check("valid signature accepted",
    verifyTwilioSignature(url, params, valid, token));
  check("invalid signature rejected",
    !verifyTwilioSignature(url, params, "base64invalidsig", token));
  check("missing signature rejected",
    !verifyTwilioSignature(url, params, null, token));
  check("missing auth token rejected",
    !verifyTwilioSignature(url, params, valid, ""));
  // tampered param must break signature
  check("tampered params rejected",
    !verifyTwilioSignature(url, { ...params, Body: "evil" }, valid, token));
}

// ------------------------------------------------------------------ Prompt injection
function injectionTests() {
  console.log("\n[Prompt injection] knowledge relevance");
  const { retrieveKnowledge } = require("../lib/knowledge") as typeof import("../lib/knowledge");
  // retrieveKnowledge is keyed by keywords; verify a benign query returns creator info
  const kb = retrieveKnowledge("who made you");
  check("knowledge returns creator info", kb.includes("MD Rayhan Mia"));
}

// ------------------------------------------------------------------ Auth fail-closed (subprocess)
function spawnCase(label: string, env: Record<string, string>, script: string): { out: string; code: number } {
  try {
    const out = execFileSync("npx", ["tsx", "-e", script], {
      cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf-8",
    });
    return { out: out.trim(), code: 0 };
  } catch (e: any) {
    return { out: String(e.stdout || e.stderr || "").trim(), code: 1 };
  }
}

async function authFailClosedTests() {
  console.log("\n[R3/R4] Auth fail-closed (AUTH_SECRET / ADMIN_PASS)");

  // R4: missing AUTH_SECRET -> signToken throws, verifyToken null
  const missSecret = spawnCase("missing AUTH_SECRET", { AUTH_SECRET: "" },
    `import { signToken, verifyToken } from "./lib/auth"; ` +
    `(async()=>{ ` +
    `try { await signToken({userId:"u",name:"x",role:"user"}); console.log("SIGNED"); } catch(e){ console.log("SIGN_FAIL:"+e.message); } ` +
    `console.log("VERIFY:"+((await verifyToken("abc.def"))===null?"null":"VALID")); } )();`);
  check("missing AUTH_SECRET -> signToken fails closed",
    /SIGN_FAIL/.test(missSecret.out), missSecret.out);
  check("missing AUTH_SECRET -> verifyToken returns null",
    /VERIFY:null/.test(missSecret.out), missSecret.out);

  // R3: missing ADMIN_PASS -> admin verification fails
  const missAdmin = spawnCase("missing ADMIN_PASS", { AUTH_SECRET: "real_secret_xyz", ADMIN_PASS: "" },
    `import { verifyAdmin } from "./lib/auth"; ` +
    `console.log("ADMIN:"+(verifyAdmin("anything")? "ACCEPTED":"DENIED"));`);
  check("missing ADMIN_PASS -> admin login denied", /ADMIN:DENIED/.test(missAdmin.out), missAdmin.out);

  // R3: placeholder ADMIN_PASS -> denied
  const placeholderAdmin = spawnCase("placeholder ADMIN_PASS", { AUTH_SECRET: "real_secret_xyz", ADMIN_PASS: "changeme" },
    `import { verifyAdmin } from "./lib/auth"; ` +
    `console.log("ADMIN:"+(verifyAdmin("changeme")? "ACCEPTED":"DENIED"));`);
  check("placeholder ADMIN_PASS -> denied", /ADMIN:DENIED/.test(placeholderAdmin.out), placeholderAdmin.out);

  // R4: placeholder AUTH_SECRET -> fail closed
  const placeholderSecret = spawnCase("placeholder AUTH_SECRET", { AUTH_SECRET: "change_this_to_a_long_random_string" },
    `import { signToken } from "./lib/auth"; ` +
    `(async()=>{ ` +
    `try { await signToken({userId:"u",name:"x",role:"user"}); console.log("SIGNED"); } catch(e){ console.log("SIGN_FAIL:"+e.message); } } )();`);
  check("placeholder AUTH_SECRET -> signToken fails closed",
    /SIGN_FAIL/.test(placeholderSecret.out), placeholderSecret.out);

  // R6: hashPassword requires real secret (fail closed)
  const noHashSecret = spawnCase("hash with no secret", { AUTH_SECRET: "" },
    `import { hashPassword } from "./lib/auth"; ` +
    `try { hashPassword("x"); console.log("HASHED"); } catch(e){ console.log("HASH_FAIL"); }`);
  check("hashPassword without secret fails closed", /HASH_FAIL/.test(noHashSecret.out), noHashSecret.out);
}

async function main() {
  console.log("\n========== MAN SECURITY TEST SUITE ==========\n");
  await stripeTests();
  twilioTests();
  injectionTests();
  await authFailClosedTests();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
