import { apiError, apiOk } from '@/lib/api-response';
import { getExperimentDetail } from '@/services/experiments-service';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experiment = await getExperimentDetail(slug);
  if (!experiment) return apiError(`Experiment "${slug}" was not found.`);
  return apiOk(experiment);
}
