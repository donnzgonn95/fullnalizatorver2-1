import { Plus, Trash2, Pencil, Download, MessageSquare } from "lucide-react";
import { useConversations, deleteConversation, renameConversation, clearAllConversations, type Conversation } from "@/lib/chat-history";
import { cn } from "@/lib/utils";

export function ConversationsSidebar({
  activeId,
  onSelect,
  onNew,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const list = useConversations();

  const exportConv = (c: Conversation) => {
    const md = `# ${c.title}\n\n_Model: ${c.model} · ${new Date(c.createdAt).toLocaleString("pl-PL")}_\n\n` +
      c.messages.map((m) => `**${m.role === "user" ? "Ty" : "eL Jot"}:**\n\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.title.slice(0, 40).replace(/[^\w-]+/g, "_") || "rozmowa"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> Historia ({list.length})
        </div>
        <div className="flex gap-1">
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" /> Nowa
          </button>
          {list.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Wyczyścić całą historię rozmów?")) clearAllConversations();
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-secondary"
              title="Wyczyść wszystko"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Brak zapisanych rozmów. Zacznij pierwszą.</p>
      ) : (
        <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
          {list.map((c) => (
            <li
              key={c.id}
              className={cn(
                "group rounded-md border px-2 py-1.5 text-xs transition-colors",
                activeId === c.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:bg-secondary",
              )}
            >
              <button onClick={() => onSelect(c.id)} className="block w-full text-left">
                <div className="truncate font-medium">{c.title}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(c.updatedAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>{c.messages.length} wiad.</span>
                </div>
              </button>
              <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => {
                    const t = prompt("Nowa nazwa:", c.title);
                    if (t) renameConversation(c.id, t);
                  }}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-secondary"
                  title="Zmień nazwę"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => exportConv(c)}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-secondary"
                  title="Eksport .md"
                >
                  <Download className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Usunąć tę rozmowę?")) deleteConversation(c.id);
                  }}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-secondary"
                  title="Usuń"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
