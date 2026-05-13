export function PaperBanner() {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
      ⚠ <strong>PAPER TRADING MODE</strong> — moduł działa wyłącznie w trybie symulacyjnym.
      Żadne zlecenia nie są wysyłane do brokera. Brak realnej egzekucji.
    </div>
  );
}
