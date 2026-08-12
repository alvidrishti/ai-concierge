# MAN — App Guide & Feature Documentation

**Author:** MD Rayhan Mia
**Generated:** 2026-08-12 07:47 UTC (real timestamp)
**Live URL:** https://ai-concierge-lake-three.vercel.app

> এটা একটা সম্পূর্ণ ডকুমেন্টেশন — কোন পেজে কী আছে, কোথায় কোন ফিচার, কীভাবে কাজ করে। (Full documentation of every page, where each feature lives, and how it works — in Bangla + English.)

---

## 1. Overview / সারসংক্ষেপ

MAN is no longer just a chat tool — it is a **Professional Life Area** (পেশাদার জীবন এলাকা) that works as a daily-life platform. After login, users land on a dashboard, not the chat.

MAN এখন শুধু চ্যাট নয় — এটি একটি **Professional Life Area** (পেশাদার জীবন এলাকা) ডেইলি-লাইফ প্ল্যাটফর্ম। লগইনের পর ব্যবহারকারী চ্যাটে নয়, ড্যাশবোর্ডে আসে।

**Languages / ভাষা:** Bangla (বাংলা), English, Hindi (हिन्दी), Urdu (اردو) — switchable from the top bar.

---

## 2. Pages / পেজসমূহ

### A) Professional Life Dashboard (Main landing / মূল পেজ)
**Login করার পর সবাই এই পেজে আসে।**

| Module | বাংলা | English | Location |
|---|---|---|---|
| Finance (অর্থ) | এই মাসের আয়, খরচ, লাভ/লোকসান, মোট ব্যালেন্স | Income, Expense, Profit/Loss, Balance | ড্যাশবোর্ডের প্রথম ট্যাব |
| Dhar/Dhon (দেনা-পাওনা) | দেনা দেওয়া, দেনা নেওয়া | Money lent/borrowed | ২য় ট্যাব |
| Daily Plan (দৈনিক তালিকা) | আজকের কাজ | Today's tasks | ৩য় ট্যাব |
| Invoices (বিল) | গ্রাহকের বিল + PDF | Customer bills + PDF | ৪র্থ ট্যাব |
| Hotels (হোটেল) | হোটেল/রিসোর্ট | Hotels/Resorts | ৫ম ট্যাব |
| Bookings (বুকিং) | থাকার বুকিং | Stays | ৬ষ্ঠ ট্যাব |
| Profile (প্রোফাইল) | নাম, ঠিকানা, ছবি | Name, address, image | ৭ম ট্যাব |
| **Chat (চ্যাট)** | ছোট FAB (নিচে ডান কোণায়) | Small floating button | 💬 |
| **Daily Life (দৈনিক জীবন)** | পূর্ণ ফিচার পেজ | Full feature page | 🏠 |

**Chat minimized:** Chat এখন ছোট একটি floating button (নিচে ডান কোণায়)। খুললে পূর্ণ চ্যাট, আর উপরে "Dashboard" বাটনে ফেরত।

**Finance colors (অর্থের রং):**
- **Green (সবুজ)** = profit / লাভ (good)
- **Red (লাল)** = loss / লোকসান (risk)
- Total balance: green (+) / red (−)

### B) Daily Life Page (দৈনিক জীবন পেজ)
Dashboard-এ "Daily Life" বাটন → এই পেজে সব ফিচারের **সম্পূর্ণ editor** আছে (নতুন হোটেল, invoice items, booking, profile edit).

### C) Chat Page (চ্যাট পেজ)
Full chat with AI (Groq/Gemini), memory, tools. উপরে "Dashboard" বাটন আছে।

---

## 3. Features / ফিচার (কোথায় কী)

### 💰 Finance (অর্থ)
- Monthly income + expense + profit/loss (har-lab)
- Total balance (all-time)
- Add income/expense with category + note
- **Location:** Dashboard → Finance tab; full editor in Daily Life
- **Chat:** "ei mashe koto khoroch hoise?" → MAN উত্তর দেয় real data থেকে

### 🤝 Dhar/Dhon Ledger (দেনা-পাওনা খাতা)
- দেনা দেওয়া (lent): কাকে, কত, কবে, কেন
- দেনা নেওয়া (borrowed): কারে কাছ থেকে, কত, কবে, কেন
- Settle/return button ("টাকা পেয়েছি" / "ফেরত দিয়েছি")
- Summary: total lent (red), total borrowed (green)
- **Location:** Dashboard → Dhar/Dhon tab
- **Chat:** দেনা নিয়ে প্রশ্ন করলে MAN উত্তর দেয়

### 📅 Daily Plan (দৈনিক তালিকা)
- Today's tasks (add, complete/toggle, delete)
- **Location:** Dashboard → Daily Plan tab

