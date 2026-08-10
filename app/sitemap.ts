import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://ai-concierge-lake-three.vercel.app";

// sitemap.xml — public, crawlable pages for SEO/GEO.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/llms.txt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
