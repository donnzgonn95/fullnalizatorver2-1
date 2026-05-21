import { describe, expect, test } from "bun:test";

import {
  createEmptyMarketOrchestratorInput,
  runMarketOrchestrator,
} from "../engine/orchestrator";

import type { MarketOrchestratorInput } from "../engine/orchestrator";

describe("runMarketOrchestrator", () => {
  test("returns WAIT for the safe empty input", () => {
    const result = runMarketOrchestrator(createEmptyMarketOrchestratorInput());

    expect(result.snapshotId).toBe("demo-snapshot");
    expect(result.finalDecision).toBe("WAIT");
    expect(result.globalConfidence).toBe(0);
    expect(result.status).toBe("wait");
    expect(result.decisionPolicy.processedSetups).toEqual([]);
    expect(typeof result.createdAt).toBe("string");
  });

  test("returns LONG for a clean live long setup", () => {
    const input: MarketOrchestratorInput = {
      snapshotId: "live-long-smoke",
      dataQuality: "ok",
      regime: { id: "bull-trend", confidence: 82 },
      capitalFlow: { dominantDirection: "inflow", momentumScore: 70 },
      rankings: { strongest: ["BTC"], weakest: [] },
      rawSetups: [
        {
          symbol: "BTC",
          type: "LONG",
          strategyName: "smoke-long",
          entryPrice: 100,
          stopLoss: 95,
          takeProfit: 115,
        },
      ],
      accumulatedReasoning: [],
    };

    const result = runMarketOrchestrator(input);

    expect(result.snapshotId).toBe("live-long-smoke");
    expect(result.finalDecision).toBe("LONG");
    expect(result.globalConfidence).toBe(82);
    expect(result.status).toBe("ok");
    expect(result.decisionPolicy.processedSetups).toHaveLength(1);
    expect(result.decisionPolicy.processedSetups[0]?.blocked).toBe(false);
  });

  test("blocks only the affected symbol when critical asset data is missing", () => {
    const input: MarketOrchestratorInput = {
      snapshotId: "missing-asset-smoke",
      dataQuality: "ok",
      regime: { id: "bull-trend", confidence: 75 },
      rankings: { strongest: ["BTC", "ETH"], weakest: [] },
      rawSetups: [
        {
          symbol: "BTC",
          type: "LONG",
          strategyName: "btc-missing-data",
        },
        {
          symbol: "ETH",
          type: "LONG",
          strategyName: "eth-clean-data",
        },
      ],
      accumulatedReasoning: [
        {
          step: 1,
          module: "data-ingest",
          label: "missing-btc-volume",
          pass: false,
          evidence: {
            missingFields: [
              {
                scope: "asset",
                symbol: "BTC",
                field: "volume24h",
                severity: "critical",
                source: "smoke-test",
              },
            ],
          },
        },
      ],
    };

    const result = runMarketOrchestrator(input);
    const btc = result.decisionPolicy.processedSetups.find((s) => s.symbol === "BTC");
    const eth = result.decisionPolicy.processedSetups.find((s) => s.symbol === "ETH");

    expect(result.finalDecision).toBe("LONG");
    expect(result.status).toBe("ok");
    expect(btc?.blocked).toBe(true);
    expect(btc?.blockReason).toBe("MISSING_DATA_FIELDS");
    expect(eth?.blocked).toBe(false);
  });
});
