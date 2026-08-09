// MAN — Personal AI Intelligence Agent.
//
// A real AI agent (not a rule-based chatbot). It:
//  1. Builds a system prompt from MAN's identity + relevant knowledge
//     (retrieveKnowledge) + user memory + recent conversation context.
//  2. Routes to an LLM via the provider router (lib/llm.ts).
//  3. Detects tool actions (reminder, places lookup) and routes them with a
//     human-in-the-loop approval gate (MAA Pillar 10).
//  4. Never fabricates: if no provider is available it says so clearly.
//  5. Is fully multi-user (userId scopes all memory/conversations).

import { memory } from "./memory";
import { route, LLMResult } from "./llm";
import { retrieveKnowledge } from "./knowledge";
import { placesLookup } from "./places";
import { createPendingAction, PendingAction } from "./approval";
import { dbEnabled } from "./db";

export interface Turn {
  role: "assistant";
  text: string;
  provider?: string;
  tool?: string;
  pendingAction?: PendingAction | null;
  memoryUsed?: boolean;
}

const IDENTITY = `You are MAN, a Personal AI Intelligence Agent.
Created by MD Rayhan Mia, based in Rangpur, Bangladesh.
You are a professional, reliable, private personal AI assistant.
- Be honest. Never fabricate facts, data, or sources.
- If you don't know something, say so clearly.
- Keep responses concise, clear and helpful. Use markdown for lists/code when useful.
- You are NOT a generic chatbot — you are MD Rayhan Mia's personal AI assistant.`;

function buildSystem(userId: string, userMemory: { key: string; value: string }[], knowledge: string, isAdmin: boolean): string {
  const memBlock = userMemory.length
    ? `\nUser memory:\n${userMemory.map((m) => `- ${m.key}: ${m.value}`).join("\n")}`
    : "\nUser memory: (none yet — only state something as a user fact if the user tells you.)";
  const kbBlock = knowledge ? `\nRelevant knowledge about the creator (use only if relevant):\n${knowledge}` : "";
  const role = isAdmin ? " (this user is the creator/admin)" : "";
  return `${IDENTITY}${role}\nCurrent user id: ${userId}${memBlock}${kbBlock}`;
}

function isToolIntent(msg: string): "reminder" | "find" | null {
  const low = msg.toLowerCase();
  if (/remind|reminder|appointment|schedule|book/.test(low)) return "reminder";
  if (/find|compare|options|near|suggest|recommend/.test(low)) return "find";
  return null;
}

export async function respond(rawMessage: string, userId: string, isAdmin = false): Promise<Turn> {
  const msg = rawMessage.trim();
  const low = msg.toLowerCase();

  // ---- multi-user + memory ----
  const userMemory = await memory.getMemory(userId);
  const history = await memory.getConversation(userId, 6);

  // persist the user's message
  await memory.saveConversation(userId, "user", msg);

  // ---- Human-in-the-loop escalation for tools with missing info ----
  const tool = isToolIntent(msg);

  if (tool === "reminder" && !/(next|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d)/.test(low)) {
    return { role: "assistant", text: "When should I set the reminder? I need a day or a time (e.g. \"next Tuesday at 3pm\")." };
  }
  if (tool === "find" && !low.includes(" near ") && !low.includes(" in ")) {
    return { role: "assistant", text: "Where? Give me a location so I can compare options near you (e.g. \"near Dhanmondi\")." };
  }

  // ---- Tool: places lookup (safe, answer directly) ----
  if (tool === "find") {
    const near = low.match(/near\s+(.+)/)?.[1].split(" and ")[0].split(" compare")[0].trim();
    const query = low.replace(/^(find|compare|show|suggest|recommend|list)\s+/, "")
      .replace(/\s*(compare|options|and compare|list)$/, "").replace(/\s+near.*/, "").replace(/^\d+\s+/, "").trim();
    const results = placesLookup(query, near, 3);
    const text = results.length
      ? `Here are ${results.length} option${results.length > 1 ? "s" : ""} for "${query}"${near ? " near " + near : ""}:\n\n` +
        results.map((r, i) => `${i + 1}. ${r.name} (${r.area}) — ★${r.rating}, ${r.price}\n   ${r.description}\n   ${r.address}`).join("\n\n")
      : `I couldn't find "${query}"${near ? " near " + near : ""} in my local directory.`;
    await memory.saveConversation(userId, "assistant", text);
    return { role: "assistant", text, tool: "places_lookup", memoryUsed: true };
  }

  // ---- Tool: reminder (consequential -> approval gate) ----
  if (tool === "reminder") {
    const when = low.match(/(next \w+day|tomorrow|today)( at \d{1,2}(:\d{2})?\s*(am|pm))?/)?.[0] || "soon";
    let what = low.match(/about\s+(.+)/)?.[1].trim() || "your appointment";
    what = what.replace(/\s*at\s+\d{1,2}(:\d{2})?\s*(am|pm)$/, "").replace(/\s*(next \w+day|tomorrow|today)$/, "").trim();
    const pending = await createPendingAction(userId, "create_reminder",
      `Create reminder: "${what}" on ${when}`,
      `MAN wants to schedule a reminder for "${what}" on ${when}. Approve to save it.`);
    const text = `I'd like to set a reminder for "${what}" on ${when}. Approve below and I'll save it.`;
    await memory.saveConversation(userId, "assistant", text);
    return { role: "assistant", text, pendingAction: pending, tool: "reminder", memoryUsed: true };
  }

  // ---- General conversation -> LLM router ----
  const knowledge = retrieveKnowledge(msg);
  const system = buildSystem(userId, userMemory, knowledge, isAdmin);
  const historyBlock = history.length
    ? `\nRecent conversation:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}`
    : "";

  const result: LLMResult = await route(`${msg}${historyBlock}`, system);

  if (!result.ok) {
    const text = dbEnabled()
      ? "I'm having trouble reaching my AI model providers right now. Please try again in a moment."
      : "AI providers aren't configured yet. Set GEMINI_API_KEY (or Groq/OpenRouter) in your environment to enable AI responses. You can still use my reminder and local-lookup tools.";
    await memory.saveConversation(userId, "assistant", text);
    return { role: "assistant", text, provider: "none" };
  }

  await memory.saveConversation(userId, "assistant", result.text, result.provider);
  return { role: "assistant", text: result.text, provider: result.provider, memoryUsed: true };
}
