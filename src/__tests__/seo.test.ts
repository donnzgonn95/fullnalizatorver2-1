// Verifies seoHead() produces a per-route canonical and required OG meta.
// Run with: bun test
import { describe, it, expect } from "bun:test";
import { seoHead, canonicalLink, SITE_URL, SITE_NAME } from "../lib/seo";

const ROUTES = [
  "/",
  "/sila",
  "/setupy",
  "/sentyment",
  "/przeplyw",
  "/alerty",
  "/likwidacja",
  "/squeeze",
  "/ulubione",
  "/asystent",
  "/slownik",
  "/historia-alertow",
  "/ustawienia",
  "/coin/BTC",
];

describe("seoHead()", () => {
  it("zwraca pojedynczy canonical link wskazujący na dokładną ścieżkę", () => {
    for (const path of ROUTES) {
      const { links } = seoHead({ title: "T", description: "D", path });
      const canonicals = links.filter((l) => l.rel === "canonical");
      expect(canonicals.length).toBe(1);
      expect(canonicals[0].href).toBe(`${SITE_URL}${path}`);
      // Brak końcowego ukośnika (poza root)
      if (path !== "/") expect(canonicals[0].href.endsWith("/")).toBe(false);
      // Brak duplikacji ukośników
      expect(/([^:])\/\//.test(canonicals[0].href)).toBe(false);
    }
  });

  it("doszywa nazwę witryny do tytułu i wystawia komplet OG/Twitter", () => {
    const { meta } = seoHead({ title: "Strona X", description: "Opis", path: "/x" });
    const titleEntry = meta.find((m) => "title" in m);
    expect(titleEntry?.title).toBe(`Strona X · ${SITE_NAME}`);
    const ogTitle = meta.find((m) => m.property === "og:title");
    const ogDesc = meta.find((m) => m.property === "og:description");
    const ogUrl = meta.find((m) => m.property === "og:url");
    expect(ogTitle?.content).toBe(`Strona X · ${SITE_NAME}`);
    expect(ogDesc?.content).toBe("Opis");
    expect(ogUrl?.content).toBe(`${SITE_URL}/x`);
  });

  it("nie dubluje sufiksu nazwy witryny w tytule", () => {
    const { meta } = seoHead({ title: `Już ma · ${SITE_NAME}`, description: "D", path: "/" });
    const titleEntry = meta.find((m) => "title" in m);
    expect(titleEntry?.title).toBe(`Już ma · ${SITE_NAME}`);
  });

  it("canonicalLink() jest zgodny z seoHead()", () => {
    const a = canonicalLink("/setupy");
    const { links } = seoHead({ title: "T", description: "D", path: "/setupy" });
    expect(links[0]).toEqual(a);
  });
});
