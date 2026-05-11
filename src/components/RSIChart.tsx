// Standalone RSI sub-chart (line series only). Re-uses lightweight-charts.
import { useEffect, useRef } from "react";
import type { LinePoint } from "@/lib/indicators";

export function RSIChart({ data, height = 120 }: { data: LinePoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || typeof window === "undefined" || !data.length) return;
    let disposed = false;
    let chart: { remove: () => void } | null = null;

    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;

      const created = lib.createChart(ref.current, {
        height,
        layout: { background: { color: "transparent" }, textColor: "rgba(200,200,210,0.85)", fontFamily: "inherit" },
        grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
      });
      chart = created;

      type AnyChart = {
        addSeries?: (t: unknown, o: unknown) => { setData: (d: unknown[]) => void; createPriceLine?: (o: unknown) => void };
        addLineSeries?: (o: unknown) => { setData: (d: unknown[]) => void; createPriceLine?: (o: unknown) => void };
        applyOptions: (o: unknown) => void;
      };
      const c = created as unknown as AnyChart;
      const v5 = lib as unknown as { LineSeries?: unknown };
      const series = v5.LineSeries
        ? c.addSeries!(v5.LineSeries, { color: "#a855f7", lineWidth: 2, priceLineVisible: false })
        : c.addLineSeries!({ color: "#a855f7", lineWidth: 2, priceLineVisible: false });
      series.setData(data);
      series.createPriceLine?.({ price: 70, color: "#dc2626", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "70" });
      series.createPriceLine?.({ price: 30, color: "#16a34a", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "30" });

      const ro = new ResizeObserver(() => {
        if (!ref.current) return;
        c.applyOptions({ width: ref.current.clientWidth });
      });
      ro.observe(ref.current);
      return () => ro.disconnect();
    })();

    return () => {
      disposed = true;
      try {
        chart?.remove();
      } catch {
        /* noop */
      }
    };
  }, [data, height]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
