/**
 * DecisionPolicyEngine — Phase 3.1 Contract-Aligned
 *
 * Pure, deterministic decision policy.
 * No I/O, no fetch, no Supabase, no React, no localStorage,
 * no external libraries, no console.* calls, no side effects.
 *
 * Reads ONLY input fields defined in DecisionPolicyInput
 * (no input.snapshot, no input.context).
 * MissingFields are read EXCLUSIVELY from
 * input.accumulatedReasoning[].evidence.missingFields.
 *
 * finalDecision is always one of: "LONG" | "SHORT" | "WATCH" | "WAIT".
 */

import type {
  DecisionPolicyInput,
  DecisionPolicyOutput,
  MarketDecisionType,
  ReasoningStep,
  RejectedGateSeverity,
  DataQuality,
  MarketRegimeId,
  MissingField,
  CapitalFlowDirection,
} from "./contracts";

const MAJOR_ASSETS: ReadonlySet<string> = new Set(["BTC", "ETH", "SOL"]);

// Data-quality caps.
const CAP_ESTIMATED = 20;
const CAP_PROXY = 55;
const CAP_DEMO = 70;
const CAP_LIVE = 100;

// Regime caps.
const CAP_PANIC = 30;
const CAP_RISK_OFF = 45;
const CAP_REGIME_FAILURE = 30;

// Activation threshold.
const MIN_CONFIDENCE_TO_ACT = 40;

// ---------------------------------------------------------------------------
// Helpers (all pure)
// ---------------------------------------------------------------------------

type DataMode = "ESTIMATED" | "PROXY" | "DEMO" | "LIVE";

function mapQualityToMode(q: DataQuality): DataMode {
  switch (q) {
    case "missing":
      return "ESTIMATED";
    case "stale":
      return "PROXY";
    case "degraded":
      return "DEMO";
    case "ok":
    default:
      return "LIVE";
  }
}

function capForMode(mode: DataMode): number {
  switch (mode) {
    case "ESTIMATED":
      return CAP_ESTIMATED;
    case "PROXY":
      return CAP_PROXY;
    case "DEMO":
      return CAP_DEMO;
    case "LIVE":
      return CAP_LIVE;
  }
}

function isPanicRegime(
  regime: MarketRegimeId,
  flow: CapitalFlowDirection | undefined,
): boolean {
  return (
    flow === "outflow" &&
    (regime === "high-volatility" || regime === "bear-trend")
  );
}

function isRiskOffRegime(regime: MarketRegimeId): boolean {
  return regime === "risk-off";
}

function isAltcoin(symbol: string): boolean {
  return !MAJOR_ASSETS.has(symbol.toUpperCase());
}

function hasRegimeFailure(reasoning: ReadonlyArray<ReasoningStep>): boolean {
  for (const step of reasoning) {
    const evidence = step.evidence;
    if (
      evidence &&
      typeof evidence === "object" &&
      (evidence as Record<string, unknown>)["status"] === "failed" &&
      step.module === "regime-detector"
    ) {
      return true;
    }
  }
  return false;
}

function collectMissingFieldsFromReasoning(
  reasoning: ReadonlyArray<ReasoningStep>,
): MissingField[] {
  const out: MissingField[] = [];
  for (const step of reasoning) {
    const evidence = step.evidence;
    if (!evidence || typeof evidence !== "object") continue;
    const list = (evidence as Record<string, unknown>)["missingFields"];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<MissingField>;
      if (
        (candidate.scope === "asset" || candidate.scope === "market") &&
        typeof candidate.field === "string" &&
        (candidate.severity === "critical" ||
          candidate.severity === "warning" ||
          candidate.severity === "info")
      ) {
        out.push({
          scope: candidate.scope,
          symbol:
            typeof candidate.symbol === "string" ? candidate.symbol : undefined,
          field: candidate.field,
          severity: candidate.severity,
          source: typeof candidate.source === "string" ? candidate.source : undefined,
        });
      }
    }
  }
  return out;
}

