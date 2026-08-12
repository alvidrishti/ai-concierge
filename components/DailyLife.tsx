"use client";
// MAN — Daily-Life Platform dashboard (2027 expansion)
// Personal daily planner + profile + hotels/resorts + bookings + invoices.

import React, { useEffect, useState } from "react";
import { tr, LANGS, detectLang, saveLang, Lang } from "@/lib/i18n";

type Tab = "home" | "plans" | "profile" | "hotels" | "bookings" | "invoices";

export default function DailyLife({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [lang, setLang] = useState<Lang>(detectLang());
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [planDate, setPlanDate] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [hotels, setHotels] = useState<any[]>([]);
  const [myHotels, setMyHotels] = useState<any[]>([]);
  const [district, setDistrict] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dirty, setDirty] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  // profile form
  const [pf, setPf] = useState<any>({});
  // hotel form
  const [hf, setHf] = useState<any>({});
  // invoice form
  const [invf, setInvf] = useState<any>({ customer_name: "", customer_phone: "", item_desc: "", item_qty: 1, item_price: 0, items: [] as any[] });

  async function api(path: string, opts?: any) {
    const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
    return r.json();
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function loadProfile() {
    const d = await api("/api/profile");
    if (d.profile) { setProfile(d.profile); setPf({ ...d.profile }); }
  }
  async function loadPlans() {
    const d = await api("/api/plans?date=" + today);
    setPlans(d.plans || []);
  }
  async function loadHotels() {
    const q = district ? "?district=" + encodeURIComponent(district) : "";
    const d = await api("/api/hotels" + q);
    setHotels(d.hotels || []);
  }
  async function loadMyHotels() {
    const d = await api("/api/hotels?mine=true");
    setMyHotels(d.hotels || []);
  }
  async function loadBookings() {
    const d = await api("/api/bookings");
    setBookings(d.bookings || []);
  }
  async function loadInvoices() {
    const d = await api("/api/invoices");
    setInvoices(d.invoices || []);
  }

  useEffect(() => {
    loadProfile(); loadPlans(); loadHotels(); loadMyHotels(); loadBookings(); loadInvoices();
  }, [dirty]);

  async function saveProfile() {
    const d = await api("/api/profile", { method: "PATCH", body: JSON.stringify(pf) });
    if (d.ok) { setProfile(d.profile); flash("Profile saved ✓"); loadProfile(); }
    else flash(d.error || "Couldn't save");
  }

  async function addPlan() {
    if (!planTitle.trim()) { flash("Plan title required"); return; }
    const d = await api("/api/plans", { method: "POST", body: JSON.stringify({ date: planDate || today, time: planTime, title: planTitle, category: "task" }) });
    if (d.ok) { flash("Added to your day ✓"); setPlanTitle(""); setDirty(dirty + 1); }
    else flash(d.error || "Couldn't add");
  }
  async function togglePlan(id: string, done: boolean) {
    await api("/api/plans", { method: "PATCH", body: JSON.stringify({ action: "toggle", id, done }) });
    setDirty(dirty + 1);
  }
  async function delPlan(id: string) {
    await api("/api/plans?id=" + id, { method: "DELETE" });
    setDirty(dirty + 1);
  }

  async function saveHotel() {
    if (!hf.name?.trim()) { flash("Hotel name required"); return; }
    const d = await api("/api/hotels", { method: "POST", body: JSON.stringify(hf) });
    if (d.ok) { flash("Hotel saved ✓"); setHf({}); setDirty(dirty + 1); }
    else flash(d.error || "Couldn't save");
  }
  async function delHotel(id: string) {
    await api("/api/hotels?id=" + id, { method: "DELETE" });
    setDirty(dirty + 1);
  }

  function addInvoiceItem() {
    if (!invf.item_desc.trim() || !invf.item_price) return;
    setInvf((s: any) => ({ ...s, items: [...s.items, { description: s.item_desc, qty: s.item_qty, price: s.item_price }], item_desc: "", item_qty: 1, item_price: 0 }));
  }
  async function saveInvoice() {
    if (!invf.customer_name.trim()) { flash("Customer name required"); return; }
    if (invf.items.length === 0) { flash("Add at least one line item"); return; }
    const d = await api("/api/invoices", { method: "POST", body: JSON.stringify({ customer_name: invf.customer_name, customer_phone: invf.customer_phone, items: invf.items }) });
    if (d.ok) { flash(`Invoice ${d.invoice.invoice_no} created ✓`); setInvf({ customer_name: "", customer_phone: "", item_desc: "", item_qty: 1, item_price: 0, items: [] }); setDirty(dirty + 1); }
    else flash(d.error || "Couldn't create invoice");
  }
  function downloadPdf(id: string) {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  }

  const nav: { id: Tab; label: string }[] = [
    { id: "home", label: tr("home", lang) },
    { id: "plans", label: tr("nav_plans", lang) },
    { id: "hotels", label: tr("nav_hotels", lang) },
    { id: "bookings", label: tr("my_bookings", lang) },
    { id: "invoices", label: tr("nav_invoices", lang) },
    { id: "profile", label: tr("nav_profile", lang) },
  ];

  return (
    <div className="dash">
      {/* top bar */}
      <div className="dash-top">
        <button className="icon-btn" onClick={onBack} title="Back to MAN" aria-label="Back">←</button>
        <div className="dash-title">{tr("nav_daily", lang)}</div>
        <div className="lang-switch">
          {LANGS.map((l) => (
            <button key={l.id} className={`lang-btn ${lang === l.id ? "active" : ""}`}
              onClick={() => { setLang(l.id); saveLang(l.id); }}>
              {l.native}
            </button>
          ))}
        </div>
        {msg && <div className="dash-msg">{msg}</div>}
      </div>

      {/* nav */}
      <div className="dash-nav">
        {nav.map((n) => (
          <button key={n.id} className={`dash-tab ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
            {n.label}
          </button>
        ))}
      </div>

      <div className="dash-body">
        {/* ============ HOME ============ */}
        {tab === "home" && (
          <div className="dash-home">
            <h2>Welcome back{profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""} 👋</h2>
            <p className="dash-lead">MAN is now your daily-life companion — plan your day, find places, run your business.</p>
            <div className="dash-cards">
              <button className="dash-card" onClick={() => setTab("plans")}><b>📅 Daily Plan</b><span>Schedule today&apos;s tasks &amp; to-dos</span></button>
              <button className="dash-card" onClick={() => setTab("hotels")}><b>🏨 Hotels & Resorts</b><span>Discover or list your property</span></button>
              <button className="dash-card" onClick={() => setTab("bookings")}><b>🧾 My Bookings</b><span>Track your stays</span></button>
              <button className="dash-card" onClick={() => setTab("invoices")}><b>💼 Business Bills</b><span>Create customer invoices & download PDF</span></button>
              <button className="dash-card" onClick={() => setTab("profile")}><b>👤 Profile</b><span>Edit your name, address & image</span></button>
            </div>
          </div>
        )}

        {/* ============ DAILY PLAN ============ */}
        {tab === "plans" && (
          <div className="dash-section">
            <h3>Daily Plan — {planDate || today}</h3>
            <div className="dash-form-row">
              <input className="dash-input" type="date" value={planDate || today} onChange={(e) => setPlanDate(e.target.value)} />
              <input className="dash-input" type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} />
              <input className="dash-input grow" placeholder="What do you need to do?" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlan()} />
              <button className="dash-btn" onClick={addPlan}>Add</button>
            </div>
            <div className="dash-list">
              {plans.length === 0 && <p className="dash-empty">No tasks for today yet. Add your first one above.</p>}
              {plans.map((p) => (
                <div key={p.id} className={`dash-item ${p.done ? "done" : ""}`}>
                  <button className="dash-check" onClick={() => togglePlan(p.id, !p.done)}>{p.done ? "☑" : "☐"}</button>
                  <span className="dash-item-time">{p.time || "–"}</span>
                  <span className="dash-item-title">{p.title}</span>
                  {p.note && <span className="dash-item-note">{p.note}</span>}
                  <button className="dash-del" onClick={() => delPlan(p.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ HOTELS ============ */}
        {tab === "hotels" && (
          <div className="dash-section">
            <h3>Hotels & Resorts</h3>
            <div className="dash-form-row">
              <input className="dash-input grow" placeholder="Search by district (e.g. Cox's Bazar)" value={district} onChange={(e) => setDistrict(e.target.value)} />
              <button className="dash-btn" onClick={loadHotels}>Search</button>
            </div>

            {/* my hotels (business) */}
            <h4>Your listed properties</h4>
            {myHotels.length === 0 && <p className="dash-empty">You haven&apos;t listed a property yet. Use the form below to add one.</p>}
            {myHotels.map((h) => (
              <div key={h.id} className="dash-item">
                <span className="dash-item-title"><b>{h.name}</b> · {h.category}</span>
                <span className="dash-item-note">{h.district}{h.address ? " — " + h.address : ""}</span>
                <button className="dash-del" onClick={() => delHotel(h.id)}>✕</button>
              </div>
            ))}

            <h4>List a property</h4>
            <div className="dash-form-col">
              <input className="dash-input" placeholder="Property name" value={hf.name || ""} onChange={(e) => setHf({ ...hf, name: e.target.value })} />
              <div className="dash-form-row">
                <input className="dash-input" placeholder="Category (hotel/resort/restaurant)" value={hf.category || ""} onChange={(e) => setHf({ ...hf, category: e.target.value })} />
                <input className="dash-input" placeholder="District" value={hf.district || ""} onChange={(e) => setHf({ ...hf, district: e.target.value })} />
              </div>
              <input className="dash-input" placeholder="Address" value={hf.address || ""} onChange={(e) => setHf({ ...hf, address: e.target.value })} />
              <input className="dash-input" placeholder="Phone" value={hf.phone || ""} onChange={(e) => setHf({ ...hf, phone: e.target.value })} />
              <input className="dash-input" placeholder="Price range (budget/mid/premium/luxury)" value={hf.price_range || ""} onChange={(e) => setHf({ ...hf, price_range: e.target.value })} />
              <textarea className="dash-input" rows={2} placeholder="Description / amenities (comma-separated: wifi, pool, ac)" value={hf.description || ""} onChange={(e) => setHf({ ...hf, description: e.target.value })} />
              <button className="dash-btn" onClick={saveHotel}>Save property</button>
            </div>

            {/* browse */}
            <h4>Browse properties</h4>
            {hotels.length === 0 && <p className="dash-empty">No properties found. Search a district above.</p>}
            {hotels.map((h) => (
              <div key={h.id} className="dash-item">
                <span className="dash-item-title"><b>{h.name}</b> · {h.category}</span>
                <span className="dash-item-note">{h.district}{h.address ? " — " + h.address : ""}{h.phone ? " · " + h.phone : ""}</span>
              </div>
            ))}
          </div>
        )}

        {/* ============ BOOKINGS ============ */}
        {tab === "bookings" && (
          <div className="dash-section">
            <h3>My Bookings</h3>
            {bookings.length === 0 && <p className="dash-empty">No bookings yet. (Booking from a hotel listing is coming in the next step.)</p>}
            {bookings.map((b) => (
              <div key={b.id} className="dash-item">
                <span className="dash-item-title"><b>{b.guest_name}</b> · {b.check_in} → {b.check_out}</span>
                <span className="dash-item-note">{b.rooms} room(s) · {b.guests} guest(s) · ৳{b.amount} · <b className={b.status === "confirmed" ? "ok" : ""}>{b.status}</b></span>
              </div>
            ))}
          </div>
        )}

        {/* ============ INVOICES ============ */}
        {tab === "invoices" && (
          <div className="dash-section">
            <h3>Business Invoices / Bills</h3>
            <p className="dash-lead">Create a customer bill and download it as a PDF confirmation.</p>
            <div className="dash-form-col">
              <div className="dash-form-row">
                <input className="dash-input grow" placeholder="Customer name" value={invf.customer_name} onChange={(e) => setInvf({ ...invf, customer_name: e.target.value })} />
                <input className="dash-input" placeholder="Phone" value={invf.customer_phone} onChange={(e) => setInvf({ ...invf, customer_phone: e.target.value })} />
              </div>
              <div className="dash-form-row">
                <input className="dash-input grow" placeholder="Item (e.g. Deluxe Room)" value={invf.item_desc} onChange={(e) => setInvf({ ...invf, item_desc: e.target.value })} />
                <input className="dash-input" style={{ width: 70 }} type="number" placeholder="Qty" value={invf.item_qty} onChange={(e) => setInvf({ ...invf, item_qty: Number(e.target.value) })} />
                <input className="dash-input" style={{ width: 90 }} type="number" placeholder="Price" value={invf.item_price} onChange={(e) => setInvf({ ...invf, item_price: Number(e.target.value) })} />
                <button className="dash-btn" onClick={addInvoiceItem}>+</button>
              </div>
              {invf.items.map((it: any, i: number) => (
                <div key={i} className="dash-item"><span>{it.description} × {it.qty}</span><span>৳{(it.qty * it.price).toFixed(2)}</span></div>
              ))}
              <button className="dash-btn" onClick={saveInvoice}>Create invoice</button>
            </div>

            <h4>Your invoices</h4>
            {invoices.length === 0 && <p className="dash-empty">No invoices yet.</p>}
            {invoices.map((inv) => (
              <div key={inv.id} className="dash-item">
                <span className="dash-item-title"><b>{inv.invoice_no}</b> · {inv.customer_name} · ৳{inv.total}</span>
                <span className="dash-item-note">{inv.status}</span>
                <button className="dash-btn small" onClick={() => downloadPdf(inv.id)}>PDF</button>
              </div>
            ))}
          </div>
        )}

        {/* ============ PROFILE ============ */}
        {tab === "profile" && (
          <div className="dash-section">
            <h3>Your Profile</h3>
            <p className="dash-lead">This is what others see. Set your name, address, and account type.</p>
            <div className="dash-form-col">
              <input className="dash-input" placeholder="Full name" value={pf.full_name || ""} onChange={(e) => setPf({ ...pf, full_name: e.target.value })} />
              <input className="dash-input" placeholder="Phone" value={pf.phone || ""} onChange={(e) => setPf({ ...pf, phone: e.target.value })} />
              <input className="dash-input" placeholder="Address" value={pf.address || ""} onChange={(e) => setPf({ ...pf, address: e.target.value })} />
              <div className="dash-form-row">
                <input className="dash-input" placeholder="District" value={pf.district || ""} onChange={(e) => setPf({ ...pf, district: e.target.value })} />
                <input className="dash-input" placeholder="Division" value={pf.division || ""} onChange={(e) => setPf({ ...pf, division: e.target.value })} />
              </div>
              <select className="dash-input" value={pf.account_type || "personal"} onChange={(e) => setPf({ ...pf, account_type: e.target.value })}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
              {pf.account_type === "business" && (
                <>
                  <input className="dash-input" placeholder="Business name" value={pf.business_name || ""} onChange={(e) => setPf({ ...pf, business_name: e.target.value })} />
                  <input className="dash-input" placeholder="Business type (hotel/resort/restaurant)" value={pf.business_type || ""} onChange={(e) => setPf({ ...pf, business_type: e.target.value })} />
                </>
              )}
              <button className="dash-btn" onClick={saveProfile}>Save profile</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
