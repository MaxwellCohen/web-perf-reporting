import { updateURl } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { url: rawUrl, ...rest } = await searchParams;
  const url = updateURl(Array.isArray(rawUrl) ? rawUrl[0] : rawUrl);
  const query = new URLSearchParams();
  if (url) query.set("psi", url);
  for (const [key, value] of Object.entries(rest)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }
  const search = query.toString();
  redirect(search ? `/viewer?${search}` : "/viewer");
}
