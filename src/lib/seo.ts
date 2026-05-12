/**
 * Centralny helper do budowy meta tagów (head) per trasa.
 * Tytuł i opis są nadpisywane w każdej child route, og:* dziedziczą się
 * tylko gdy nie ustawione — więc zawsze dostarczamy komplet.
 */
export const SITE_NAME = "CryptoPuls";
export const SITE_URL = "https://cryptopuls.lovable.app";

type SeoMeta = Array<Record<string, string>>;
type SeoLinks = Array<Record<string, string>>;

/** Per-route canonical link. Use in route `head().links`. */
export function canonicalLink(path: string): Record<string, string> {
  return { rel: "canonical", href: `${SITE_URL}${path}` };
}

/** Returns `{ meta, links }` for a route. Includes a canonical pointing to `path`. */
export function seoHead(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}): { meta: SeoMeta; links: SeoLinks } {
  return {
    meta: buildSeo(opts),
    links: [canonicalLink(opts.path)],
  };
}

export function buildSeo(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
}): SeoMeta {
  const fullTitle = opts.title.endsWith(SITE_NAME) ? opts.title : `${opts.title} · ${SITE_NAME}`;
  const url = opts.path ? `${SITE_URL}${opts.path}` : SITE_URL;
  const meta: SeoMeta = [
    { title: fullTitle },
    { name: "description", content: opts.description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: url },
    { name: "twitter:card", content: opts.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: opts.description },
  ];
  if (opts.image) {
    meta.push({ property: "og:image", content: opts.image });
    meta.push({ name: "twitter:image", content: opts.image });
  }
  return meta;
}

/** JSON-LD helper — zwraca obiekt do sekcji `scripts` w head(). */
export function jsonLd(payload: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(payload),
  };
}
