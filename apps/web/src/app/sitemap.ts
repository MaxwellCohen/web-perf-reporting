import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/siteUrl";

const PUBLIC_ROUTES = [
  "",
  "/latest-crux",
  "/historical-crux",
  "/page-speed",
  "/viewer",
  "/lh",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
  }));
}
