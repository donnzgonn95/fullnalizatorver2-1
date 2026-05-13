import { createFileRoute, Outlet } from "@tanstack/react-router";
import { GieldaSidebar } from "@/components/gielda/GieldaSidebar";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/gielda")({
  head: () => ({
    ...seoHead({
      title: "Globalny Portal Giełdowy",
      description: "USA i Europa, ETF-y, sektory, makro, taktyki inwestycyjne, portfel i Agent-Analityk.",
      path: "/gielda",
    }),
  }),
  component: GieldaLayout,
});

function GieldaLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <GieldaSidebar />
      <div className="min-w-0 space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
