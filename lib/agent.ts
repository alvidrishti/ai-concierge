// AI Concierge — core agent logic (ported from the portfolio demo).
// Demonstrates: persistent memory, tool use, orchestration, and
// human-in-the-loop escalation (MAA v4.0 Pillar 10).

import { memory } from "./memory";
import { placesLookup } from "./places";
import { createPendingAction, PendingAction } from "./approval";

export interface Turn {
  role: "user" | "assistant";
  text: string;
  intent?: string;
  pendingAction?: PendingAction | null;
  tool?: string;
  memoryUsed?: boolean;
}

const INTENTS = [
  ["remind", ["remind", "reminder", "appointment", "book", "schedule"]],
  ["find", ["find", "options", "compare", "near", "suggest", "recommend"]],
  ["weather", ["weather"]],
  ["preference", ["call me", "i am", "i'm", "my name", "prefer"]],
  ["greeting", ["hi", "hello", "hey", "good morning", "good evening"]],
  ["reschedule", ["reschedule", "move it", "move the", "change the appointment"]],
  ["help", ["help"]],
] as const;

function detectIntent(msg: string): string {
  const m = msg.toLowerCase();
  for (const [intent, words] of INTENTS) {
    if (words.some((w) => m.includes(w))) return intent;
  }
  return "fallback";
}

export async function respond(rawMessage: string): Promise<Turn> {
  const msg = rawMessage.trim();
  const low = msg.toLowerCase();
  const intent = detectIntent(low);

  // ---- HUMAN-IN-THE-LOOP escalation: missing info -> ask (never guess) ----
  if (intent === "remind" && !/(next|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d)/.test(low)) {
    return { role: "assistant", intent: "escalation",
      text: "When should I set the reminder? I need a day or a time (e.g. \"next Tuesday at 3pm\")." };
  }
  if (intent === "find" && !low.includes(" near ") && !low.includes(" in ")) {
    return { role: "assistant", intent: "escalation",
      text: "Where? Give me a location so I can compare options near you (e.g. \"near Dhanmondi\")." };
  }

  const prefs = await memory.getProfile();

  if (intent === "greeting") {
    const name = prefs.name;
    return { role: "assistant", intent: "greeting", memoryUsed: !!name,
      text: name
        ? `Hi, ${name}! I'm your concierge — I can set reminders, find & compare options, check weather, and remember your preferences.`
        : "Hi! I'm your concierge — I can set reminders, find & compare options, check weather, and remember your preferences." };
  }

  if (intent === "preference") {
    const m = low.match(/(?:call me|i am|i'm|my name is)\s+([a-z]+)/);
    if (m) {
      await memory.setPreference("name", m[1].charAt(0).toUpperCase() + m[1].slice(1));
      return { role: "assistant", intent: "preference", memoryUsed: true,
        text: `Got it, I'll remember you as ${m[1].charAt(0).toUpperCase() + m[1].slice(1)}. Persistent memory saved across sessions.` };
    }
    return { role: "assistant", intent: "preference", text: "I've noted your preference. Anything else?" };
  }

  if (intent === "find") {
    // extract query + near
    const nearMatch = low.match(/near\s+(.+)/);
    const near = nearMatch ? nearMatch[1].split(" and ")[0].split(" compare")[0].trim() : undefined;
    let query = low.replace(/^(find|compare|show|suggest|recommend|list)\s+/, "").replace(/\s*(compare|options|and compare|list)$/, "").replace(/\s+near.*/, "").replace(/^\d+\s+/, "").trim();
    const results = placesLookup(query, near, 3);
    if (near) {
      const lines = results.map((r, i) =>
        `${i + 1}. ${r.name} (${r.area}) — ${"★".repeat(Math.round(r.rating))} ${r.rating}, ${r.price}\n   ${r.description}\n   ${r.address}`);
      return { role: "assistant", intent: "find", tool: "places_lookup", memoryUsed: true,
        text: `Here are 3 options for "${query}" near ${near.charAt(0).toUpperCase() + near.slice(1)}:\n\n${lines.join("\n\n")}\n\nWant me to compare them on price/rating, or narrow it down?` };
    }
    const lines = results.map((r, i) => `${i + 1}. ${r.name} (${r.area}) — ★ ${r.rating}`);
    return { role: "assistant", intent: "find", tool: "places_lookup", memoryUsed: true,
      text: `Here are some options for "${query}":\n${lines.join("\n")}` };
  }

  if (intent === "remind") {
    // Extract what + when
    const when = low.match(/(next \w+day|tomorrow|today)( at \d{1,2}(:\d{2})?\s*(am|pm))?/)?.[0] || "soon";
    const whatMatch = low.match(/about\s+(.+)/);
    let what = whatMatch ? whatMatch[1].trim() : "";
    what = what.replace(/\s*at\s+\d{1,2}(:\d{2})?\s*(am|pm)$/, "")   // trailing " at 3pm"
             .replace(/\s*(next \w+day|tomorrow|today)$/, "")        // trailing " next tuesday"
             .trim();
    if (!what) what = "your appointment";
    // ---- APPROVAL GATE (Pillar 10): pending until human approves ----
    const pendingAction = await createPendingAction(
      "create_reminder",
      `Create reminder: "${what}" on ${when}`,
      `The agent wants to schedule a reminder for "${what}" on ${when}. Approve to save it.`
    );
    return { role: "assistant", intent: "remind", pendingAction, memoryUsed: true,
      text: `I'd like to set a reminder for "${what}" on ${when}. Approve below and I'll save it.` };
  }

  if (intent === "reschedule") {
    const list = await memory.listReminders();
    if (!list.length) {
      return { role: "assistant", intent: "reschedule", text: "You don't have any reminders to reschedule yet." };
    }
    return { role: "assistant", intent: "reschedule",
      text: `Which one, and to when? Here's your schedule:\n${list.map((r) => `- ${r.title} (${r.when})`).join("\n")}` };
  }

  if (intent === "help") {
    return { role: "assistant", intent: "help",
      text: "Try: \"Remind me about my dentist appointment next Tuesday\", \"Find 3 coffee shops near Dhanmondi\", \"Call me Ray\", \"I need to reschedule something\"." };
  }

  return { role: "assistant", intent: "fallback",
    text: "I can help with reminders, finding & comparing options, weather, and remembering your preferences." };
}
