import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "teraz";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min temu`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h temu`;
  return `${Math.floor(d / 86_400_000)} dni temu`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

export function TopSetupsWidget() {
  const fetchTop = useServerFn(listTopSetups);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  useEffect(() => { if (authed) startScanner(); }, [authed]);

  const { data, isLoading } = useQuery({
    queryKey: ["top-setups"],
    queryFn: () => fetchTop(),
    refetchInterval: 30_000,
    enabled: authed,
  });

  if (!authed) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Zaloguj się, aby uruchomić skaner setupów. <Link to="/login" className="text-primary hover:underline">Zaloguj się</Link>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Top 10 setupów (live)</h2>
        <Link to="/setupy/historia" className="text-xs text-primary hover:underline">Historia →</Link>
      </header>
      {isLoading && <div className="text-xs text-muted-foreground">Ładowanie…</div>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="text-xs text-muted-foreground">Brak aktywnych setupów. Skaner czeka na nowe świece.</div>
      )}
      <ul className="divide-y divide-border">
        {data?.map((s) => (
          <li key={s.id} className="grid grid-cols-12 gap-2 py-2 text-xs">
            <div className="col-span-2 font-bold">{s.symbol}</div>
            <div className="col-span-1 text-muted-foreground">{s.interval}</div>
            <div className="col-span-2">
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                s.setup_type === "bb_bounce" ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning",
              )}>
                {s.setup_type === "bb_bounce" ? "BB" : "Elliott"}
              </span>
            </div>
            <div className="col-span-1">
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                s.direction === "long" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear",
              )}>{s.direction === "long" ? "L" : "S"}</span>
            </div>
            <div className="col-span-2 text-muted-foreground">{relTime(s.detected_at)}</div>
            <div className="col-span-2 num text-muted-foreground">{fmtTime(s.entry_time)}</div>
            <div className="col-span-2 flex items-center gap-1">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${s.signal_strength}%` }} />
              </div>
              <span className="num w-7 text-right">{Math.round(Number(s.signal_strength))}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
