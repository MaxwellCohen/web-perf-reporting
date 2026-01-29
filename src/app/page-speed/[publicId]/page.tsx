import Dynamic from 'next/dynamic';
const PageSpeedInsightsDashboardWrapper = Dynamic(() => import('./PageSpeedInsightsDashboardWrapper').then(mod => mod.PageSpeedInsightsDashboardWrapper), {
  ssr: false,
});

export const dynamic = 'force-dynamic';

export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <PageSpeedInsightsDashboardWrapper publicId={publicId} />;
}
