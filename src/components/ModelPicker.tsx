import { AI_MODELS, type AiModel } from "@/lib/ai-models";
import { Cpu } from "lucide-react";

export function ModelPicker({
  value,
  onChange,
  label = "Model",
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const current: AiModel | undefined = AI_MODELS.find((m) => m.id === value);
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {AI_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {"✦".repeat(m.costStars)}
          </option>
        ))}
      </select>
      {current && (
        <span className="hidden text-[10px] text-muted-foreground sm:inline">{current.desc}</span>
      )}
    </label>
  );
}
