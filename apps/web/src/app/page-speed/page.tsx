import { UrlLookupForm } from "@/components/common/UrlLookupForm";
import { redirectSearchString } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { updateURl } from "@/lib/utils";
import { requestPageSpeedData } from "@/lib/services/pageSpeedInsights.service";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const url = updateURl(params.url as string);

  if (url) {
    const publicId = await requestPageSpeedData(url);
    if (publicId) {
      redirect(`/page-speed/${publicId}${redirectSearchString(params)}`);
    }
  }

  return <UrlLookupForm />;
}
