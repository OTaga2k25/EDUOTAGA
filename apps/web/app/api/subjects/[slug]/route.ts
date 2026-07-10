import { apiError, apiOk } from '@/lib/api-response';
import { getSubjectBySlug } from '@/services/subjects-service';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) return apiError(`Subject "${slug}" was not found.`);
  return apiOk(subject);
}
