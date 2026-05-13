import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60 px-4 py-6 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          <strong className="text-foreground">Disclaimer:</strong> CryptoPuls dostarcza danych edukacyjnych i analitycznych.
          Nie stanowią one porady inwestycyjnej. Inwestowanie w kryptowaluty wiąże się z ryzykiem utraty kapitału.
        </p>
        <nav className="flex flex-wrap gap-3">
          <Link to="/regulamin" className="hover:text-foreground">Regulamin</Link>
          <Link to="/polityka-prywatnosci" className="hover:text-foreground">Prywatność</Link>
          <Link to="/disclaimer" className="hover:text-foreground">Ryzyko</Link>
        </nav>
      </div>
    </footer>
  );
}
