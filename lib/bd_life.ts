// MAN — DAILY-LIFE BANGLADESH ASSISTANT (BD 2027, option A)
//
// Practical daily-life help for Bangladeshis: transport, market, education,
// govt services, utilities. This is contextual knowledge MAN uses naturally
// alongside its general knowledge. Confidence labelled. No stereotypes.

export interface BDHelpEntry {
  category: string;
  keywords: string[];        // EN + BN triggers
  facts: string[];           // practical guidance
  confidence: "high" | "medium" | "low";
}

const HELP: BDHelpEntry[] = [
  {
    category: "Transport",
    keywords: ["bus", "train", "rickshaw", "cng", "launch", "transport", "bus counter", "rail", "বাস", "ট্রেন", "রিকশা", "লঞ্চ", "পরিবহন"],
    confidence: "medium",
    facts: [
      "Bus and CNG autorickshaw are the most common urban transport; rickshaw is common for short trips.",
      "Bangladesh Railway runs trains between divisions; tickets can be booked online or at counters.",
      "Ride-sharing apps (Uber, Pathao) operate in major cities like Dhaka and Chattogram.",
      "For long-distance river routes, launch/steamer services operate, especially in the south.",
    ],
  },
  {
    category: "Market & prices",
    keywords: ["price", "market", "bazar", "grocery", "vegetable", "fish price", "shop", "দাম", "বাজার", "মাছ", "সবজি", "কেজি"],
    confidence: "medium",
    facts: [
      "Daily groceries are typically bought from local bazars; prices vary by area and season.",
      "Fish and vegetable prices fluctuate daily and by season (monsoon vs winter).",
      "For fair prices, compare between local bazar, neighbourhood shop, and online delivery apps.",
    ],
  },
  {
    category: "Education & exams",
    keywords: ["exam", "admission", "ssc", "hsc", "university", "admission test", "result", "school", "পড়াশোনা", "পরীক্ষা", "ভর্তি", "রেজাল্ট", "কলেজ", "বিশ্ববিদ্যালয়"],
    confidence: "medium",
    facts: [
      "Public exam results (SSC/HSC) are published on education board websites.",
      "University admission tests (Dhaka, RU, etc.) are competitive and have specific application windows.",
      "Admission notices are usually announced on the university's official website.",
    ],
  },
  {
    category: "Govt services",
    keywords: ["govt", "nid", "passport", "birth certificate", "voter", "eksheba", "services", "সরকারি", "এনআইডি", "পাসপোর্ট", "জন্ম নিবন্ধন", "ভোটার"],
    confidence: "medium",
    facts: [
      "NID (national ID) and birth certificate services are available online.",
      "Passport applications go through the Department of Immigration & Passports; online application is available.",
      "Many citizen services are accessible via the Eksheba (ই-সেবা) portal and union digital centres.",
    ],
  },
  {
    category: "Mobile & internet",
    keywords: ["internet", "mobile data", "wifi", "recharge", "sim", "balance", "ইন্টারনেট", "মোবাইল", "রিচার্জ", "সিম"],
    confidence: "medium",
    facts: [
      "Mobile data is the main way people access the internet; operators include Grameenphone, Robi, Banglalink, Teletalk.",
      "Recharge can be done via mobile banking (bKash/Nagad) or USSD codes.",
    ],
  },
  {
    category: "Utilities & bills",
    keywords: ["electricity", "bill", "water", "gas", "desco", "dpdc", "বিল", "বিদ্যুৎ", "পানি", "গ্যাস"],
    confidence: "low",
    facts: [
      "Utility bills (electricity, gas, water) can often be paid online or via mobile banking.",
      "Contact the specific utility provider (e.g., DESCO/DPDC for Dhaka electricity) for your area.",
    ],
  },
];

export function retrieveBDHelp(query: string): string {
  const q = query.toLowerCase();
  const hits = HELP.filter((c) => c.keywords.some((k) => q.includes(k.toLowerCase())));
  if (!hits.length) return "";
  return hits.map((c) => {
    const tag = c.confidence === "high" ? "confident" : c.confidence === "medium" ? "general" : "uncertain";
    return `[Bangladesh daily-life · ${c.category} · ${tag}] ${c.facts.join(" ")}`;
  }).join("\n");
}
