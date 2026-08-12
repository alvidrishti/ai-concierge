// MAN — Multi-language system (Bangla, English, Hindi, Urdu + extensible)
// Centralized translations so every page can switch language.
// Store the selected language in localStorage; default to Bangla.

export type Lang = "bn" | "en" | "hi" | "ur";

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "bn", label: "Bangla", native: "বাংলা" },
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "ur", label: "Urdu", native: "اردو" },
];

// Translation dictionary: key -> { lang: text }
const T: Record<string, Record<Lang, string>> = {
  // navigation
  nav_finance: { bn: "অর্থ (Finance)", en: "Finance", hi: "वित्त", ur: "مالیات" },
  nav_debts: { bn: "দেনা-পাওনা (Dhar)", en: "Debts", hi: "उधार", ur: "ادھار" },
  nav_plans: { bn: "দৈনিক তালিকা", en: "Daily Plan", hi: "दैनिक योजना", ur: "روزمرہ منصوبہ" },
  nav_invoices: { bn: "বিল (Invoice)", en: "Invoices", hi: "बिल", ur: "بل" },
  nav_hotels: { bn: "হোটেল-রিসোর্ট", en: "Hotels", hi: "होटल", ur: "ہوٹل" },
  nav_bookings: { bn: "বুকিং", en: "Bookings", hi: "बुकिंग", ur: "بکنگ" },
  nav_profile: { bn: "প্রোফাইল", en: "Profile", hi: "प्रोफ़ाइल", ur: "پروفائل" },
  nav_chat: { bn: "চ্যাট", en: "Chat", hi: "चैट", ur: "چیٹ" },
  nav_daily: { bn: "দৈনিক জীবন", en: "Daily Life", hi: "दैनिक जीवन", ur: "روزمرہ زندگی" },
  dash_title: { bn: "পেশাদার জীবন এলাকা", en: "Professional Life Area", hi: "व्यावसायिक जीवन क्षेत्र", ur: "پیشہ ورانہ زندگی کے شعبے" },

  // finance
  month_income: { bn: "এই মাসের আয়", en: "This Month Income", hi: "इस महीने की आय", ur: "اس ماہ کی آمدنی" },
  month_expense: { bn: "এই মাসের খরচ", en: "This Month Expense", hi: "इस महीने का खर्च", ur: "اس ماہ کا خرچ" },
  har_labh: { bn: "লাভ / লোকসান", en: "Profit / Loss", hi: "लाभ / हानि", ur: "نفع / نقصان" },
  total_balance: { bn: "মোট জমা-খরচ", en: "Total Balance", hi: "कुल शेष", ur: "کل بیلنس" },
  good_profit: { bn: "ভাল — লাভ (সবুজ)", en: "Good — profit (green)", hi: "अच्छा — लाभ (हरा)", ur: "اچھا — نفع (سبز)" },
  risk_loss: { bn: "ঝুঁকি — লোকসান (লাল)", en: "Risk — loss (red)", hi: "जोखिम — हानि (लाल)", ur: "خطرہ — نقصان (سرخ)" },
  khoroch: { bn: "খরচ", en: "Expense", hi: "खर्च", ur: "خرچ" },
  income: { bn: "আয়", en: "Income", hi: "आय", ur: "आमदनी" },
  add: { bn: "যোগ করুন", en: "Add", hi: "जोड़ें", ur: "شامل کریں" },
  recent: { bn: "সাম্প্রতিক", en: "Recent", hi: "हालिया", ur: "حال ہی میں" },
  taka: { bn: "টাকা", en: "Taka", hi: "रुपये", ur: "روپے" },
  note_opt: { bn: "নোট (ঐচ্ছিক)", en: "Note (optional)", hi: "नोट (वैकल्पिक)", ur: "نوٹ (اختیاری)" },

  // debts
  debts_title: { bn: "দেনা-পাওনা খাতা", en: "Debt / Credit Ledger", hi: "उधार खाता", ur: "ادھار کھاتہ" },
  lent_label: { bn: "দেনা দেওয়া", en: "Money Lent Out", hi: "उधार दिया", ur: "ادھار دیا" },
  borrowed_label: { bn: "দেনা নেওয়া", en: "Money Borrowed", hi: "उधार लिया", ur: "ادھار لیا" },
  dhar_deya: { bn: "দেনা দিয়েছি (খোলা)", en: "Lent (open)", hi: "दिया (खुला)", ur: "دیا (کھلا)" },
  dhar_neya: { bn: "দেনা নিয়েছি (খোলা)", en: "Borrowed (open)", hi: "लिया (खुला)", ur: "लिया (کھلا)" },
  lent_btn: { bn: "দেনা দিয়েছি", en: "I lent", hi: "मैंने दिया", ur: "میں نے دیا" },
  borrow_btn: { bn: "দেনা নিয়েছি", en: "I borrowed", hi: "मैंने लिया", ur: "میں نے لیا" },
  person_label: { bn: "কে / কার কাছ থেকে", en: "To / From whom", hi: "किसको / किससे", ur: "کس کو / کس سے" },
  reason_label: { bn: "কেন / কারণ", en: "Why / reason", hi: "क्यों / कारण", ur: "کیوں / وجہ" },
  got_back: { bn: "টাকা পেয়েছি", en: "Got back", hi: "वापस मिला", ur: "واپس مل گیا" },
  returned: { bn: "ফেরত দিয়েছি", en: "Returned", hi: "लौटाया", ur: "واپس کیا" },
  records: { bn: "রেকর্ড", en: "Records", hi: "रिकॉर्ड", ur: "ریکارڈز" },

  // daily plan
  todays_plan: { bn: "আজকের পরিকল্পনা", en: "Today's Plan", hi: "आज की योजना", ur: "آج کا منصوبہ" },
  add_task: { bn: "আজকের কাজ যোগ করুন", en: "Add a task for today", hi: "आज के लिए कार्य जोड़ें", ur: "آج کے لیے کام شامل کریں" },
  nothing_planned: { bn: "আজ কোনো কাজ নেই", en: "Nothing planned today", hi: "आज कुछ नहीं", ur: "آج کچھ نہیں" },

  // misc
  welcome: { bn: "স্বাগতম", en: "Welcome", hi: "स्वागत है", ur: "خوش آمدید" },
  back_dash: { bn: "ড্যাশবোর্ড", en: "Dashboard", hi: "डैशबोर्ड", ur: "ڈیش بورڈ" },
  open_chat: { bn: "MAN-এর সাথে চ্যাট", en: "Chat with MAN", hi: "MAN से चैट", ur: "MAN سے چیٹ" },
  view_invoice_editor: { bn: "বিল এডিটর খুলুন", en: "Open invoice editor", hi: "बिल संपादक खोलें", ur: "بل ایڈیٹر کھولیں" },
  manage_hotels: { bn: "হোটেল পরিচালনা", en: "Manage hotels", hi: "होटल प्रबंधित करें", ur: "ہوٹل منظم کریں" },
  debts_lead: { bn: "কে কাকে কত টাকা দিল, কত নিল, কবে, কেন — সব লিখে রাখুন", en: "Record who lent/borrowed how much, when, and why", hi: "किसने कितना उधार दिया/लिया, कब, क्यों — लिखें", ur: "کس نے کتنا ادھار دیا/لیا، کب، کیوں — لکھیں" },
  inv_lead: { bn: "গ্রাহকের বিল তৈরি করুন এবং PDF ডাউনলোড করুন।", en: "Create customer bills & download as PDF.", hi: "ग्राहक बिल बनाएं और PDF डाउनलोड करें।", ur: "گاہک کے بل بنائیں اور PDF ڈاؤن لوڈ کریں۔" },
  hotel_lead: { bn: "হোটেল তালিকাভুক্ত করুন বা খুঁজুন।", en: "List or browse properties.", hi: "होटल सूचीबद्ध करें या खोजें।", ur: "ہوٹل درج کریں یا تلاش کریں۔" },
  book_lead: { bn: "আপনার বুকিং পরিচালনা করুন।", en: "Manage your stays.", hi: "अपनी बुकिंग प्रबंधित करें।", ur: "اپنی بکنگ منظم کریں۔" },
  profile_lead: { bn: "নাম, ঠিকানা, অ্যাকাউন্ট টাইপ সম্পাদনা করুন।", en: "Edit name, address, account type.", hi: "नाम, पता, खाता प्रकार संपादित करें।", ur: "نام، پتہ، اکاؤنٹ کی قسم میں ترمیم کریں۔" },
  open_bookings: { bn: "বুকিং খুলুন", en: "Open bookings", hi: "बुकिंग खोलें", ur: "بکنگ کھولیں" },
  edit_profile: { bn: "প্রোফাইল সম্পাদনা", en: "Edit profile", hi: "प्रोफ़ाइल संपादित करें", ur: "پروفائل میں ترمیم کریں" },
  home: { bn: "হোম", en: "Home", hi: "होम", ur: "ہوم" },
  my_bookings: { bn: "আমার বুকিং", en: "My Bookings", hi: "मेरी बुकिंग", ur: "میری بکنگ" },
  daily_lead: { bn: "MAN এখন আপনার দৈনন্দিন জীবনের সঙ্গী — দিন পরিকল্পনা করুন, জায়গা খুঁজুন, ব্যবসা চালান।", en: "MAN is now your daily-life companion — plan your day, find places, run your business.", hi: "MAN अब आपका दैनिक जीवन साथी है — दिन की योजना बनाएं, स्थान खोजें, व्यवसाय चलाएं।", ur: "MAN اب آپ کا روزمرہ ساتھی ہے — دن کی منصوبہ بندی کریں، جگہ تلاش کریں، کاروبار چلائیں۔" },
  welcome_back: { bn: "ফিরে আসার জন্য স্বাগতম", en: "Welcome back", hi: "वापसी पर स्वागत है", ur: "واپسی پر خوش آمدید" },
  find_places: { bn: "জায়গা ও থাকার ব্যবস্থা", en: "Hotels & Resorts", hi: "होटल और रिसॉर्ट", ur: "ہوٹل اور ریزورٹ" },
  business_bills: { bn: "ব্যবসায়িক বিল", en: "Business Bills", hi: "व्यावसायिक बिल", ur: "کاروباری بل" },
  schedule_today: { bn: "আজকের কাজ সাজান", en: "Schedule today's tasks", hi: "आज के कार्य निर्धारित करें", ur: "آج کے کام طے کریں" },
  track_stays: { bn: "আপনার থাকা ট্র্যাক করুন", en: "Track your stays", hi: "अपनी बुकिंग ट्रैक करें", ur: "اپنی بکنگ ٹریک کریں" },
  edit_your_profile: { bn: "নাম, ঠিকানা ও ছবি সম্পাদনা", en: "Edit name, address & image", hi: "नाम, पता व छवि संपादित करें", ur: "نام، پتہ اور تصویر میں ترمیم کریں" },
};

// Get a translated string; fall back to the key if missing.
export function tr(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

// Detect language from localStorage (client-only), default Bangla.
export function detectLang(): Lang {
  if (typeof window === "undefined") return "bn";
  try {
    const l = window.localStorage.getItem("man_lang") as Lang;
    if (l && T && LANGS.some((x) => x.id === l)) return l;
  } catch {}
  return "bn";
}

export function saveLang(lang: Lang): void {
  try { window.localStorage.setItem("man_lang", lang); } catch {}
}
