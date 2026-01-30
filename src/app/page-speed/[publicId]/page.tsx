// import { PageSpeedInsightsDashboardWrapper } from './PageSpeedInsightsDashboardWrapper';

export const dynamic = 'force-dynamic';

export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  console.log('publicId', publicId);
  return <div>Hello {publicId}</div>;
  // return <PageSpeedInsightsDashboardWrapper publicId={publicId} />;
}
