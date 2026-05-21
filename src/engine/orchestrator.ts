/**
 * Orchestrator Runtime Skeleton — Phase 4.1
 *
 * Minimal, controlled orchestrator connecting existing engine contracts
 * with DecisionPolicyEngine.
 *
 * Pure TypeScript module.
 * No React, no I/O, no fetch, no Supabase, no localStorage,
 * no console.* calls, no side effects, no external libraries.
 */

import type {
  DataQuality,
  MarketRegimeId,
  CapitalFlowDirection,
  ReasoningStep,
  DecisionPolicyInput,
  DecisionPolicyOutput,
  MarketDecisionType,
} from "./contracts";

import { evaluateDecisionPolicy } from "./decisionPolicy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketOrchestratorInput {
  snapshotId: string;
  dataQuality: DataQuality;
  regime: { id: MarketRegimeId; confidence: number };
  capitalFlow?: { dominantDirection: CapitalFlowDirection; momentumScore: number };
  rankings: { strongest: string[]; weakest: string[] };
  rawSetups: DecisionPolicyInput["rawSetups"];
  accumulatedReasoning: ReasoningStep[];
}

export interface MarketOrchestratorOutput {
  snapshotId: string;
  decisionPolicy: DecisionPolicyOutput;
  finalDecision: MarketDecisionType;
  globalConfidence: number;
  status: "ok" | "wait" | "blocked";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

function deriveStatus(
  finalDecision: MarketDecisionType,
  processedSetups: DecisionPolicyOutput["processedSetups"],
): "ok" | "wait" | "blocked" {
  if (finalDecision === "WAIT") {
    return "wait";
  }
  if (processedSetups.length > 0 && processedSetups.every((s) => s.blocked)) {
    return "blocked";
  }
  return "ok";
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function runMarketOrchestrator(
  input: MarketOrchestratorInput,
): MarketOrchestratorOutput {
  const decisionPolicyInput: DecisionPolicyInput = {
    snapshotId: input.snapshotId,
    dataQuality: input.dataQuality,
    regime: input.regime,
    capitalFlow: input.capitalFlow,
    rankings: input.rankings,
    rawSetups: input.rawSetups,
    accumulatedReasoning: input.accumulatedReasoning,
  };

  const decisionPolicy = evaluateDecisionPolicy(decisionPolicyInput);

  const status = deriveStatus(
    decisionPolicy.finalDecision,
    decisionPolicy.processedSetups,
  );

  return {
    snapshotId: input.snapshotId,
    decisionPolicy,
    finalDecision: decisionPolicy.finalDecision,
    globalConfidence: decisionPolicy.globalConfidence,
    status,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Optional safe input factory
// ---------------------------------------------------------------------------

export function createEmptyMarketOrchestratorInput(): MarketOrchestratorInput {
  return {
    snapshotId: "demo-snapshot",
    dataQuality: "missing",
    regime: { id: "unknown", confidence: 0 },
    rankings: { strongest: [], weakest: [] },
    rawSetups: [],
    accumulatedReasoning: [],
  };
}
