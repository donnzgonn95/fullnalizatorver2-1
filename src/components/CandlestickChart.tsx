// Candlestick chart with stable instance: chart is created once and series/data are
// patched in place across re-renders. Toggling indicators or changing zones does NOT
// destroy the chart — saving render cost and avoiding flicker.
import { useEffect, useRef } from "react";
import type { Candle, VolumePoint } from "@/lib/providers/coingecko-top";
import type { LinePoint } from "@/lib/indicators";

export type ChartOverlay = { id: string; color: string; data: LinePoint[]; title?: string };
export type ChartZone = {
  price: number;
  color: string;
  label: string;
  lineStyle?: 0 | 1 | 2 | 3 | 4; // solid/dashed/etc
};

type AnySeries = {
  setData: (d: unknown[]) => void;
  applyOptions?: (o: unknown) => void;
  createPriceLine?: (o: unknown) => unknown;
  removePriceLine?: (l: unknown) => void;
};
type AnyChart = {
  addSeries?: (t: unknown, o: unknown) => AnySeries;
  addCandlestickSeries?: (o: unknown) => AnySeries;
  addLineSeries?: (o: unknown) => AnySeries;
  addHistogramSeries?: (o: unknown) => AnySeries;
  removeSeries: (s: unknown) => void;
  applyOptions: (o: unknown) => void;
  priceScale: (id: string) => { applyOptions: (o: unknown) => void };
  remove: () => void;
};

export function CandlestickChart({
  data,
  height = 380,
  overlays = [],
  volumes,
  zones = [],
}: {
  data: Candle[];
  height?: number;
  overlays?: ChartOverlay[];
  volumes?: VolumePoint[];
  zones?: ChartZone[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<AnyChart | null>(null);
  const candleRef = useRef<AnySeries | null>(null);
  const overlayRef = useRef<Map<string, AnySeries>>(new Map());
  const volRef = useRef<AnySeries | null>(null);
  const priceLinesRef = useRef<unknown[]>([]);
  const libRef = useRef<typeof import("lightweight-charts") | null>(null);

  // Create chart once.
  useEffect(() => {
    if (!ref.current || typeof window === "undefined") return;
    let disposed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      libRef.current = lib;

      const chart = lib.createChart(ref.current, {
        height,
        layout: {
          background: { color: "transparent" },
          textColor: "rgba(200,200,210,0.85)",
          fontFamily: "inherit",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.05)" },
          horzLines: { color: "rgba(255,255,255,0.05)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)", scaleMargins: { top: 0.05, bottom: 0.05 } },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
      }) as unknown as AnyChart;
      chartRef.current = chart;

      const v5 = lib as unknown as { CandlestickSeries?: unknown };
      candleRef.current = v5.CandlestickSeries
        ? chart.addSeries!(v5.CandlestickSeries, {
            upColor: "#16a34a",
            downColor: "#dc2626",
            wickUpColor: "#16a34a",
            wickDownColor: "#dc2626",
            borderVisible: false,
          })
        : chart.addCandlestickSeries!({
            upColor: "#16a34a",
            downColor: "#dc2626",
            wickUpColor: "#16a34a",
            wickDownColor: "#dc2626",
            borderVisible: false,
          });

      ro = new ResizeObserver(() => {
        if (!ref.current || !chartRef.current) return;
        chartRef.current.applyOptions({ width: ref.current.clientWidth });
      });
      ro.observe(ref.current);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      try {
        chartRef.current?.remove();
      } catch {
        /* noop */
      }
      chartRef.current = null;
      candleRef.current = null;
      overlayRef.current.clear();
      volRef.current = null;
      priceLinesRef.current = [];
    };
  }, [height]);

  // Sync candle data.
  useEffect(() => {
    candleRef.current?.setData(data as unknown[]);
  }, [data]);

  // Sync overlays — add/update/remove series by stable id.
  useEffect(() => {
    const chart = chartRef.current;
    const lib = libRef.current;
    if (!chart || !lib) return;
    const v5 = lib as unknown as { LineSeries?: unknown };
    const incoming = new Set(overlays.map((o) => o.id));

    // Remove gone overlays
    for (const [id, series] of overlayRef.current) {
      if (!incoming.has(id)) {
        try {
          chart.removeSeries(series);
        } catch {
          /* noop */
        }
        overlayRef.current.delete(id);
      }
    }
    // Add or update
    for (const ov of overlays) {
      let s = overlayRef.current.get(ov.id);
      if (!s) {
        s = v5.LineSeries
          ? chart.addSeries!(v5.LineSeries, {
              color: ov.color,
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
              title: ov.title ?? ov.id,
            })
          : chart.addLineSeries!({
              color: ov.color,
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
              title: ov.title ?? ov.id,
            });
        overlayRef.current.set(ov.id, s!);
      } else {
        s.applyOptions?.({ color: ov.color, title: ov.title ?? ov.id });
      }
      s!.setData(ov.data as unknown[]);
    }
  }, [overlays]);

  // Sync volume histogram (toggle by presence/absence).
  useEffect(() => {
    const chart = chartRef.current;
    const lib = libRef.current;
    if (!chart || !lib) return;
    const v5 = lib as unknown as { HistogramSeries?: unknown };

    if (!volumes || !volumes.length) {
      if (volRef.current) {
        try {
          chart.removeSeries(volRef.current);
        } catch {
          /* noop */
        }
        volRef.current = null;
        chart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.05, bottom: 0.05 } } });
      }
      return;
    }

    if (!volRef.current) {
      volRef.current = v5.HistogramSeries
        ? chart.addSeries!(v5.HistogramSeries, { color: "#64748b", priceScaleId: "vol", priceFormat: { type: "volume" } })
        : chart.addHistogramSeries!({ color: "#64748b", priceScaleId: "vol", priceFormat: { type: "volume" } });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      chart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.05, bottom: 0.25 } } });
    }

    const dirByTime = new Map<number, boolean>();
    for (const k of data) dirByTime.set(k.time, k.close >= k.open);
    const candleTimes = data.map((d) => d.time).sort((a, b) => a - b);
    const snap = (t: number) => {
      if (!candleTimes.length) return t;
      let lo = 0,
        hi = candleTimes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (candleTimes[mid] < t) lo = mid + 1;
        else hi = mid;
      }
      const a = candleTimes[Math.max(0, lo - 1)];
      const b = candleTimes[lo];
      return Math.abs(a - t) <= Math.abs(b - t) ? a : b;
    };
    const colored = volumes.map((v) => {
      const snapped = snap(v.time);
      const up = dirByTime.get(snapped);
      return { time: snapped, value: v.value, color: up === false ? "rgba(220,38,38,0.55)" : "rgba(22,163,74,0.55)" };
    });
    volRef.current.setData(colored);
  }, [volumes, data]);

  // Sync price-line zones on the candle series.
  useEffect(() => {
    const series = candleRef.current;
    if (!series || !series.createPriceLine || !series.removePriceLine) return;
    for (const l of priceLinesRef.current) {
      try {
        series.removePriceLine(l);
      } catch {
        /* noop */
      }
    }
    priceLinesRef.current = [];
    for (const z of zones) {
      try {
        const l = series.createPriceLine({
          price: z.price,
          color: z.color,
          lineWidth: 1,
          lineStyle: z.lineStyle ?? 2, // dashed
          axisLabelVisible: true,
          title: z.label,
        });
        priceLinesRef.current.push(l);
      } catch {
        /* noop */
      }
    }
  }, [zones]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