### 🧾 Invoices / Bills (বিল)
- Customer bill with line items (description, qty, price)
- Auto subtotal/total
- **PDF download** (booking confirmation / bill)
- **Location:** Dashboard → Invoices; full editor in Daily Life

### 🏨 Hotels & Resorts
- List a property (name, category, district, address, phone, price, amenities)
- Browse/search by district
- Owner-managed (only owner edits)
- **Location:** Dashboard → Hotels; full editor in Daily Life

### 🛎️ Bookings
- Customer booking (check-in/out, rooms, guests, amount)
- **Location:** Dashboard → Bookings; Daily Life

### 👤 Profile
- Name, phone, address, district, division
- Account type: Personal / Business
- Business name + type (hotel/resort/restaurant)
- **Location:** Dashboard → Profile; Daily Life

---

## 4. Language System / ভাষা ব্যবস্থা

- Top bar-এ ভাষা সুইচ (বাংলা / English / हिन्दी / اردو)
- Selection localStorage-এ save হয়, বারবার change করতে হয় না
- নতুন ভাষা যোগ করা সহজ (lib/i18n.ts-এ এক লাইনে)

---

## 5. Offline Support / অফলাইন

- **Service Worker** (`/sw.js`) static assets + pages cache করে
- Navigation network-first (data fresh), API কখনো cache হয় না (auth/data safe)
- App **installable** (PWA manifest)
- **Note:** Finance/dhar/plan data DB-তে save হয়, তাই save হতে ইন্টারনেট লাগে। কিন্তু পুরো app/UI offline-এ open হয়।

---

## 6. Chat Integration (চ্যাটে ইন্টিগ্রেশন)

MAN এখন user-এর নিজের data থেকে উত্তর দেয়:
- "ei mashe koto khoroch hoise?" → এই মাসের খরচ
- "how much did I spend this month?" → monthly expense
- দেনা-পাওনা প্রশ্ন → debt summary
- Bangla + English dua bhashay

---

## 7. Database / ডেটাবেস

| Table | ব্যবহার |
|---|---|
| `users` | অ্যাকাউন্ট (login) |
| `profiles` | নাম, ঠিকানা, account type |
| `finances` | income/expense |
| `debts` | দেনা-পাওনা ledger |
| `daily_plans` | দৈনিক তালিকা |
| `hotels` | হোটেল/রিসোর্ট |
| `bookings` | বুকিং |
| `invoices` | বিল |
| `conversations` / `conversation_threads` | চ্যাট |

---

## 8. Tech Stack

Next.js 14 · TypeScript · Supabase (PostgreSQL) · Vercel · Groq/Gemini AI · PWA/service worker

---

## 9. Notes / নোট

- **Dhar/Dhon** = দেনা-পাওনা: "কাকে টাকা দিলাম আর কারের কাছ থেকে টাকা নিলাম" — দুটোই রাখা হয়, কত/কবে/কেন সহ।
- **Hotelian** project: আগে যা বানানো হয়েছিল — এই hotel module-এর সাথে relate করলাম। আপনি Hotelian-এর feature text দিলে/বলে দিলে আমি আরও মিলিয়ে দেব।

---

## 10. Next Steps (পরবর্তী)

- Hotelian-এর পুরো feature integration (আপনার দেওয়া text অনুযায়ী)
- আরও ভাষা (আরবি, চীনা ইত্যাদি)
- Hotel থেকে customer booking UI (full)
- Hotel image upload

---

## 11. Hotelian Design Applied to MAN

Apnar **Hotelian Hishab** master spec theke MAN web app-e sobcheye important design/UX element apply kora hoyeche — kintu **Bangladesh-er sob manush er jonno** (sudhu hotel staff na).

| Hotelian concept | MAN application |
|---|---|
| Deep Navy + Gold branding | ✅ Theme now Deep Navy `#001F3F` + Gold `#D4AF37` |
| Dashboard finance summary | ✅ Monthly income/expense/savings/balance cards |
| Savings sentiment (😊😐😟) | ✅ Great (>25%) / Moderate (>0%) / Needs attention (≤0%) |
| PDF export | ✅ Finance report PDF (`/api/finance/pdf`) |
| Footer "Developed by MD RAYHAN MIA" | ✅ On dashboard |
| Dhar/dhon (lent/borrowed) | ✅ Dhar deya + dhar neya ledger |
| Multi-language | ✅ Bangla + English + Hindi + Urdu |
| Daily history / daily plan | ✅ Daily Plan (talika) |
| Chat minimized (AI as a module) | ✅ Chat is a small FAB, not the main screen |

**Not applied (hotel-specific, not needed for general users):**
- Duty Roster / grooming checklist (hotel staff only)
- 4-digit PIN local auth (MAN uses email/phone cloud auth)

**Identity note:** MAN keeps its own brand (not "Hishab Assistant") since it serves all citizens, not only hotel staff. But the design language follows Hotelian.

