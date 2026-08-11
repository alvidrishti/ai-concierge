// MAN — HARDENING / INTELLIGENCE TEST SUITE (Phases 1,3,7,9,10,11,13,14).
// Runs in-process (no real DB/provider needed). Uses a real (test) AUTH_SECRET
// so hashing/verification helpers work.
// Run:  npx tsx scripts/hardening_test.ts
process.env.AUTH_SECRET = "harden_test_secret_8f2c6a9e1b4d7f3a";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
(process.env as any).NODE_ENV = "test";

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
}

async function main() {
  console.log("\n========== MAN HARDENING TEST SUITE ==========\n");

  // ---------------- PHASE 1: account lifecycle (in-memory) ----------------
  console.log("[Phase 1] Account verification lifecycle (in-memory)");
  const { createVerificationToken, consumeVerificationToken, markVerified } = await import("../lib/account");
  const t1 = await createVerificationToken("u_test_user", "email");
  check("creates a plain + hash token", !!t1.plain && !!t1.hash && t1.plain !== t1.hash);
  const bad = await consumeVerificationToken("u_test_user", "wrong-token", "email");
  check("wrong token rejected", !bad.ok, JSON.stringify(bad));
  const ok1 = await consumeVerificationToken("u_test_user", t1.plain, "email");
  check("correct token consumed once", ok1.ok, JSON.stringify(ok1));
  const replay = await consumeVerificationToken("u_test_user", t1.plain, "email");
  check("one-time: replay rejected", !replay.ok, JSON.stringify(replay));

  // wrong-user isolation
  const t2 = await createVerificationToken("u_test_other", "email");
  const crossUser = await consumeVerificationToken("u_test_user", t2.plain, "email");
  check("token is user-scoped (cannot verify another user)", !crossUser.ok, JSON.stringify(crossUser));

  // ---------------- Phase 3: capability registry + honesty ----------------
  console.log("\n[Phase 3] Capability registry + honest unknown-request engine");
  const cap = await import("../lib/capabilities");
  check("registry has entries", cap.CAPABILITY_REGISTRY.length >= 15);
  const im = cap.classifyCapabilityRequest("can you generate an image of my logo?");
  check("image generation classified as unsupported", !!im && im.capabilityId === "image_generation");
  check("honest response mentions not enabled", /not (currently )?enabled|isn'?t enabled/.test(im?.honestResponse.toLowerCase() || ""));
  const web = cap.classifyCapabilityRequest("build and deploy a complete website for my business");
  check("website generation classified as unsupported", !!web && web.capabilityId === "website_app_generation");
  const video = cap.classifyCapabilityRequest("make a video for me");
  check("video generation classified as future_pro", !!video && !!video.capability && video.capability.status === "future_pro");
  check("future_pro response mentions MAN Pro", !!(video?.honestResponse.toLowerCase().includes("man pro")));
  // A normal chat message must NOT be blocked.
  const normal = cap.classifyCapabilityRequest("what is the weather in Dhaka?");
  check("ordinary request not blocked by registry", normal === null);

  // ---------------- Phase 9: personal intelligence ----------------
  console.log("\n[Phase 9] Personal intelligence (approved facts only)");
  const pi = await import("../lib/personal_intelligence");
  const all = pi.allPersonalFacts();
  check("has structured facts with status", all.length >= 10 && all.every((f) => "status" in f && "approved" in f));
  check("all base facts approved", all.every((f) => f.approved));
  const birth = pi.retrievePersonalFacts("where was Rayhan born?");
  check("retrieves approved birthplace fact", birth.some((f) => f.fact.toLowerCase().includes("dhaka")));
  const none = pi.retrievePersonalFacts("giraffe habitat in the savanna");
  check("unrelated query returns no facts (no invented data)", none.length === 0);
  const onlyApproved = pi.retrievePersonalFacts("where does Rayhan live?");
  check("only approved facts are authoritative", onlyApproved.every((f) => f.approved));
  // Bangla personal question ("রায়হান ভাই কোথায়?") must retrieve location fact
  // (fix: broad creator-intent retrieval so MAN doesn't say "I don't know").
  const bangla = pi.retrievePersonalFacts("রায়হান ভাই কোথায়?");
  check("Bangla creator question retrieves location fact", bangla.some((f) => f.fact.toLowerCase().includes("rangpur")));

  // ---------------- Phase 10: Bangladesh context ----------------
  console.log("\n[Phase 10] Bangladesh context intelligence");
  const bd = await import("../lib/bangladesh");
  const geo = bd.retrieveBDContext("how many divisions does Bangladesh have?");
  check("returns division fact", geo.toLowerCase().includes("8 divisions"));
  const mfs = bd.retrieveBDContext("what is bKash?");
  check("returns mobile financial services context", mfs.toLowerCase().includes("bikash") || mfs.toLowerCase().includes("bkash"));
  check("has uncertainty directive text", bd.BD_UNCERTAINTY.length > 0);

  // ---------------- Phase 11: ALVI integration map ----------------
  console.log("\n[Phase 11] ALVI -> MAN integration map (pending source docs)");
  const alvi = await import("../lib/alvi_integration");
  check("pipeline has 8 stages", alvi.ALVI_PIPELINE.length === 8);
  check("mappings resolved after doc read + approval", alvi.pendingMappings().some((m) => m.status === "approved"));
  const mrMap = alvi.classifyProposal("Missing Reality Detection");
  check("Missing Reality -> uncertainty layer mapping approved", !!mrMap && mrMap.status === "approved" && mrMap.proposedManLayer.includes("Uncertainty"));

  // ---------------- Phase 12/13: uncertainty ----------------
  console.log("\n[Phase 12/13] Intelligence stack + uncertainty engine");
  const unc = await import("../lib/uncertainty");
  const noKnow = unc.assessKnowledge("what is my favorite food?", { hasPersonal: false });
  check("personal unknown -> confidence none", noKnow.confidence === "none");
  const guard = unc.uncertaintyGuard("what is my favorite food?", false);
  check("uncertainty guard returns honest response", !!guard && guard.response.length > 10);
  const know = unc.assessKnowledge("where was Rayhan born?", { hasPersonal: true });
  check("approved personal fact -> high confidence", know.confidence === "high");
  const intel = await import("../lib/intelligence");
  const ctx = intel.assembleContext("where was Rayhan born?");
  check("context fusion marks personal available", ctx.hasPersonal === true);

  // ---------------- Phase 7/8: feedback engine ----------------
  console.log("\n[Phase 7/8] Feedback engine (isolation + admin metrics)");
  const fb = await import("../lib/feedback");
  const f1 = await fb.createFeedback("u_alice", { category: "bug", message: "Chat crashed", rating: 2 });
  await fb.createFeedback("u_alice", { category: "missing_capability", message: "I want image generation", capability: "image_generation" });
  await fb.createFeedback("u_bob", { category: "feature_request", message: "Add dark mode" });
  const aliceList = await fb.listUserFeedback("u_alice");
  check("user isolation: alice sees only her 2", aliceList.length === 2);
  const allFb = await fb.listAllFeedback();
  check("admin sees all 3", allFb.length === 3);
  const metrics = fb.feedbackMetrics(allFb);
  check("metrics: total 3", metrics.total === 3);
  check("metrics: open 3", metrics.open === 3);
  check("metrics: high-priority (bug) present", metrics.highPriority >= 1);
  check("capability request grouped", metrics.capabilityRequests["image_generation"] === 1);
  const updated = await fb.updateFeedback(f1.id, { status: "resolved", resolution: "fixed" });
  check("feedback update resolves", updated?.status === "resolved" && !!updated.resolved_at);
  const afterMetrics = fb.feedbackMetrics(await fb.listAllFeedback());
  check("metrics: resolved increments", afterMetrics.resolved === 1);

  // ---------------- Phase 14: roadmap statuses ----------------
  console.log("\n[Phase 14] Capability roadmap buckets");
  const summary = cap.capabilitySummary();
  check("has available + requires_credential buckets", summary.available >= 5 && summary.requires_credential >= 3);
  check("has future_pro bucket", summary.future_pro >= 2);

  // ---------------- ALVI DRISHTI integration (Phases 0-3) ----------------
  console.log("\n[ALVI] District DNA (V20)");
  const dna = await import("../lib/district_dna");
  const rangpur = dna.retrieveDistrictDna("tell me about Rangpur district");
  check("Rangpur District DNA retrieved", rangpur.some((d) => d.district === "Rangpur"));
  check("District DNA has mandatory fields", rangpur.length > 0 && rangpur[0].economy.length > 0 && rangpur[0].food.length > 0);
  check("seeded district count >= 2", dna.districtCount() >= 2);

  console.log("[ALVI] Profession DNA (V21)");
  const prof = await import("../lib/profession_dna");
  const farmer = prof.retrieveProfessionDna("how does a farmer live in Bangladesh");
  check("Farmer Profession DNA retrieved", farmer.some((p) => p.profession === "Farmer"));
  const hotel = prof.retrieveProfessionDna("hotel f&b waiter");
  check("Hotel/F&B Profession DNA retrieved", hotel.some((p) => p.profession.toLowerCase().includes("f&b")));

  console.log("[ALVI] Life Stage DNA (V22)");
  const ls = await import("../lib/life_stage_dna");
  check("life stage retrieved", ls.retrieveLifeStage("teenage dreams").length > 0);

  console.log("[ALVI] Sovereign Truth Layer (V23/V25)");
  const truth = await import("../lib/truth");
  const well = truth.evaluateTruth({ claim: "x", evidence: [
    { description: "a", source: "s1", independent: true },
    { description: "b", source: "s2", independent: true },
    { description: "c", source: "s3", independent: true },
  ], methodDisclosed: true, statedConfidence: 0.9 });
  check("well-evidenced scores high", well.sovereigntyScore >= 60, `got ${well.sovereigntyScore}`);
  const poor = truth.evaluateTruth({ claim: "y", evidence: [], methodDisclosed: false, statedConfidence: null });
  check("no-evidence scores unsupported", poor.classification.startsWith("Unsupported"), poor.classification);
  check("truth disclaimer present", truth.TRUTH_DISCLAIMER.length > 10);

  console.log("[ALVI] Missing Future gap engine (V23/V25)");
  const mf = await import("../lib/missing_future");
  const gap = mf.analyzeFutureGap({
    subject: "teen", presentAttributes: ["has_goal"], expectedAttributes: ["has_goal", "has_mentorship", "has_resources"], activeBlockers: ["lack_of_opportunity"],
  });
  check("gap score bounded 0-100", gap.futureLossScore >= 0 && gap.futureLossScore <= 100, `got ${gap.futureLossScore}`);
  check("recovery action from blocker map", gap.recoveryActions.length > 0);
  check("explicitly not a prediction", gap.isPrediction === false);
  check("gap disclaimer present", mf.GAP_DISCLAIMER.length > 10);

  console.log("[ALVI] Missing Reality detection (V23)");
  const unc2 = await import("../lib/uncertainty");
  const mrtest = unc2.detectMissingReality("what opportunities am I missing as a person?", { hasPersonal: false });
  check("detects missing personal dimension", mrtest.missingCount >= 1);
  const mrFull = unc2.detectMissingReality("what is the economy of Kurigram?", { hasDistrict: true });
  check("complete when dimensions present", mrFull.complete === true || mrFull.missingCount === 0);

  console.log("[ALVI] Capability demand insight (Phase 3)");
  const insight = cap.capabilityDemandInsight(["image_generation", "image_generation", "video_generation"]);
  check("capability demand sorted by requests", insight.length === 2 && insight[0].requests === 2);
  check("image generation stays future_pro in roadmap", insight.find((i) => i.capId === "image_generation")?.status === "future_pro");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
