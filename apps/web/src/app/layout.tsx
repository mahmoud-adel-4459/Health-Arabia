import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata, getSiteSettings } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const base = buildMetadata(settings, null, {
    title: settings?.general.brandName ?? "Health Arabia",
    description: "Medical recruitment across the GCC",
  });
  const favicon = settings?.general.faviconUrl;
  return { ...base, ...(favicon ? { icons: { icon: favicon } } : {}) };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
