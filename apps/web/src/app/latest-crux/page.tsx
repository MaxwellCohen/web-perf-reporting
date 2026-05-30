import { renderCruxUrlSearchPage } from "@/components/crux/renderCruxUrlSearchPage";
import { CurrentPerformanceSection } from "@/components/latest-crux/CurrentPerformanceSection";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return renderCruxUrlSearchPage({
    searchParams,
    title: "Latest Crux Report",
    Content: CurrentPerformanceSection,
  });
}