function blockingForSymbol(
  missing: ReadonlyArray<MissingField>,
  symbol: string,
): MissingField[] {
  const target = symbol.toUpperCase();
  return missing.filter(
    (m) =>
      m.scope === "asset" &&
      typeof m.symbol === "string" &&
      m.symbol.toUpperCase() === target &&
      (m.severity === "critical" || m.severity === "warning"),
  );
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function evaluateDecisionPolicy(
  input: DecisionPolicyInput,
): DecisionPolicyOutput {
  const reasoning: ReasoningStep[] = [];
  const rejectedGates: Array<{
    gate: string;
    severity: RejectedGateSeverity;
    reason: string;
  }> = [];

  // Baseline global confidence — deterministic, bounded.
  let globalConfidence = Math.max(
    0,
    Math.min(100, Math.round(input.regime.confidence)),
  );

  reasoning.push({
    step: reasoning.length + 1,
    module: "decision-policy",
    label: "baseline",
    detail: `regime=${input.regime.id} regimeConfidence=${globalConfidence}`,
    pass: true,
    score: globalConfidence,
  });

  // ---- Gate 1: Data quality ----
  const mode = mapQualityToMode(input.dataQuality);
  const dataCap = capForMode(mode);
  const beforeData = globalConfidence;
  globalConfidence = Math.min(globalConfidence, dataCap);

  let forceWait = false;
  let restrictToWatchOrWait = false;
  let blockAllReason: string | null = null;

  if (mode === "ESTIMATED") {
    forceWait = true;
    blockAllReason = "BLOCKED_BY_DATA_QUALITY";
    rejectedGates.push({
      gate: "data-quality",
      severity: "critical",
      reason: "BLOCKED_BY_DATA_QUALITY",
    });
  } else if (mode === "PROXY" || mode === "DEMO") {
    restrictToWatchOrWait = true;
    rejectedGates.push({
      gate: "data-quality",
      severity: "warning",
      reason: `DATA_MODE_${mode}_NO_EXECUTION`,
    });
  }

  reasoning.push({
    step: reasoning.length + 1,
    module: "decision-policy",
    label: "data-quality-gate",
    detail: `mode=${mode} cap=${dataCap} before=${beforeData} after=${globalConfidence}`,
    pass: mode !== "ESTIMATED",
    score: globalConfidence,
  });

  // ---- Gate 2: Regime ----
  const regime = input.regime.id;
  const flow = input.capitalFlow?.dominantDirection;
  let blockLong = false;
  let blockShort = false;
  let blockAltLong = false;

  if (hasRegimeFailure(input.accumulatedReasoning)) {
    forceWait = true;
    globalConfidence = Math.min(globalConfidence, CAP_REGIME_FAILURE);
    rejectedGates.push({
      gate: "regime",
      severity: "critical",
      reason: "REGIME_MODULE_FAILED",
    });
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "regime-failure",
      detail: `cap=${CAP_REGIME_FAILURE}`,
      pass: false,
      score: globalConfidence,
    });
  } else if (isPanicRegime(regime, flow)) {
    forceWait = true;
    blockLong = true;
    blockShort = true;
    globalConfidence = Math.min(globalConfidence, CAP_PANIC);
    rejectedGates.push({
      gate: "regime",
      severity: "critical",
      reason: "REGIME_PANIC_LOCK",
    });
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "panic",
      detail: `cap=${CAP_PANIC} regime=${regime} flow=${flow}`,
      pass: false,
      score: globalConfidence,
    });
  } else if (isRiskOffRegime(regime)) {
    restrictToWatchOrWait = true;
    blockAltLong = true;
    globalConfidence = Math.min(globalConfidence, CAP_RISK_OFF);
    rejectedGates.push({
      gate: "regime",
      severity: "warning",
      reason: "RISK_OFF_RESTRICTION",
    });
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "risk-off",
      detail: `cap=${CAP_RISK_OFF} regime=${regime}`,
      pass: false,
      score: globalConfidence,
    });
  } else {
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "regime-ok",
      detail: `regime=${regime} flow=${flow ?? "n/a"}`,
      pass: true,
      score: globalConfidence,
    });
  }

  // ---- Gate 3: Missing fields (from accumulatedReasoning only) ----
  const allMissing = collectMissingFieldsFromReasoning(
    input.accumulatedReasoning,
  );

  // ---- Per-setup processing ----
  const processedSetups: DecisionPolicyOutput["processedSetups"] = [];
  let bestActionable: { type: "LONG" | "SHORT" | "WATCH"; confidence: number } | null = null;

  for (const setup of input.rawSetups) {
    const symbolUpper = setup.symbol.toUpperCase();
    const setupBlocking = blockingForSymbol(allMissing, setup.symbol);

    let blocked = false;
    let blockReason: string | undefined;
    const setupConfidence = globalConfidence;

    if (blockAllReason) {
      blocked = true;
      blockReason = blockAllReason;
    } else if (setupBlocking.length > 0) {
      blocked = true;
      blockReason = "MISSING_DATA_FIELDS";
      const sev: RejectedGateSeverity = setupBlocking.some(
        (m) => m.severity === "critical",
      )
        ? "critical"
        : "warning";
      rejectedGates.push({
        gate: "data-completeness",
        severity: sev,
        reason: `MISSING_DATA_FIELDS:${symbolUpper}`,
      });
      reasoning.push({
        step: reasoning.length + 1,
        module: "data-ingest",
        label: "missing-fields",
        detail: `symbol=${symbolUpper} count=${setupBlocking.length}`,
        pass: false,
        evidence: { missingFields: setupBlocking },
      });
    } else if (setup.type === "LONG" && blockLong) {
      blocked = true;
      blockReason = "REGIME_PANIC_LONG_LOCK";
    } else if (setup.type === "SHORT" && blockShort) {
      blocked = true;
      blockReason = "REGIME_PANIC_SHORT_LOCK";
    } else if (setup.type === "LONG" && blockAltLong && isAltcoin(setup.symbol)) {
      blocked = true;
      blockReason = "RISK_OFF_ALT_LONG_LOCK";
    }

    processedSetups.push({
      symbol: setup.symbol,
      type: setup.type,
      strategyName: setup.strategyName,
      entryPrice: setup.entryPrice,
      stopLoss: setup.stopLoss,
      takeProfit: setup.takeProfit,
      blocked,
      blockReason,
    });

    if (!blocked) {
      if (!bestActionable || setupConfidence > bestActionable.confidence) {
        bestActionable = { type: setup.type, confidence: setupConfidence };
      }
    }
  }

  // ---- Gate 4: Final decision selection ----
  let finalDecision: MarketDecisionType;

  if (forceWait) {
    finalDecision = "WAIT";
  } else if (!bestActionable) {
    finalDecision = "WAIT";
    rejectedGates.push({
      gate: "actionable-setups",
      severity: "info",
      reason: "NO_ACTIONABLE_SETUPS",
    });
  } else if (globalConfidence < MIN_CONFIDENCE_TO_ACT) {
    finalDecision = "WAIT";
    rejectedGates.push({
      gate: "confidence-threshold",
      severity: "info",
      reason: `CONFIDENCE_BELOW_${MIN_CONFIDENCE_TO_ACT}`,
    });
  } else if (restrictToWatchOrWait) {
    finalDecision = "WATCH";
  } else if (bestActionable.type === "WATCH") {
    finalDecision = "WATCH";
  } else if (bestActionable.type === "LONG") {
    finalDecision = "LONG";
  } else {
    finalDecision = "SHORT";
  }

  reasoning.push({
    step: reasoning.length + 1,
    module: "decision-policy",
    label: "final",
    detail: `finalDecision=${finalDecision} globalConfidence=${globalConfidence}`,
    pass: finalDecision !== "WAIT",
    score: globalConfidence,
  });

  // reasoning and rejectedGates are intentionally NOT part of
  // DecisionPolicyOutput per v1.3-Final.
  void reasoning;
  void rejectedGates;

  return {
    finalDecision,
    globalConfidence,
    processedSetups,
  };
}
