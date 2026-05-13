import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TestWebhookInput = z.object({
  url: z.string().url(),
  payload: z.unknown().optional(),
});

export const testWebhook = createServerFn({ method: "POST" })
  .inputValidator((input) => TestWebhookInput.parse(input))
  .handler(async ({ data }) => {
    const samplePayload = data.payload ?? {
      type: "setup.detected",
      source: "cryptopuls.test",
      timestamp: new Date().toISOString(),
      setup: {
        symbol: "BTC",
        interval: "H1",
        direction: "long",
        setup_type: "bb_bounce",
        signal_strength: 78,
        entry_price: 67500,
        stop_loss: 66800,
        take_profit: 69200,
        wave_label: null,
      },
      message: "🔔 To jest testowy webhook z CryptoPuls Admin Panel.",
    };
    const startedAt = Date.now();
    try {
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "CryptoPuls-Test/1.0" },
        body: JSON.stringify(samplePayload),
      });
      const text = await res.text().catch(() => "");
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs: Date.now() - startedAt,
        responseSnippet: text.slice(0, 500),
        sentPayload: samplePayload,
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        statusText: e instanceof Error ? e.message : "Network error",
        durationMs: Date.now() - startedAt,
        responseSnippet: "",
        sentPayload: samplePayload,
      };
    }
  });
