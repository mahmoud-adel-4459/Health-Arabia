import type { Metadata } from "next";

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type SeoPageKey = "HOME" | "ABOUT" | "COUNTRIES" | "HOSPITALS" | "FAQ" | "CONTACT" | "JOBS";

type SeoValues = { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; canonicalUrl?: string; noindex?: boolean };
export type SiteSettings = {
  general: { brandName: string | null; logoUrl: string | null; faviconUrl: string | null };
  seo: Partial<Record<SeoPageKey | "DEFAULT", SeoValues>>;
};

// Settings saved by a Platform Admin. When the API is unreachable the pages keep their built-in metadata.
export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const res = await fetch(`${apiUrl}/public/site`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SiteSettings;
  } catch {
    return null;
  }
}

// Saved page values win, then the page's built-in metadata, then the saved site-wide defaults.
export function buildMetadata(settings: SiteSettings | null, page: SeoPageKey | null, fallback: Metadata): Metadata {
  const defaults = settings?.seo?.DEFAULT ?? {};
  const own = (page && settings?.seo?.[page]) || {};
  const title = own.title ?? (fallback.title as string | undefined) ?? defaults.title;
  const description = own.description ?? (fallback.description as string | undefined) ?? defaults.description;
  const ogTitle = own.ogTitle ?? defaults.ogTitle ?? title;
  const ogDescription = own.ogDescription ?? defaults.ogDescription ?? description;
  const ogImage = own.ogImage ?? defaults.ogImage;
  const noindex = own.noindex ?? defaults.noindex ?? false;
  return {
    ...fallback,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    openGraph: {
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    ...(own.canonicalUrl ? { alternates: { canonical: own.canonicalUrl } } : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export async function pageMetadata(page: SeoPageKey, fallback: Metadata): Promise<Metadata> {
  return buildMetadata(await getSiteSettings(), page, fallback);
}
