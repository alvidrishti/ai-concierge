// MAN — Free/Pro entitlement abstraction.
//
// Feature access is determined here, independent of any billing provider.
// Stripe/payment can be connected later WITHOUT rewriting this layer.
//
// Plans: 'free' (default) and 'pro'. Entitlements persist in Supabase
// (public.entitlements); an in-memory default is used when DB isn't configured.
// IMPORTANT: this is the AUTHORITATIVE check. UI must call these — never trust
// a client-supplied flag.

import { db, dbEnabled } from "./db";

export type Plan = "free" | "pro";

export interface Entitlements {
  plan: Plan;
  canVoice: boolean;
  canImage: boolean;
  canFile: boolean;
  canAdvancedModel: boolean;
  canAdvancedMemory: boolean;
  textDailyLimit: number;
}

const FREE_DEFAULTS: Entitlements = {
  plan: "free",
  canVoice: true,          // browser STT/TTS is free
  canImage: false,
  canFile: false,
  canAdvancedModel: false,
  canAdvancedMemory: false,
  textDailyLimit: 100,
};

const PRO_DEFAULTS: Entitlements = {
  plan: "pro",
  canVoice: true,
  canImage: true,
  canFile: true,
  canAdvancedModel: true,
  canAdvancedMemory: true,
  textDailyLimit: 500,
};

const cache = new Map<string, Entitlements>();

async function load(userId: string): Promise<Entitlements> {
  if (dbEnabled()) {
    const rows = await db.select("entitlements", `&user_id=eq.${encodeURIComponent(userId)}`).catch(() => []);
    if (rows.length) {
      const r = rows[0];
      return {
        plan: r.plan === "pro" ? "pro" : "free",
        canVoice: !!r.can_voice, canImage: !!r.can_image, canFile: !!r.can_file,
        canAdvancedModel: !!r.can_advanced_model, canAdvancedMemory: !!r.can_advanced_memory,
        textDailyLimit: r.text_daily_limit ?? FREE_DEFAULTS.textDailyLimit,
      };
    }
    return FREE_DEFAULTS;
  }
  return cache.get(userId) || FREE_DEFAULTS;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  return load(userId);
}

// ---- feature checks ----
export async function canUseVoice(userId: string) { return (await load(userId)).canVoice; }
export async function canUploadImage(userId: string) { return (await load(userId)).canImage; }
export async function canUploadFile(userId: string) { return (await load(userId)).canFile; }
export async function canUseAdvancedModel(userId: string) { return (await load(userId)).canAdvancedModel; }
export async function canUseAdvancedMemory(userId: string) { return (await load(userId)).canAdvancedMemory; }
export async function canUseWebSearch(userId: string) { return true; } // free for all (live API)
export async function usageLimit(userId: string) { return (await load(userId)).textDailyLimit; }

// Admin helper: set a user's plan/entitlements.
export async function setPlan(userId: string, plan: Plan): Promise<void> {
  const base = plan === "pro" ? PRO_DEFAULTS : FREE_DEFAULTS;
  const row = {
    user_id: userId, plan,
    can_voice: base.canVoice, can_image: base.canImage, can_file: base.canFile,
    can_advanced_model: base.canAdvancedModel, can_advanced_memory: base.canAdvancedMemory,
    text_daily_limit: base.textDailyLimit, updated_at: new Date().toISOString(),
  };
  if (dbEnabled()) {
    try { await db.insert("entitlements", row); }
    catch {
      await db.del("entitlements", `user_id=eq.${encodeURIComponent(userId)}`);
      await db.insert("entitlements", row);
    }
  }
  cache.set(userId, base);
}
