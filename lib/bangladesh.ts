// MAN — BANGLADESH / CULTURAL REALITY INTELLIGENCE (Phase 10).
//
// Structured contextual knowledge about Bangladesh. This is context, NOT
// opinion: MAN uses it to be helpful about the local reality (geography,
// language, money, transport, digital behaviour) and MUST say it is uncertain
// when it does not have verified detail — never present inferred cultural
// assumptions as facts. No stereotypes.
//
// Sources are general public knowledge. Confidence is labelled. This is a
// static layer; production could hydrate it from ALVI DRISHTI "District DNA".

export interface BDContextEntry {
  category: string;
  keywords: string[];
  facts: string[];       // each a factual statement
  confidence: "high" | "medium" | "low";
}

const CONTEXT: BDContextEntry[] = [
  {
    category: "Administrative geography",
    keywords: ["division", "district", "zila", "upazila", "union", "dhaka", "chattogram", "khulna", "rajshahi", "rangpur", "barishal", "sylhet", "mymensingh", "বিভাগ", "জেলা", "উপজেলা"],
    confidence: "high",
    facts: [
      "Bangladesh has 8 divisions: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, and Mymensingh.",
      "Administrative hierarchy: division → district → upazila → union → ward/village.",
      "Rangpur Division includes Mithapukur Upazila, where MD Rayhan Mia's ancestral village is located.",
    ],
  },
  {
    category: "Language & scripts",
    keywords: ["bangla", "bengali", "banglish", "language", "script", "ভাষা", "বাংলা", "ইংরেজি"],
    confidence: "high",
    facts: [
      "Bangla (Bengali) is the national language; English is widely used in business, education and tech.",
      "'Banglish' refers to Bengali written in Latin script (e.g. 'tmi kemon acho'). It is common in informal digital communication.",
      "Many Bangladeshis code-switch between Bangla and English depending on context.",
    ],
  },
  {
    category: "Money & mobile financial services",
    keywords: ["taka", "bdt", "bikash", "bKash", "nagad", "rocket", "upay", "mobile banking", "টাকা", "বিকাশ", "নগদ"],
    confidence: "high",
    facts: [
      "The currency is the Bangladeshi Taka (BDT).",
      "Mobile financial services — bKash, Nagad, Rocket, Upay — are widely used for peer-to-peer transfers and payments.",
      "Cash is still common in rural and market settings.",
    ],
  },
  {
    category: "Employment & economy",
    keywords: ["job", "work", "garment", "remittance", "farming", "agriculture", "daily labour", "চাকরি", "কাজ", "চাষ"],
    confidence: "medium",
    facts: [
      "Key economic sectors include readymade garments, agriculture, remittances from workers abroad, and IT services.",
      "Many young Bangladeshis work in hospitality, retail, transport, construction, and increasingly in tech.",
      "Rural livelihoods include farming and daily labour; urban work is more service/office-based.",
    ],
  },
  {
    category: "Transport",
    keywords: ["bus", "train", "rickshaw", "cng", "auto", "cnc", "metro", "umbrella", "transport", "রিকশা", "বাস", "ট্রেন"],
    confidence: "high",
    facts: [
      "Common transport includes buses, trains, rickshaws, CNG autorickshaws, motorcycles and ride-sharing apps.",
      "Dhaka has a metro rail; new mass-transit is expanding.",
      "Rickshaw pulling and CNG driving are common informal livelihoods, especially in urban areas.",
    ],
  },
  {
    category: "Digital behaviour",
    keywords: ["internet", "facebook", "mobile", "smartphone", "digital", "internet speed", "ইন্টারনেট", "ফেসবুক"],
    confidence: "medium",
    facts: [
      "Smartphone and mobile internet penetration is high and growing rapidly.",
      "Facebook and messaging apps are extremely widely used for communication, commerce and news.",
      "Mobile data is the primary internet access for most users.",
    ],
  },
  {
    category: "Season & climate",
    keywords: ["monsoon", "summer", "winter", "rain", "flood", "season", "weather", "বর্ষা", "গ্রীষ্ম", "শীত"],
    confidence: "high",
    facts: [
      "Bangladesh has a tropical monsoon climate: a hot, humid summer; a rainy monsoon; and a cool, dry winter.",
      "The monsoon (roughly June–October) brings heavy rain and occasional flooding, which can disrupt travel and farming.",
      "Agriculture is closely tied to the seasonal calendar (e.g. boro/aman rice seasons).",
    ],
  },
  {
    category: "Market & commerce",
    keywords: ["bazar", "market", "grocery", "shopping", "dokan", "shop", "বাজার", "দোকান", "মার্কেট"],
    confidence: "medium",
    facts: [
      "Daily groceries are often bought from local bazaars and dokans (shops) as well as modern supermarkets.",
      "Prices can vary between bazar, neighbourhood shop, and online marketplace.",
      "E-commerce and food/grocery delivery apps are growing in cities.",
    ],
  },
];

export function retrieveBDContext(query: string): string {
  const q = query.toLowerCase();
  const hits = CONTEXT.filter((c) => c.keywords.some((k) => q.includes(k.toLowerCase())));
  if (!hits.length) return "";
  return hits.map((c) => {
    const tag = c.confidence === "high" ? "confident" : c.confidence === "medium" ? "general" : "uncertain";
    return `[Bangladesh · ${c.category} · ${tag}] ${c.facts.join(" ")}`;
  }).join("\n");
}

export function bdCategories(): string[] {
  return CONTEXT.map((c) => c.category);
}

export const BD_UNCERTAINTY = `\nNOTE: Where you are not confident about a specific Bangladesh detail (an exact number, a specific local rule, a precise current situation), say you are uncertain rather than guessing. Do not present inferred cultural assumptions as verified facts.`;
