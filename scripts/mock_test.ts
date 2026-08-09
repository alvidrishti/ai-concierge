// Mock end-to-end test for the MAN agent (voice/whatsapp + billing paths).
// Runs the real agent logic and shows exactly what a user would receive.
// Run:  npx tsx scripts/mock_test.ts
import { respond } from "../lib/agent";
import { resolvePendingAction, getPendingAction } from "../lib/approval";
import { createCheckout } from "../lib/billing";
import { retrieveKnowledge } from "../lib/knowledge";

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
}

async function main() {
  console.log("\n=== MOCK TEST: MAN Agent ===\n");
  const userId = "u_test";

  console.log("[1] Reminder -> creates pending action for approval");
  const r1 = await respond("Remind me about my dentist appointment next Tuesday at 3pm", userId);
  check("tool is 'reminder'", r1.tool === "reminder", `got ${r1.tool}`);
  check("has pendingAction (approval gate)", !!r1.pendingAction);
  check("reply asks for approval", r1.text.toLowerCase().includes("approve"), r1.text);
  if (r1.pendingAction) {
    console.log(`    -> PENDING: ${r1.pendingAction.summary}`);
    console.log("[2] Approve");
    await resolvePendingAction(r1.pendingAction.id, true, userId);
    const after = await getPendingAction(r1.pendingAction.id, userId);
    check("state = APPROVED", after?.state === "APPROVED", `got ${after?.state}`);
  }

  console.log("\n[3] Reminder -> Reject");
  const r3 = await respond("Remind me about my call Friday", userId);
  if (r3.pendingAction) {
    await resolvePendingAction(r3.pendingAction.id, false, userId);
    const a3 = await getPendingAction(r3.pendingAction.id, userId);
    check("state = REJECTED", a3?.state === "REJECTED", `got ${a3?.state}`);
  }

  console.log("\n[4] Places lookup tool");
  const r4 = await respond("Find 3 restaurants near Gulshan", userId);
  check("tool is places_lookup", r4.tool === "places_lookup", `got ${r4.tool}`);
  console.log(`    -> ${r4.text.split("\n")[0]}`);

  console.log("\n[5] Escalation (missing info -> asks, doesn't guess)");
  const r5 = await respond("Remind me", userId);
  check("asks for a time", r5.text.toLowerCase().includes("when should"), r5.text);

  console.log("\n[6] Knowledge retrieval");
  const kb = retrieveKnowledge("who made you");
  check("returns creator knowledge", kb.includes("MD Rayhan Mia"), kb);

  console.log("\n[7] Billing: createCheckout without key (graceful)");
  try {
    await createCheckout("pro", "u_test");
    check("createCheckout should throw without key", false);
  } catch (e: any) {
    check("graceful error (no crash)", /STRIPE/.test(e.message), e.message);
    console.log(`    -> ${e.message}`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
