import type { NextRequest } from 'next/server';
import { apiOk } from '@/lib/api-response';
import { listVideos } from '@/services/videos-service';

export async function GET(request: NextRequest) {
  const experimentId = request.nextUrl.searchParams.get('experimentId') ?? undefined;
  const videos = await listVideos(experimentId);
  return apiOk(videos);
}
