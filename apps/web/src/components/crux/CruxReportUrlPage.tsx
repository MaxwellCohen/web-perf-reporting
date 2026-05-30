import { UrlLookupForm } from "@/components/common/UrlLookupForm";
import type { ReactNode } from "react";

type CruxReportUrlPageProps = {
  title: string;
  /** Normalized URL from the `url` search param, if any. */
  url: string | undefined;
  /** Called only when `url` is present. */
  children: (url: string) => ReactNode;
};

export function CruxReportUrlPage({ title, url, children }: CruxReportUrlPageProps) {
  return (
    <div className="container mx-auto">
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        {`${title}${url ? ` for ${url} ` : " "}`}
      </h1>
      {url ? children(url) : <UrlLookupForm />}
    </div>
  );
}
