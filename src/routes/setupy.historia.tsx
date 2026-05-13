import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSetupHistory } from "@/lib/setups.functions";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/setupy/historia")({
  head: () => ({ ...seoHead({ title: "Historia setupów", description: "Historia wykrytych setupów z wynikami win/loss.", path: "/setupy/historia" }) }),
  component: HistoryPage,
});

function HistoryPage() {
  const [result, setResult] = useState<"win" | "loss" | "neutral" | "all">("all");
  const [type, setType] = useState<"elliott_wave" | "bb_bounce" | "all">("all");
  const fetchHistory = useServerFn(listSetupHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["setup-history", result, type],
    queryFn: () => fetchHistory({ data: {
      result: result === "all" ? null : result,
      setup_type: type === "all" ? null : type,
      limit: 100,
    } }),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Historia setupów</h1>
        <p className="text-sm text-muted-foreground">Wykryte setupy z wynikiem TP/SL po weryfikacji.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Filter label="Wynik" value={result} setValue={(v) => setResult(v as typeof result)} options={[
          { v: "all", l: "Wszystkie" }, { v: "win", l: "Wygrane" }, { v: "loss", l: "Stratne" }, { v: "neutral", l: "Neutralne" },
        ]} />
        <Filter label="Typ" value={type} setValue={(v) => setType(v as typeof type)} options={[
          { v: "all", l: "Wszystkie" }, { v: "bb_bounce", l: "BB Bounce" }, { v: "elliott_wave", l: "Fala Elliotta" },
        ]} />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Ładowanie…</div>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-background/50 text-muted-foreground">
            <tr>
              <Th>Symbol</Th><Th>Interwał</Th><Th>Typ</Th><Th>Kierunek</Th><Th>Entry</Th><Th>SL</Th><Th>TP</Th>
              <Th>Status</Th><Th>Wynik</Th><Th>Wykryto</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <Td className="font-bold">{s.symbol}</Td>
                <Td>{s.interval}</Td>
                <Td>{s.setup_type === "bb_bounce" ? "BB" : "Elliott"}</Td>
                <Td><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  s.direction === "long" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear")}>{s.direction}</span></Td>
                <Td className="num">{Number(s.entry_price)}</Td>
                <Td className="num">{Number(s.stop_loss)}</Td>
                <Td className="num">{Number(s.take_profit)}</Td>
                <Td>{s.status}</Td>
                <Td>{s.result ? <span className={cn("font-bold",
                  s.result === "win" && "text-bull", s.result === "loss" && "text-bear")}>{s.result}</span> : "—"}</Td>
                <Td className="num text-muted-foreground">{new Date(s.detected_at).toLocaleString("pl-PL")}</Td>
              </tr>
            ))}
            {(data?.length ?? 0) === 0 && !isLoading && (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Brak wpisów.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={cn("px-3 py-2", className)}>{children}</td>; }
function Filter({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
      <span className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button key={o.v} onClick={() => setValue(o.v)}
          className={cn("rounded px-2 py-1 text-[11px] font-semibold",
            value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
