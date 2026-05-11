// AI model catalog for the market-ai edge function.
// Prices are approximate USD per 1M tokens (input / output) — used only for
// informative cost estimation in the UI, not billing.

export type AiModelId =
  | "google/gemini-2.5-flash-lite"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-pro"
  | "google/gemini-3-flash-preview"
  | "google/gemini-3.1-pro-preview"
  | "openai/gpt-5-nano"
  | "openai/gpt-5-mini"
  | "openai/gpt-5"
  | "openai/gpt-5.2";

export type AiModel = {
  id: AiModelId;
  label: string;
  vendor: "Google" | "OpenAI";
  tier: "lite" | "balanced" | "premium";
  desc: string;
  /** Stars 1..5 for relative cost. */
  costStars: number;
  /** USD per 1M tokens. */
  inUsdPerM: number;
  outUsdPerM: number;
};

export const AI_MODELS: AiModel[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    vendor: "Google",
    tier: "lite",
    desc: "Najtańszy i najszybszy. Świetny do krótkich zapytań w chacie.",
    costStars: 1,
    inUsdPerM: 0.1,
    outUsdPerM: 0.4,
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    vendor: "Google",
    tier: "balanced",
    desc: "Domyślny — dobry balans szybkości i jakości.",
    costStars: 2,
    inUsdPerM: 0.3,
    outUsdPerM: 1.2,
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash (preview)",
    vendor: "Google",
    tier: "balanced",
    desc: "Nowy preview — szybki, mocniejszy reasoning.",
    costStars: 2,
    inUsdPerM: 0.3,
    outUsdPerM: 1.2,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    vendor: "Google",
    tier: "premium",
    desc: "Pogłębiona analiza, długi kontekst — pod raporty.",
    costStars: 4,
    inUsdPerM: 1.25,
    outUsdPerM: 5.0,
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 mini",
    vendor: "OpenAI",
    tier: "balanced",
    desc: "Szybki OpenAI z dobrym reasoningiem.",
    costStars: 3,
    inUsdPerM: 0.4,
    outUsdPerM: 1.6,
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    vendor: "OpenAI",
    tier: "premium",
    desc: "Najwyższa jakość — premium dla raportów.",
    costStars: 5,
    inUsdPerM: 2.5,
    outUsdPerM: 10.0,
  },
];

export const DEFAULT_CHAT_MODEL: AiModelId = "google/gemini-2.5-flash";
export const DEFAULT_REPORT_MODEL: AiModelId = "google/gemini-2.5-pro";

export function getModel(id: string): AiModel {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[1];
}

export function estimateCostUsd(modelId: string, promptTokens: number, completionTokens: number): number {
  const m = getModel(modelId);
  return (promptTokens * m.inUsdPerM + completionTokens * m.outUsdPerM) / 1_000_000;
}
