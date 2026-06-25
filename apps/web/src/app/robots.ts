import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/monitoring", "/page-speed/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
