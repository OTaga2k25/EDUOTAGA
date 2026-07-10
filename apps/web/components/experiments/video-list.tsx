import { EmptyState } from '@eduotaga/ui/web';
import type { Video } from '@eduotaga/types';

function toEmbedUrl(video: Video): string | null {
  if (video.provider === 'youtube') {
    const id = video.url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (video.provider === 'vimeo') {
    const id = video.url.match(/vimeo\.com\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return video.url;
}

export function VideoList({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return <EmptyState title="No videos yet" description="Video walkthroughs will appear here." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {videos.map((video) => {
        const embedUrl = toEmbedUrl(video);
        return (
          <div key={video.id} className="flex flex-col gap-2">
            <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-surface">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  loading="lazy"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Video unavailable
                </div>
              )}
            </div>
            <p className="font-medium text-foreground">{video.title}</p>
            {video.description && <p className="text-sm text-muted">{video.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
