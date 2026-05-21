/**
 * DecisionPolicyEngine — Phase 4
 *
 * Pure, deterministic decision policy.
 * No I/O, no fetch, no Supabase, no React, no localStorage,
 * no external libraries, no console.* calls, no side effects.
 *
 * Maps the engine contracts (src/engine/contracts.ts) onto the
 * Phase-4 policy rules. Confidence caps are always applied via
 * Math.min(base, cap) — caps never raise confidence.
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
} from "./contracts";

const POLICY_VERSION = "decision-policy@1.0.0";

const MAJOR_ASSETS: ReadonlySet<string> = new Set(["BTC", "ETH", "SOL"]);

// Data-quality caps (max ceiling for global confidence).
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
  capitalFlow: DecisionPolicyInput["snapshot"]["capitalFlow"],
): boolean {
  // No explicit "panic" id in contracts — treat extreme outflow + high vol
  // or bear-trend + outflow as panic.
  return (
    capitalFlow === "outflow" &&
    (regime === "high-volatility" || regime === "bear-trend")
  );
}

function isRiskOffRegime(regime: MarketRegimeId): boolean {
  return regime === "risk-off";
}

function isAltcoin(symbol: string): boolean {
  return !MAJOR_ASSETS.has(symbol.toUpperCase());
}

function extractAccumulatedReasoning(
  ctx: Record<string, unknown> | undefined,
): ReadonlyArray<Record<string, unknown>> {
  if (!ctx) return [];
  const raw = ctx["accumulatedReasoning"];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

function hasRegimeFailure(
  accumulated: ReadonlyArray<Record<string, unknown>>,
): boolean {
  for (const step of accumulated) {
    if (step["module"] === "regime" && step["status"] === "failed") {
      return true;
    }
  }
  return false;
}

function collectMissingFieldsForSymbol(
  symbol: string,
  snapshot: DecisionPolicyInput["snapshot"],
  accumulated: ReadonlyArray<Record<string, unknown>>,
): MissingField[] {
  const out: MissingField[] = [];
  const target = symbol.toUpperCase();

  for (const mf of snapshot.missingFields) {
    if (
      mf.scope === "asset" &&
      typeof mf.symbol === "string" &&
      mf.symbol.toUpperCase() === target
    ) {
      out.push(mf);
    }
  }

  for (const step of accumulated) {
    const evidence = step["evidence"];
    if (!evidence || typeof evidence !== "object") continue;
    const list = (evidence as Record<string, unknown>)["missingFields"];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<MissingField>;
      if (
        candidate.scope === "asset" &&
        typeof candidate.symbol === "string" &&
        candidate.symbol.toUpperCase() === target &&
        typeof candidate.field === "string" &&
        (candidate.severity === "critical" ||
          candidate.severity === "warning" ||
          candidate.severity === "info")
      ) {
        out.push({
          scope: "asset",
          symbol: candidate.symbol,
          field: candidate.field,
          severity: candidate.severity,
        });
      }
    }
  }

  return out;
}

function baseConfidenceFromSnapshot(
  input: DecisionPolicyInput,
): number {
  const coin = input.snapshot.coins.find(
    (c) => c.symbol.toUpperCase() === input.symbol.toUpperCase(),
  );
  // Deterministic, bounded heuristic in [0..100].
  let score = 50;
  if (coin) {
    if (typeof coin.change24h === "number") {
      score += Math.max(-20, Math.min(20, coin.change24h));
    }
    if (typeof coin.rsi === "number") {
      const dist = Math.abs(50 - coin.rsi);
      score += Math.max(-15, Math.min(15, (50 - dist) / 2));
    }
    if (coin.trend === "up") score += 5;
    else if (coin.trend === "down") score -= 5;
  }
  if (typeof input.snapshot.breadth === "number") {
    score += Math.max(-10, Math.min(10, (input.snapshot.breadth - 50) / 5));
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function intendedDirection(
  input: DecisionPolicyInput,
): "LONG" | "SHORT" | "FLAT" {
  const coin = input.snapshot.coins.find(
    (c) => c.symbol.toUpperCase() === input.symbol.toUpperCase(),
  );
  if (!coin) return "FLAT";
  if (coin.trend === "up") return "LONG";
  if (coin.trend === "down") return "SHORT";
  if (typeof coin.change24h === "number") {
    if (coin.change24h > 1) return "LONG";
    if (coin.change24h < -1) return "SHORT";
  }
  return "FLAT";
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

  const direction = intendedDirection(input);
  const accumulated = extractAccumulatedReasoning(input.context);
  let confidence = baseConfidenceFromSnapshot(input);
  let decision: MarketDecisionType =
    direction === "LONG"
      ? "enter"
      : direction === "SHORT"
        ? "hedge"
        : "hold";
  let forceWait = false;
  let executionAllowed = true;

  reasoning.push({
    step: reasoning.length + 1,
    module: "decision-policy",
    label: "baseline",
    detail: `direction=${direction} baseConfidence=${confidence}`,
    pass: true,
    score: confidence,
  });

  // ---- Gate 1: Data quality ----
  const mode = mapQualityToMode(input.snapshot.quality);
  const dataCap = capForMode(mode);
  const beforeData = confidence;
  confidence = Math.min(confidence, dataCap);

  if (mode === "ESTIMATED") {
    forceWait = true;
    executionAllowed = false;
    rejectedGates.push({
      gate: "data-quality",
      severity: "critical",
      reason: "BLOCKED_BY_DATA_QUALITY",
    });
  } else if (mode === "PROXY" || mode === "DEMO") {
    executionAllowed = false;
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
    detail: `mode=${mode} cap=${dataCap} before=${beforeData} after=${confidence}`,
    pass: mode !== "ESTIMATED",
    score: confidence,
  });

  // ---- Gate 2: Regime ----
  const regime = input.snapshot.regime;
  const flow = input.snapshot.capitalFlow;

  if (hasRegimeFailure(accumulated)) {
    forceWait = true;
    executionAllowed = false;
    confidence = Math.min(confidence, CAP_REGIME_FAILURE);
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
      score: confidence,
    });
  } else if (isPanicRegime(regime, flow)) {
    forceWait = true;
    executionAllowed = false;
    confidence = Math.min(confidence, CAP_PANIC);
    if (direction === "LONG") {
      rejectedGates.push({
        gate: "regime",
        severity: "critical",
        reason: "REGIME_PANIC_LONG_LOCK",
      });
    } else if (direction === "SHORT") {
      rejectedGates.push({
        gate: "regime",
        severity: "critical",
        reason: "REGIME_PANIC_SHORT_LOCK",
      });
    } else {
      rejectedGates.push({
        gate: "regime",
        severity: "warning",
        reason: "REGIME_PANIC",
      });
    }
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "panic",
      detail: `cap=${CAP_PANIC} regime=${regime} flow=${flow}`,
      pass: false,
      score: confidence,
    });
  } else if (isRiskOffRegime(regime)) {
    executionAllowed = false;
    confidence = Math.min(confidence, CAP_RISK_OFF);
    if (direction === "LONG" && isAltcoin(input.symbol)) {
      rejectedGates.push({
        gate: "regime",
        severity: "warning",
        reason: "RISK_OFF_ALT_LONG_LOCK",
      });
    }
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "risk-off",
      detail: `cap=${CAP_RISK_OFF} regime=${regime}`,
      pass: false,
      score: confidence,
    });
  } else {
    reasoning.push({
      step: reasoning.length + 1,
      module: "regime-detector",
      label: "regime-ok",
      detail: `regime=${regime} flow=${flow}`,
      pass: true,
      score: confidence,
    });
  }

  // ---- Gate 3: Missing fields for this asset ----
  const missing = collectMissingFieldsForSymbol(
    input.symbol,
    input.snapshot,
    accumulated,
  );
  const blockingMissing = missing.filter(
    (m) => m.severity === "critical" || m.severity === "warning",
  );

  if (blockingMissing.length > 0) {
    forceWait = true;
    executionAllowed = false;
    rejectedGates.push({
      gate: "data-completeness",
      severity:
        blockingMissing.some((m) => m.severity === "critical")
          ? "critical"
          : "warning",
      reason: "MISSING_DATA_FIELDS",
    });
    reasoning.push({
      step: reasoning.length + 1,
      module: "data-ingest",
      label: "missing-fields",
      detail: `symbol=${input.symbol} count=${blockingMissing.length}`,
      pass: false,
      evidence: { missingFields: blockingMissing },
    });
  }

  // ---- Gate 4: Confidence threshold ----
  const hasActiveDirection = direction === "LONG" || direction === "SHORT";

  if (forceWait || !hasActiveDirection || confidence < MIN_CONFIDENCE_TO_ACT) {
    decision = "wait";
    if (!forceWait && confidence < MIN_CONFIDENCE_TO_ACT) {
      rejectedGates.push({
        gate: "confidence-threshold",
        severity: "info",
        reason: `CONFIDENCE_BELOW_${MIN_CONFIDENCE_TO_ACT}`,
      });
    }
  } else if (!executionAllowed) {
    decision = "hold"; // maps to WATCH in MarketDecisionType
    rejectedGates.push({
      gate: "execution-allowed",
      severity: "warning",
      reason: "EXECUTION_DISABLED_BY_MODE_OR_REGIME",
    });
  } else {
    decision = direction === "LONG" ? "enter" : "hedge";
  }

  reasoning.push({
    step: reasoning.length + 1,
    module: "decision-policy",
    label: "final",
    detail: `decision=${decision} confidence=${confidence}`,
    pass: decision !== "wait",
    score: confidence,
  });

  return {
    decision,
    confidence,
    reasoning,
    rejectedGates,
    policyVersion: POLICY_VERSION,
  };
}
