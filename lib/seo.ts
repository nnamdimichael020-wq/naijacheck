import type { Metadata } from "next";
import { SITE_CONFIG, SITE_LOCALE } from "@/config/site";
import type { Article } from "@/lib/types";

export const absUrl = (path: string) => `${SITE_CONFIG.url}${path}`;

/** Metadata for any content page. Title, description and canonical are unique per path. */
export function pageMetadata(opts: {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: absUrl(opts.path) },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: opts.type ?? "website",
      url: absUrl(opts.path),
      siteName: SITE_CONFIG.name,
      title: opts.title,
      description: opts.description,
      locale: SITE_LOCALE,
      images: [{ url: absUrl("/images/photos/lagos-tomato-seller.jpg"), width: 500, height: 625, alt: `${SITE_CONFIG.name}: ${SITE_CONFIG.description}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [absUrl("/images/photos/lagos-tomato-seller.jpg")],
    },
  };
}

/** Generated metaTitles sometimes end in "| NaijaCheck". The root title template adds the brand, so strip it here. */
export const articleMetadata = (a: Article): Metadata =>
  pageMetadata({
    path: a.path,
    title: a.metaTitle.replace(/\s*\|\s*NaijaCheck.*$/i, "").trim(),
    description: a.metaDescription,
    keywords: a.keywords,
    type: "article",
  });

/** JSON-LD for an article: Article or HowTo, plus FAQPage and BreadcrumbList. */
export function articleSchema(a: Article) {
  const url = absUrl(a.path);
  const base =
    a.schemaType === "HowTo"
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: a.title,
          description: a.metaDescription,
          inLanguage: "en-NG",
          url,
          dateModified: a.updatedAt,
          step: (a.steps ?? []).map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.split(":")[0].slice(0, 80), text: s })),
          publisher: { "@type": "Organization", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.metaDescription,
          inLanguage: "en-NG",
          url,
          mainEntityOfPage: url,
          datePublished: "2026-10-09",
          dateModified: a.updatedAt,
          wordCount: a.wordCount,
          author: { "@type": "Organization", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
          publisher: { "@type": "Organization", name: SITE_CONFIG.name, url: SITE_CONFIG.url, logo: { "@type": "ImageObject", url: absUrl("/logo.svg") } },
          image: absUrl("/images/photos/lagos-tomato-seller.jpg"),
        };
  const faq = a.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: a.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;
  const crumbs = breadcrumbSchema(a.path, a.navLabel);
  return [base, crumbs, faq].filter(Boolean);
}

const SECTION_LABELS: Record<string, { label: string; path: string }> = {
  prices: { label: "Prices", path: "/prices" },
  trends: { label: "Trends", path: "/trends" },
  hustle: { label: "Hustle", path: "/hustle" },
  howto: { label: "GovHowTo", path: "/howto" },
  exam: { label: "Exam Hub", path: "/exam" },
  telecom: { label: "Telecom", path: "/telecom" },
  tools: { label: "Tools", path: "/tools" },
  learn: { label: "Learn", path: "/learn" },
};

export function breadcrumbSchema(path: string, leaf: string) {
  const parts = path.split("/").filter(Boolean);
  const items: { name: string; item: string }[] = [{ name: SITE_CONFIG.name, item: absUrl("/") }];
  let acc = "";
  parts.forEach((p, i) => {
    acc += `/${p}`;
    const isLast = i === parts.length - 1;
    const sec = SECTION_LABELS[p];
    items.push({ name: isLast ? leaf : sec ? sec.label : p.replace(/-/g, " "), item: absUrl(acc) });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.item })),
  };
}

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: SITE_CONFIG.url,
  description: SITE_CONFIG.description,
  inLanguage: "en-NG",
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_CONFIG.name,
  url: SITE_CONFIG.url,
  logo: absUrl("/logo.svg"),
  description: SITE_CONFIG.description,
};
