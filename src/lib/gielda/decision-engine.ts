import type { DecisionContext, DecisionVerdictResult } from "./types";

/** Bardzo prosta heurystyka — działa na mockach, łatwa do zastąpienia. */
export function computeVerdict(ctx: DecisionContext): DecisionVerdictResult {
  const supports: string[] = [];
  const warnings: string[] = [];

  // Punkty na korzyść hossy
  let bullScore = 0;
  let bearScore = 0;

  if (ctx.spxTrend === "bull") { bullScore += 25; supports.push("S&P 500 w trendzie wzrostowym (cena > MA200)."); }
  if (ctx.spxTrend === "bear") { bearScore += 25; warnings.push("S&P 500 pod MA200 — ostrożność."); }

  if (ctx.vix < 15) { bullScore += 15; supports.push(`Niska zmienność (VIX ${ctx.vix.toFixed(1)}).`); }
  else if (ctx.vix > 25) { bearScore += 20; warnings.push(`Podwyższony strach (VIX ${ctx.vix.toFixed(1)}).`); }

  if (ctx.cpiYoy < 3) { bullScore += 10; supports.push(`Inflacja w trendzie spadkowym (${ctx.cpiYoy}% YoY).`); }
  else if (ctx.cpiYoy > 4) { bearScore += 15; warnings.push(`Lepka inflacja (${ctx.cpiYoy}% YoY).`); }

  if (ctx.ratesDirection === "down") { bullScore += 15; supports.push("Cykl obniżek stóp wspiera rynek."); }
  if (ctx.ratesDirection === "up") { bearScore += 15; warnings.push("Cykl podwyżek/yields rosną — presja na wyceny."); }

  if (ctx.breadth > 60) { bullScore += 15; supports.push(`Szerokość rynku zdrowa (${ctx.breadth}% spółek nad MA50).`); }
  else if (ctx.breadth < 40) { bearScore += 15; warnings.push(`Wąska hossa (${ctx.breadth}% spółek nad MA50).`); }

  const total = bullScore + bearScore || 1;
  const conviction = Math.round((Math.max(bullScore, bearScore) / 100) * 100);
  const risk = Math.min(100, Math.round(20 + ctx.vix * 2 + (ctx.spxTrend === "bear" ? 20 : 0)));

  let verdict: DecisionVerdictResult["verdict"] = "obserwuj";
  let horizon: DecisionVerdictResult["horizon"] = "średni";
  let rationale = "";

  const bullRatio = bullScore / total;
  if (ctx.vix > 30 && ctx.spxTrend !== "bull") {
    verdict = "zabezpieczaj";
    horizon = "krótki";
    rationale = "Skok zmienności i osłabiony trend — priorytet ochrona kapitału.";
  } else if (bullRatio > 0.7 && ctx.vix < 20) {
    verdict = "akumuluj";
    horizon = "długi";
    rationale = "Szeroka hossa, niska zmienność, supportywne makro — okno do dokupowania.";
  } else if (bullRatio > 0.55) {
    verdict = "obserwuj";
    horizon = "średni";
    rationale = "Przewaga byków, ale brak wyraźnego setupu — czekamy na potwierdzenie.";
  } else if (bullRatio < 0.35) {
    verdict = "redukuj";
    horizon = "krótki";
    rationale = "Pogarszające się tło makro i techniczne — zmniejsz ekspozycję.";
  } else {
    verdict = "czekaj";
    rationale = "Sygnały mieszane — brak edge, lepiej poczekać.";
  }

  return { verdict, conviction, risk, horizon, rationale, supports, warnings };
}

/** Ekstraktuje DecisionContext z naszych mocków makro. */
export function defaultContext(): DecisionContext {
  return {
    vix: 14.8,
    spxTrend: "bull",
    rates10yUs: 4.32,
    ratesDirection: "down",
    cpiYoy: 2.6,
    breadth: 64,
  };
}
