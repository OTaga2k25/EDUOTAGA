import type { NextRequest } from 'next/server';
import { apiOk } from '@/lib/api-response';
import { listSubjects } from '@/services/subjects-service';

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId') ?? undefined;
  const subjects = await listSubjects({ categoryId });
  return apiOk(subjects);
}
