import { renderCruxUrlSearchPage } from "@/components/crux/renderCruxUrlSearchPage";
import { HistoricalChartsSection } from "@/components/historical/HistoricalChartsSection";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return renderCruxUrlSearchPage({
    searchParams,
    title: "Historical CrUX reports",
    Content: HistoricalChartsSection,
  });
}
