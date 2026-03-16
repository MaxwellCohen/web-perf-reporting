import { PageSpeedInsightsDashboardWrapper } from './PageSpeedInsightsDashboardWrapper';


export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <PageSpeedInsightsDashboardWrapper publicId={publicId} />;
}
