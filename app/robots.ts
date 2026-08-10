import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://ai-concierge-lake-three.vercel.app";

// robots.txt — let search engines & AI crawlers read the site.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/llms.txt", "/favicon.svg"],
      disallow: ["/api/"], // never crawl API endpoints (auth/memory)
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
