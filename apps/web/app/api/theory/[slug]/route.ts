import { apiError, apiOk } from '@/lib/api-response';
import { getTheoryBySlug } from '@/services/experiments-service';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theory = await getTheoryBySlug(slug);
  if (!theory) return apiError(`Theory for "${slug}" was not found.`);
  return apiOk(theory);
}
