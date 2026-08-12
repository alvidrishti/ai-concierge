// MAN — DAILY-LIFE PLATFORM (2027 expansion)
//
// Turns MAN into a daily-life tool for every citizen AND a business tool for
// hotels/resorts/restaurants:
//   - profiles      : personal info (name, address, image) + business account
//   - daily_plans   : the daily talika (schedule / to-do)
//   - hotels        : hotel/resort listings (owner-managed)
//   - bookings      : customer bookings
//   - invoices      : business bills for customers (with PDF)
//
// All per-user isolated via user_id / business_id at the data layer.

import { db, dbEnabled } from "./db";

// ---------------- PROFILES ----------------
export async function getProfile(userId: string): Promise<any | null> {
  if (!dbEnabled()) return null;
  const rows = await db.select("profiles", `&user_id=eq.${encodeURIComponent(userId)}`).catch(() => []);
  return rows[0] || null;
}

export async function upsertProfile(userId: string, patch: any): Promise<any> {
  if (!dbEnabled()) return patch;
  const row = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
  try {
    const r = await db.insert("profiles", row);
    if (r && r[0]) return r[0];
  } catch {
    await db.del("profiles", `user_id=eq.${encodeURIComponent(userId)}`);
    const r = await db.insert("profiles", row);
    if (r && r[0]) return r[0];
  }
  return row;
}

// ---------------- DAILY PLANS (talika) ----------------
export async function listPlans(userId: string, date?: string): Promise<any[]> {
  if (!dbEnabled()) return [];
  const f = date
    ? `&user_id=eq.${encodeURIComponent(userId)}&date=eq.${encodeURIComponent(date)}&order=time.asc`
    : `&user_id=eq.${encodeURIComponent(userId)}&order=date.desc,time.asc&limit=200`;
  return (await db.select("daily_plans", f).catch(() => [])) as any[];
}

export async function addPlan(userId: string, p: {
  date: string; time?: string; title: string; category?: string; note?: string;
}): Promise<any> {
  if (!dbEnabled()) return p;
  const row = { user_id: userId, date: p.date, time: p.time || "", title: p.title, category: p.category || "task", note: p.note || "", done: false };
  const r = await db.insert("daily_plans", row).catch(() => null);
  if (r && r[0]) return r[0];
  return row;
}

export async function togglePlan(planId: string, userId: string, done: boolean): Promise<void> {
  if (!dbEnabled()) return;
  await db.update("daily_plans", `id=eq.${planId}&user_id=eq.${encodeURIComponent(userId)}`, { done }).catch(() => {});
}

export async function deletePlan(planId: string, userId: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.del("daily_plans", `id=eq.${planId}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
}

// ---------------- HOTELS ----------------
export async function listHotels(filter?: { district?: string; ownerId?: string }): Promise<any[]> {
  if (!dbEnabled()) return [];
  let f = "&order=created_at.desc";
  if (filter?.district) f += `&district=eq.${encodeURIComponent(filter.district)}`;
  if (filter?.ownerId) f += `&owner_id=eq.${encodeURIComponent(filter.ownerId)}`;
  return (await db.select("hotels", f).catch(() => [])) as any[];
}

export async function getHotel(id: string): Promise<any | null> {
  if (!dbEnabled()) return null;
  const rows = await db.select("hotels", `&id=eq.${id}`).catch(() => []);
  return rows[0] || null;
}

export async function upsertHotel(ownerId: string, h: any): Promise<any> {
  if (!dbEnabled()) return h;
  const row = { ...h, owner_id: ownerId, updated_at: new Date().toISOString() };
  if (h.id) {
    await db.update("hotels", `id=eq.${h.id}&owner_id=eq.${encodeURIComponent(ownerId)}`, row).catch(() => {});
    return { ...row, id: h.id };
  }
  const r = await db.insert("hotels", row).catch(() => null);
  if (r && r[0]) return r[0];
  return row;
}

export async function deleteHotel(id: string, ownerId: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.del("hotels", `id=eq.${id}&owner_id=eq.${encodeURIComponent(ownerId)}`).catch(() => {});
}

// ---------------- BOOKINGS ----------------
export async function createBooking(b: any): Promise<any> {
  if (!dbEnabled()) return b;
  const row = { ...b, status: b.status || "confirmed" };
  const r = await db.insert("bookings", row).catch(() => null);
  if (r && r[0]) return r[0];
  return row;
}

export async function listBookingsForHotel(hotelId: string): Promise<any[]> {
  if (!dbEnabled()) return [];
  return (await db.select("bookings", `&hotel_id=eq.${hotelId}&order=created_at.desc`).catch(() => [])) as any[];
}

export async function listMyBookings(userId: string): Promise<any[]> {
  if (!dbEnabled()) return [];
  return (await db.select("bookings", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`).catch(() => [])) as any[];
}

// ---------------- INVOICES ----------------
export async function createInvoice(inv: any): Promise<any> {
  if (!dbEnabled()) return inv;
  const row = { ...inv, status: inv.status || "unpaid" };
  const r = await db.insert("invoices", row).catch(() => null);
  if (r && r[0]) return r[0];
  return row;
}

export async function listInvoices(businessId: string): Promise<any[]> {
  if (!dbEnabled()) return [];
  return (await db.select("invoices", `&business_id=eq.${encodeURIComponent(businessId)}&order=created_at.desc`).catch(() => [])) as any[];
}

export async function getInvoice(id: string): Promise<any | null> {
  if (!dbEnabled()) return null;
  const rows = await db.select("invoices", `&id=eq.${id}`).catch(() => []);
  return rows[0] || null;
}

export async function markInvoicePaid(id: string, businessId: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.update("invoices", `id=eq.${id}&business_id=eq.${encodeURIComponent(businessId)}`, { status: "paid" }).catch(() => {});
}
