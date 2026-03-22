import { RenderJSONDetails } from '@/features/page-speed-insights/RenderJSONDetails';

interface RecommendationAuditDetailsProps {
  auditId: string;
  auditData: unknown[];
}

export function RecommendationAuditDetails({
  auditId,
  auditData,
}: RecommendationAuditDetailsProps) {
  if (!auditData.some((item) => item != null)) {
    return null;
  }

  return (
    <div className="mt-4">
      <RenderJSONDetails
        className="text-right"
        data={auditData[0]}
        data2={auditData[1]}
        title={`All Data for ${auditId}`}
      />
    </div>
  );
}
