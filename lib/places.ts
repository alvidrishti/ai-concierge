// Curated local places directory (Dhaka areas) — the "lookup" tool.
// In production, swap for a live places API.

export interface Place {
  name: string;
  type: string;
  area: string;
  rating: number;
  price: string;
  address: string;
  description: string;
}

export const PLACES: Place[] = [
  { name: "Kaffa Dhanmondi", type: "coffee shop", area: "Dhanmondi", rating: 4.6, price: "$$", address: "Road 2, Dhanmondi", description: "Quiet specialty-coffee spot with pour-over bar and study seating." },
  { name: "North End Coffee", type: "coffee shop", area: "Dhanmondi", rating: 4.4, price: "$", address: "Road 27, Dhanmondi", description: "Popular chain with strong espresso, pastries and fast Wi-Fi." },
  { name: "The Coffee Bean & Tea Leaf", type: "coffee shop", area: "Dhanmondi", rating: 4.2, price: "$$", address: "Satmasjid Road, Dhanmondi", description: "International brand, consistent drinks and desserts." },
  { name: "Cozmo Cafe", type: "coffee shop", area: "Gulshan", rating: 4.5, price: "$$", address: "Road 11, Gulshan 1", description: "Trendy cafe with craft coffee, brunch and open-air seating." },
  { name: "Ambrosia", type: "restaurant", area: "Gulshan", rating: 4.7, price: "$$$", address: "House 6, Road 52, Gulshan 2", description: "Modern multi-cuisine dining with a chef's tasting menu." },
  { name: "Haatkhola", type: "restaurant", area: "Dhanmondi", rating: 4.4, price: "$$", address: "Road 4, Dhanmondi", description: "Traditional Bangladeshi food in a heritage-style setting." },
  { name: "Sultana's Dine", type: "restaurant", area: "Dhanmondi", rating: 4.5, price: "$$", address: "Road 8, Dhanmondi", description: "Famous for kacchi biryani and Mughlai mains." },
  { name: "Apollo Diagnostic", type: "clinic", area: "Dhanmondi", rating: 4.3, price: "$$$", address: "Road 15, Dhanmondi", description: "Full-service diagnostic center with specialists." },
  { name: "United Hospital", type: "clinic", area: "Gulshan", rating: 4.6, price: "$$$", address: "Plot 15, Road 71, Gulshan 2", description: "Large private hospital with emergency and OPD." },
  { name: "Vida Fitness", type: "gym", area: "Dhanmondi", rating: 4.5, price: "$$", address: "Road 6, Dhanmondi", description: "Modern gym with trainers, sauna and classes." },
];

const TYPE_ALIASES: Record<string, string[]> = {
  "coffee shop": ["coffee", "coffeeshop", "cafe", "cafes", "café"],
  restaurant: ["restaurant", "restaurants", "food", "biryani", "lunch", "dinner"],
  clinic: ["clinic", "clinics", "doctor", "hospital", "dentist"],
  gym: ["gym", "gyms", "fitness", "workout"],
};

function resolveType(query: string): string | null {
  const q = query.toLowerCase();
  for (const [type, aliases] of Object.entries(TYPE_ALIASES)) {
    if (aliases.some((a) => q.includes(a))) return type;
  }
  return null;
}

export function placesLookup(query: string, near?: string, limit = 3): Place[] {
  const q = query.toLowerCase();
  const type = resolveType(q);
  const area = (near || "").toLowerCase().trim();
  const scored: Array<[number, Place]> = [];

  for (const p of PLACES) {
    let score = 0;
    if (type && p.type === type) score += 10;
    if (area && p.area.toLowerCase().includes(area)) score += 5;
    for (const tok of q.replace("near", "").split(" ")) {
      if (tok && (p.name.toLowerCase().includes(tok) || p.type.includes(tok))) score += 1;
    }
    if (score > 0) scored.push([score, p]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1].rating - a[1].rating);
  return scored.slice(0, limit).map(([, p]) => p);
}
