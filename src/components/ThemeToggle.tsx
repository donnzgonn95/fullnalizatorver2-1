import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-all hover:text-primary hover:border-primary/50"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
