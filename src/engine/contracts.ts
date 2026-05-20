/**
 * Engine Contracts — v1.3-Final
 *
 * Pure type definitions for the eLJot / AI Quant Cockpit decision engine.
 * Source of truth: docs/engine-contracts.md v1.3-Final.
 *
 * This module MUST contain only types and interfaces.
 * No runtime logic, no functions, no hooks, no UI, no side effects.
 */

// ---------------------------------------------------------------------------
// Enums / string literal unions
// ---------------------------------------------------------------------------

export type DataQuality = "ok" | "degraded" | "stale" | "missing";

export type MarketRegimeId =
  | "risk-on"
  | "risk-off"
  | "neutral"
  | "bull-trend"
  | "bear-trend"
  | "high-volatility"
  | "low-volatility"
  | "unknown";

export type CapitalFlowDirection = "inflow" | "outflow" | "neutral" | "unknown";

export type MarketDecisionType =
  | "enter"
  | "exit"
  | "hold"
  | "reduce"
  | "hedge"
  | "wait"
  | "abstain";

export type AgentDecisionStatus =
  | "approved"
  | "rejected"
  | "pending"
  | "deferred"
  | "expired";

export type RejectedGateSeverity = "critical" | "warning" | "info";

export type ModuleName =
  | "data-ingest"
  | "market-snapshot"
  | "regime-detector"
  | "decision-policy"
  | "risk-guard"
  | "ai-reviewer"
  | "agent-policy"
  | "executor"
  | "ledger";

export type ModuleStatus = "ok" | "degraded" | "failed" | "skipped" | "disabled";

// ---------------------------------------------------------------------------
// Data quality policy
// ---------------------------------------------------------------------------

export interface DataQualityRules {
  maxStalenessMs: number;
  requiredFields: string[];
  minSampleSize?: number;
  allowDegraded?: boolean;
}

export type DataQualityPolicyMap = Record<ModuleName, DataQualityRules>;

export interface MissingField {
  scope: "market" | "asset";
  symbol?: string;
  field: string;
  severity: "critical" | "warning" | "info";
  source?: string;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface CoinSnapshot {
  symbol: string;
  price: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  volume24h?: number;
  marketCap?: number;
  liquidityScore?: number;
  volatility?: number;
  rsi?: number;
  trend?: "up" | "down" | "flat";
  quality: DataQuality;
  asOf: string;
  source?: string;
}

export interface MarketSnapshot {
  asOf: string;
  regime: MarketRegimeId;
  capitalFlow: CapitalFlowDirection;
  breadth?: number;
  fearGreed?: number;
  btcDominance?: number;
  totalMarketCap?: number;
  volatilityIndex?: number;
  coins: CoinSnapshot[];
  quality: DataQuality;
  missingFields: MissingField[];
  source?: string;
}

// ---------------------------------------------------------------------------
// Reasoning + metrics
// ---------------------------------------------------------------------------

export interface ReasoningStep {
  step: number;
  module: ModuleName;
  label: string;
  detail?: string;
  pass: boolean;
  weight?: number;
  score?: number;
  evidence?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  modulesRun: number;
  modulesFailed: number;
  modulesSkipped: number;
  warnings: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Decision policy
// ---------------------------------------------------------------------------

export interface DecisionPolicyInput {
  snapshot: MarketSnapshot;
  symbol: string;
  horizon: "short" | "mid" | "long";
  capital: number;
  riskBudget: number;
  context?: Record<string, unknown>;
}

export interface DecisionPolicyOutput {
  decision: MarketDecisionType;
  confidence: number;
  reasoning: ReasoningStep[];
  rejectedGates: Array<{
    gate: string;
    severity: RejectedGateSeverity;
    reason: string;
  }>;
  policyVersion: string;
}

export interface MarketDecision {
  id: string;
  symbol: string;
  decision: MarketDecisionType;
  confidence: number;
  horizon: "short" | "mid" | "long";
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
  riskReward?: number;
  reasoning: ReasoningStep[];
  rejectedGates: Array<{
    gate: string;
    severity: RejectedGateSeverity;
    reason: string;
  }>;
  metrics: ExecutionMetrics;
  snapshotAsOf: string;
  createdAt: string;
  orchestratorVersion: string;
  policyVersion: string;
}

// ---------------------------------------------------------------------------
// AI market reviewer
// ---------------------------------------------------------------------------

export interface AiMarketReview {
  decisionId: string;
  verdict: "agree" | "disagree" | "modify" | "abstain";
  confidence: number;
  rationale: string;
  suggestedDecision?: MarketDecisionType;
  warnings: string[];
  model: string;
  reviewedAt: string;
}

// ---------------------------------------------------------------------------
// Agent policy
// ---------------------------------------------------------------------------

export interface AgentPolicyInput {
  decision: MarketDecision;
  review?: AiMarketReview;
  reputationScore: number;
  capitalAvailable: number;
  openPositions: number;
  cooldownActive: boolean;
  context?: Record<string, unknown>;
}

export interface AgentPolicyOutput {
  status: AgentDecisionStatus;
  reason: string;
  reasoning: ReasoningStep[];
  rejectedGates: Array<{
    gate: string;
    severity: RejectedGateSeverity;
    reason: string;
  }>;
  policyVersion: string;
}

export interface AgentActionDecision {
  id: string;
  decisionId: string;
  agentId: string;
  status: AgentDecisionStatus;
  reason: string;
  reasoning: ReasoningStep[];
  rejectedGates: Array<{
    gate: string;
    severity: RejectedGateSeverity;
    reason: string;
  }>;
  metrics: ExecutionMetrics;
  createdAt: string;
  orchestratorVersion: string;
  policyVersion: string;
}
