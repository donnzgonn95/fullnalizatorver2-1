import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LabSidebar } from "@/components/lab/LabSidebar";
import { LabStatusBar } from "@/components/lab/LabStatusBar";
import { PaperBanner } from "@/components/lab/PaperBanner";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/lab")({
  head: () => ({
    ...seoHead({
      title: "Agent Trading Lab — Paper Trading",
      description: "Backtest 3M, Paper Trading, Risk Engine, Journal, Alerty Telegram, Morning/Evening Report. Bez realnej egzekucji.",
      path: "/lab",
    }),
  }),
  component: LabLayout,
});

function LabLayout() {
  return (
    <RequireAuth>
      <div className="space-y-4">
        <LabStatusBar />
        <PaperBanner />
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <LabSidebar />
          <div className="min-w-0 space-y-6"><Outlet /></div>
        </div>
      </div>
    </RequireAuth>
  );
}
