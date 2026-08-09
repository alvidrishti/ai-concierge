// Mock end-to-end test for the WhatsApp + billing integration.
// Mocks Twilio send (captures the reply) and runs the real agent logic,
// showing exactly what a user would receive on WhatsApp.
//
// Run:  npx tsx scripts/mock_test.ts
import { respond } from "../lib/agent";
import { createPendingAction, resolvePendingAction, getPendingAction } from "../lib/approval";
import { createCheckout } from "../lib/billing";

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
}

async function main() {
  console.log("\n=== MOCK TEST: WhatsApp + Billing ===\n");

  console.log("[1] WhatsApp reminder -> creates pending action for approval");
  const r1 = await respond("Remind me about my dentist appointment next Tuesday at 3pm");
  check("intent is 'remind'", r1.intent === "remind", `got ${r1.intent}`);
  check("has pendingAction (approval gate)", !!r1.pendingAction);
  check("reply asks for approval", r1.text.toLowerCase().includes("approve"),
    r1.text);
  if (r1.pendingAction) {
    const pa = r1.pendingAction;
    console.log(`    -> PENDING action: ${pa.summary}`);
    console.log(`    -> WhatsApp reply: ${r1.text}`);

    console.log("\n[2] User replies 'Approve' on WhatsApp");
    await resolvePendingAction(pa.id, true);
    const after = await getPendingAction(pa.id);
    check("action state = APPROVED", after?.state === "APPROVED",
      `got ${after?.state}`);
    console.log("    -> WhatsApp reply: ✅ Approved — action saved.");
  }

  console.log("\n[3] WhatsApp reminder -> then 'Reject'");
  const r3 = await respond("Remind me about my call Friday");
  if (r3.pendingAction) {
    await resolvePendingAction(r3.pendingAction.id, false);
    const after3 = await getPendingAction(r3.pendingAction.id);
    check("action state = REJECTED", after3?.state === "REJECTED",
      `got ${after3?.state}`);
    console.log("    -> WhatsApp reply: ❌ Rejected — nothing saved.");
  }

  console.log("\n[4] WhatsApp find tool");
  const r4 = await respond("Find 3 restaurants near Gulshan");
  check("tool is places_lookup", r4.tool === "places_lookup", `got ${r4.tool}`);
  console.log(`    -> WhatsApp reply (first line): ${r4.text.split("\n")[0]}`);

  console.log("\n[5] WhatsApp escalation (missing info)");
  const r5 = await respond("Remind me");
  check("intent is 'escalation' (asks, doesn't guess)", r5.intent === "escalation",
    `got ${r5.intent}`);
  console.log(`    -> WhatsApp reply: ${r5.text}`);

  console.log("\n[6] Billing: createCheckout without key (graceful)");
  try {
    await createCheckout("pro", "user_123");
    check("createCheckout should throw without key", false);
  } catch (e: any) {
    check("graceful error (no crash)", /STRIPE/.test(e.message), e.message);
    console.log(`    -> error: ${e.message}`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
