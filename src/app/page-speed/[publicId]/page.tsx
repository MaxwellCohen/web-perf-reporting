import { PageSpeedInsightsDashboardWrapper } from './PageSpeedInsightsDashboardWrapper';

export const dynamic = 'force-dynamic';

export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <PageSpeedInsightsDashboardWrapper publicId={publicId} />;
}
