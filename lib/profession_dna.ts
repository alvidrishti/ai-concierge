// MAN — PROFESSION DNA LAYER (ALVI DRISHTI V21 → Human Context / Decision Layer).
//
// Implements the ALVI DRISHTI V21 Profession DNA concept as a lightweight,
// on-demand-retrieved context layer. For each relevant profession we capture a
// few high-level contextual facts (work environment, daily rhythm, object,
// language, economic, memory triggers). This is CONTEXT, not identity: MAN
// never binds a verified user to a profession profile without consent.
//
// Honesty: seed subset only; each entry carries a confidence label.

export interface ProfessionDna {
  profession: string;
  dailyRhythm: string[];
  workEnvironment: string[];
  objects: string[];
  language: string[];
  economic: string[];
  memoryTriggers: string[];
  social: string[];
  confidence: "high" | "medium";
  keywords: string[];
}

const PROFESSIONS: ProfessionDna[] = [
  {
    profession: "Farmer",
    dailyRhythm: ["Wake before sunrise", "Observe weather", "Visit crop fields", "Check irrigation", "Market planning"],
    workEnvironment: ["Rice field", "Wheat field", "Vegetable farm", "Irrigation canal", "Agricultural market"],
    objects: ["Seed", "Fertilizer", "Irrigation pump", "Harvest basket", "Shovel", "Hoe"],
    language: ["Local Bangla", "Season terms", "Crop vocabulary"],
    economic: ["Seed cost", "Market price", "Profit margin", "Loan pressure", "Harvest income"],
    memoryTriggers: ["First rainfall", "Fresh paddy smell", "Harvest festival", "Morning fog", "Market day"],
    social: ["Tea stall meetings", "Village cooperation", "Shared irrigation", "Market negotiations"],
    confidence: "high",
    keywords: ["farmer", "kisan", "chashi", "চাষি", "কৃষক", "agriculture", "crop", "farming"],
  },
  {
    profession: "Fisherman",
    dailyRhythm: ["Wake before dawn", "Check weather", "Inspect boat", "Prepare nets", "Journey to fishing grounds", "Sell catch"],
    workEnvironment: ["River", "Sea", "Haor", "Canal", "Fishing harbor", "Boat ghat", "Fish market"],
    objects: ["Fishing net", "Boat", "Boat engine", "Life jacket", "Fish basket", "Anchor", "Rope"],
    language: ["Local Bangla", "River/weather terms"],
    economic: ["Catch value", "Boat fuel", "Equipment repair", "Market price"],
    memoryTriggers: ["Dawn on the river", "Boat engine sound", "Big catch", "Storm on horizon"],
    social: ["Fishing community", "Boat ghat gatherings", "Market ties"],
    confidence: "high",
    keywords: ["fisherman", "jhele", "জেলে", "fishing", "fish", "river", "জাল"],
  },
  {
    profession: "Day Laborer",
    dailyRhythm: ["Seek work at morning market/crossing", "Daily wage work", "Return by evening"],
    workEnvironment: ["Construction sites", "Fields", "Loading docks", "Market areas"],
    objects: ["Tools", "Head load", "Water container"],
    language: ["Local Bangla", "Informal work terms"],
    economic: ["Daily wage", "Seasonal employment", "Family expenses"],
    memoryTriggers: ["Pay day", "Off-season hardship", "A good work day"],
    social: ["Labor pool at crossings", "Community support"],
    confidence: "medium",
    keywords: ["day laborer", "laborer", "majur", "মজুর", "শ্রমিক", "daily wage"],
  },
  {
    profession: "Rickshaw Puller",
    dailyRhythm: ["Start before sunrise", "Pull through the day", "Return after evening rush"],
    workEnvironment: ["City streets", "Market areas", "Rail/bus stations", "Residential lanes"],
    objects: ["Rickshaw", "Puncture kit", "Water", "Small cash"],
    language: ["Urban Bangla", "Short ride terms"],
    economic: ["Daily rental of rickshaw", "Fare income", "Fuel (pulling) effort"],
    memoryTriggers: ["Peak hours", "Regular customers", "Long haul earnings"],
    social: ["Other pullers", "Shopkeepers", "Commuters"],
    confidence: "medium",
    keywords: ["rickshaw", "puller", "রিকশা", "রিকশাওয়ালা"],
  },
  {
    profession: "CNG Driver",
    dailyRhythm: ["Early stand pickup", "City/rural trips", "Evening stand"],
    workEnvironment: ["Roads", "CNG stands", "Bus terminals", "City/rural routes"],
    objects: ["CNG autorickshaw", "Fuel (gas)", "Tools", "Mobile"],
    language: ["Urban Bangla", "Route terms"],
    economic: ["Trip fares", "Fuel cost", "Daily owner/rent share"],
    memoryTriggers: ["Regular routes", "Busy days", "Vehicle upkeep"],
    social: ["Other drivers", "Passengers", "Stand community"],
    confidence: "medium",
    keywords: ["cng", "driver", "autorickshaw", "সিএনজি", "ড্রাইভার"],
  },
  {
    profession: "Hotel / F&B Worker",
    dailyRhythm: ["Shift start", "Service/tables", "Kitchen coordination", "Customer care", "End of shift"],
    workEnvironment: ["Hotel", "Restaurant", "Kitchen", "Dining hall", "Cox's Bazar hospitality"],
    objects: ["Serving trays", "Order pads", "Kitchen equipment", "Uniform"],
    language: ["Service English", "Bangla", "Customer-facing politeness"],
    economic: ["Wage", "Tips", "Seasonal tourism demand"],
    memoryTriggers: ["Busy tourist season", "Guests", "Team shifts"],
    social: ["Colleagues", "Guests", "Hospitality network"],
    confidence: "high",
    keywords: ["hotel", "f&b", "food", "beverage", "waiter", "restaurant", "hospitality", "হোটেল", "ওয়েটার"],
  },
  {
    profession: "Shopkeeper",
    dailyRhythm: ["Open shop", "Serve customers", "Restock", "Close"],
    workEnvironment: ["Shop/dokan", "Bazar", "Market street"],
    objects: ["Goods", "Ledger/phone", "Cash", "Weighing scale"],
    language: ["Local Bangla", "Price/bargain terms"],
    economic: ["Stock cost", "Sales", "Credit to regulars", "Margin"],
    memoryTriggers: ["Market days", "Regular customers", "Festival sales"],
    social: ["Customers", "Other shopkeepers", "Suppliers"],
    confidence: "medium",
    keywords: ["shopkeeper", "shop", "dokan", "দোকানদার", "দোকান"],
  },
];

export function retrieveProfessionDna(query: string): ProfessionDna[] {
  const q = query.toLowerCase();
  return PROFESSIONS.filter((p) => p.keywords.some((k) => q.includes(k.toLowerCase())));
}

export function professionDnaBlock(query: string): string {
  const hits = retrieveProfessionDna(query);
  if (!hits.length) return "";
  return "\nPROFESSION DNA (ALVI DRISHTI V21 — contextual knowledge):\n" +
    hits.map((p) => {
      const conf = p.confidence === "high" ? "confident" : "general";
      return `- [${p.profession} · ${conf}] Rhythm: ${p.dailyRhythm.join("; ")}. Environment: ${p.workEnvironment.join("; ")}. Economic: ${p.economic.join("; ")}. Memory: ${p.memoryTriggers.join("; ")}.`;
    }).join("\n");
}
