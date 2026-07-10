import type { Video } from '@eduotaga/types';
import { getVideos } from '@/lib/data';

export async function listVideos(experimentId?: string): Promise<Video[]> {
  const videos = await getVideos();
  return experimentId ? videos.filter((video) => video.experimentId === experimentId) : videos;
}
