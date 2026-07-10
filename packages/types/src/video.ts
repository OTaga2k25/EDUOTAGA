export type VideoProvider = 'youtube' | 'vimeo' | 'file';

export interface Video {
  id: string;
  title: string;
  description?: string;
  provider: VideoProvider;
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  experimentId: string;
}
