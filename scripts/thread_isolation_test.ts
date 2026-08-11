// MAN — Thread isolation test.
// Run: npx tsx scripts/thread_isolation_test.ts
import { respond } from "../lib/agent";
import { memory } from "../lib/memory";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

async function main() {
  console.log("\n=== THREAD ISOLATION TEST ===\n");
  const uid = "u_tiso_" + Date.now();

  console.log("[THREAD A]");
  const a = await memory.createThread(uid);
  const r1 = await respond("আমার favourite color blue", uid, false, a.id);
  console.log("  A:", r1.text.slice(0, 60));

  console.log("[THREAD B — fresh]");
  const b = await memory.createThread(uid);
  const r2 = await respond("আমার favourite color কী?", uid, false, b.id);
  console.log("  B:", r2.text.slice(0, 120));

  const leak = /blue|নীল/.test(r2.text);
  check("THREAD A context does NOT leak into THREAD B", !leak);

  // B should not have A's messages (each thread holds only its own)
  const bMsgs = await memory.getConversation(uid, b.id, 10);
  const aMsgs = await memory.getConversation(uid, a.id, 10);
  check("THREAD B has its own messages", bMsgs.length > 0);
  check("THREAD B only contains B's messages (no A content)", !bMsgs.some((m) => /blue|নীল/.test(m.content)));
  check("THREAD A kept A's messages", aMsgs.length > 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
