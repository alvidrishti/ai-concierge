// MAN — Emotion & Sentiment Engine.
//
// Detects the user's emotional state from their message so MAN can respond
// with the right tone (empathy for sad/angry, warmth for happy, calm for
// frustrated, etc.). This makes MAN feel like it actually understands the
// user instead of giving one-size-fits-all replies.
//
// Works for English + Bangla (Bangladesh market).

export type Emotion =
  | "happy" | "sad" | "angry" | "frustrated" | "anxious"
  | "grateful" | "tired" | "excited" | "neutral" | "confused";

export interface EmotionResult {
  emotion: Emotion;
  intensity: number;      // 0..1
  needsEmpathy: boolean;  // high empathy response needed
}

// Keyword signals (EN + BN).
const SIGNALS: Record<Emotion, string[]> = {
  happy: ["happy", "great", "amazing", "love it", "awesome", "yay", "খুশি", "ভালো লাগছে", "দারুণ", "চমৎকার"],
  sad: ["sad", "upset", "depressed", "down", "crying", "দুঃখ", "কষ্ট", "খারাপ লাগছে", "মন খারাপ"],
  angry: ["angry", "furious", "mad", "hate", "রাগ", "ক্ষুব্ধ"],
  frustrated: ["frustrated", "annoyed", "tired of", "useless", "boring", "হতাশ", "বিরক্ত", "কষ্টকর"],
  anxious: ["anxious", "worried", "scared", "afraid", "nervous", "উদ্বিগ্ন", "ভয়", "চিন্তা"],
  grateful: ["thank", "thanks", "grateful", "appreciate", "ধন্যবাদ", "কৃতজ্ঞ"],
  tired: ["tired", "exhausted", "sleepy", "worn out", "ক্লান্ত", "ঘুম ঘুম"],
  excited: ["excited", "can't wait", "thrilled", "excited", "উত্তেজিত", "অপেক্ষায়"],
  confused: ["confused", "don't understand", "not clear", "confused", "বুঝি না", "কনফিউজড"],
  neutral: [],
};

function detectEmotion(text: string): Emotion {
  const t = text.toLowerCase();
  // priority order: more specific first
  for (const e of ["frustrated", "anxious", "grateful", "excited", "confused", "angry", "sad", "tired", "happy"] as Emotion[]) {
    if (SIGNALS[e].some((s) => t.includes(s))) return e;
  }
  return "neutral";
}

function intensity(text: string): number {
  // exclamation, all-caps, repeated letters -> higher intensity
  let score = 0.3;
  if (/!+/.test(text)) score += 0.2;
  if (/[A-Z]{3,}/.test(text)) score += 0.15;
  if (/(\w)\1{2,}/.test(text)) score += 0.15; // "sooo", "veryyy"
  return Math.min(1, score);
}

const NEEDS_EMPATHY: Emotion[] = ["sad", "angry", "frustrated", "anxious", "tired"];

export function analyzeEmotion(text: string): EmotionResult {
  const emotion = detectEmotion(text);
  return {
    emotion,
    intensity: intensity(text),
    needsEmpathy: NEEDS_EMPATHY.includes(emotion),
  };
}

// Add an emotion/tone directive to the system prompt so the LLM replies with
// the right tone (works in both languages).
export function emotionDirective(er: EmotionResult): string {
  if (er.emotion === "neutral") return "";
  const tone: Record<Emotion, string> = {
    happy: "The user seems happy and positive. Respond with warmth and match their upbeat energy, but stay genuine.",
    sad: "The user seems sad or down. Respond with empathy and gentleness first, before any task. Be warm and supportive.",
    angry: "The user seems angry. Stay calm, acknowledge their feeling, de-escalate, and be helpful — never defensive.",
    frustrated: "The user seems frustrated. Acknowledge the frustration, reassure them, and offer a clear next step.",
    anxious: "The user seems anxious or worried. Reassure them calmly and give simple, clear guidance.",
    grateful: "The user is thankful. Acknowledge it warmly and briefly.",
    tired: "The user seems tired. Be kind, gentle and low-key.",
    excited: "The user is excited. Match the positive energy genuinely.",
    confused: "The user seems confused. Explain clearly and simply, step by step.",
    neutral: "",
  };
  return `\nEMOTION CONTEXT: ${tone[er.emotion]}`;
}
