import type { NextRequest } from 'next/server';
import type { ExperimentDifficulty } from '@eduotaga/types';
import { apiOk } from '@/lib/api-response';
import { listExperiments } from '@/services/experiments-service';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const experiments = await listExperiments({
    subjectId: searchParams.get('subjectId') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    difficulty: (searchParams.get('difficulty') as ExperimentDifficulty) ?? undefined,
  });
  return apiOk(experiments);
}
