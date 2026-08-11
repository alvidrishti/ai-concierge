// MAN — DISTRICT DNA LAYER (ALVI DRISHTI V20 → Bangladesh Context Layer).
//
// Implements the ALVI DRISHTI V20 "District DNA" concept (mandatory fields:
// Geography, Climate, Light, Architecture, Transport, Occupation, Food,
// Behavior, Object, Memory, Sound, Smell) as a lightweight, on-demand-retrieved
// Bangladesh context layer for MAN.
//
// Honesty: this is a SEED registry (a few districts), not all 64. Each entry
// carries a `confidence` label. MAN must never present inferred cultural
// assumptions as verified facts, and must never bind a verified user to a
// district identity profile without consent.

export interface DistrictDna {
  district: string;            // canonical name
  region: string;
  climate: string[];
  economy: string[];
  culture: string[];
  infrastructure: string[];
  transport: string[];
  occupation: string[];
  food: string[];
  memory: string[];
  sound: string[];
  smell: string[];
  confidence: "high" | "medium" | "low";
  keywords: string[];
}

// ALVI DRISHTI V20 District DNA seed — contextual knowledge only (not identity).
// Districts relevant to the creator + illustrative peers from the source docs.
const DNA: DistrictDna[] = [
  {
    district: "Rangpur",
    region: "Northern Plains",
    climate: ["Hot humid summer", "Cool dry winter", "Monsoon rain Jun–Oct"],
    economy: ["Agriculture", "Tobacco processing", "Trade & commerce", "Small industry"],
    culture: ["Northern dialects", "Village fairs", "Winter harvest (Nabanna)"],
    infrastructure: ["Road networks", "Rail link", "Markets/bazars"],
    transport: ["Bus", "Rickshaw", "CNG auto", "Train"],
    occupation: ["Farmer", "Day laborer", "Rickshaw puller", "Shopkeeper", "Businessman"],
    food: ["Rice", "Pitha (winter)", "Vegetable curry", "Fish"],
    memory: ["Winter fog mornings", "Harvest festival", "Village market days"],
    sound: ["Rickshaw bells", "Market crowds", "Morning birds"],
    smell: ["Wet earth after rain", "Rice fields", "Tea stall"],
    confidence: "high",
    keywords: ["rangpur", "রংপুর"],
  },
  {
    district: "Mithapukur",
    region: "Rangpur Division (Upazila)",
    climate: ["Seasonal with monsoon", "Cool winter"],
    economy: ["Agriculture", "Local markets"],
    culture: ["Village traditions", "Union-level community life"],
    infrastructure: ["Rural roads", "Union offices", "Bazars"],
    transport: ["Rickshaw", "CNG", "Local bus"],
    occupation: ["Farmer", "Day laborer", "Shopkeeper"],
    food: ["Rice", "Local vegetables", "Pitha"],
    memory: ["Ancestral village", "Farming seasons", "Community gatherings"],
    sound: ["Field work", "Bazar bustle", "Calls to prayer"],
    smell: ["Fertile soil", "Mango/nature"],
    confidence: "medium",
    keywords: ["mithapukur", "মিঠাপুকুর"],
  },
  {
    district: "Kurigram",
    region: "Rangpur Division (Char lands)",
    climate: ["Flood-prone (char) lands", "Monsoon heavy rain", "Erosion risk"],
    economy: ["Agriculture", "Char-land farming", "Fishing"],
    culture: ["Riverine communities", "Resilience culture"],
    infrastructure: ["Limited roads", "River transport", "Char infrastructure gaps"],
    transport: ["Boat", "Rickshaw", "CNG", "Local bus"],
    occupation: ["Farmer", "Fisherman", "Day laborer"],
    food: ["Rice", "River fish", "Local vegetables"],
    memory: ["Flood seasons", "River bank life", "Char livelihoods"],
    sound: ["River water", "Boat engines", "Market"],
    smell: ["River mud", "Wet crops"],
    confidence: "medium",
    keywords: ["kurigram", "কুড়িগ্রাম"],
  },
  {
    district: "Gaibandha",
    region: "Rangpur Division",
    climate: ["Monsoon rain", "Riverine/flood influence"],
    economy: ["Agriculture", "Rice milling", "Fishing"],
    culture: ["River culture", "Rural festivals"],
    infrastructure: ["Roads", "River ghats", "Bazars"],
    transport: ["Boat", "Rickshaw", "Bus"],
    occupation: ["Farmer", "Fisherman", "Day laborer", "Shopkeeper"],
    food: ["Rice", "Fish", "Seasonal vegetables"],
    memory: ["River life", "Market days"],
    sound: ["River", "Boats", "Village life"],
    smell: ["River", "Harvest"],
    confidence: "medium",
    keywords: ["gaibandha", "গাইবান্ধা"],
  },
];

// On-demand retrieval (mirrors retrieveBDContext). Only relevant district(s).
export function retrieveDistrictDna(query: string): DistrictDna[] {
  const q = query.toLowerCase();
  return DNA.filter((d) => d.keywords.some((k) => q.includes(k.toLowerCase())));
}

export function districtDnaBlock(query: string): string {
  const hits = retrieveDistrictDna(query);
  if (!hits.length) return "";
  return "\nDISTRICT DNA (ALVI DRISHTI V20 — contextual knowledge):\n" +
    hits.map((d) => {
      const conf = d.confidence === "high" ? "confident" : "general";
      return `- [${d.district} · ${d.region} · ${conf}] Climate: ${d.climate.join("; ")}. Economy: ${d.economy.join("; ")}. Occupation: ${d.occupation.join(", ")}. Food: ${d.food.join("; ")}. Transport: ${d.transport.join(", ")}.`;
    }).join("\n");
}

export function districtCount(): number {
  return DNA.length;
}

export function seededDistricts(): string[] {
  return DNA.map((d) => d.district);
}
