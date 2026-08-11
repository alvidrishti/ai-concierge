// MAN — LIFE STAGE DNA LAYER (ALVI DRISHTI V22 → User Context Layer).
//
// Lightweight life-stage context (Childhood → Old Age + milestones) used to
// choose an appropriate tone/memory framing. This is CONTEXT, never an
// identity lock on a verified user. Confidence is labelled.

export interface LifeStageDna {
  stage: string;
  keywords: string[];
  themes: string[];
  tone: string;
}

const STAGES: LifeStageDna[] = [
  { stage: "childhood", keywords: ["childhood", "child", "school days", "shishu", "শৈশব", "ছোটবেলা"], themes: ["first memories", "family", "play", "school", "innocence"], tone: "warm, gentle, nostalgic" },
  { stage: "teenage", keywords: ["teenage", "teen", "adolescent", "kolpona", "কিশোর", "কৈশোর"], themes: ["identity", "friends", "dreams", "first ambitions", "school/college"], tone: "encouraging, understanding" },
  { stage: "university", keywords: ["university", "college", "student", "higher education", "বিশ্ববিদ্যালয়"], themes: ["study", "career direction", "independence", "friendships"], tone: "supportive, practical" },
  { stage: "first job", keywords: ["first job", "career start", "entry", "work life", "চাকরি"], themes: ["new skills", "financial independence", "workplace", "growth"], tone: "encouraging, grounded" },
  { stage: "adulthood", keywords: ["adult", "working", "professional", "প্রাপ্তবয়স্ক"], themes: ["responsibility", "career", "family", "goals"], tone: "practical, collaborative" },
  { stage: "old age", keywords: ["old age", "elderly", "retirement", "burdho", "বৃদ্ধ"], themes: ["reflection", "legacy", "family", "memory"], tone: "respectful, warm" },
];

export function retrieveLifeStage(query: string): LifeStageDna[] {
  const q = query.toLowerCase();
  return STAGES.filter((s) => s.keywords.some((k) => q.includes(k.toLowerCase())));
}

export function lifeStageBlock(query: string): string {
  const hits = retrieveLifeStage(query);
  if (!hits.length) return "";
  return "\nLIFE STAGE DNA (ALVI DRISHTI V22 — context):\n" +
    hits.map((s) => `- [${s.stage}] themes: ${s.themes.join(", ")}; tone: ${s.tone}.`).join("\n");
}
