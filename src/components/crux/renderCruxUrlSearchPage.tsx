import type { ComponentType } from "react";

import { CruxReportUrlPage } from "@/components/crux/CruxReportUrlPage";
import { normalizedCruxUrlFromSearchParams } from "@/lib/utils";

type AppSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type CruxUrlContentProps = { url: string };

/**
 * Awaits the `url` search param and returns {@link CruxReportUrlPage} with the given content.
 * Use from an async route so resolution happens in the page, not in a nested async component.
 */
export async function renderCruxUrlSearchPage({
  searchParams,
  title,
  Content,
}: {
  searchParams: AppSearchParams;
  title: string;
  Content: ComponentType<CruxUrlContentProps>;
}) {
  const url = await normalizedCruxUrlFromSearchParams(searchParams);

  return (
    <CruxReportUrlPage title={title} url={url}>
      {(u) => <Content url={u} />}
    </CruxReportUrlPage>
  );
}
