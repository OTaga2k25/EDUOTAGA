import { EmptyState } from '@eduotaga/ui/web';
import { buildSimulationUrl } from '@eduotaga/constants';
import type { CategoryId, DownloadResource } from '@eduotaga/types';

export function DownloadList({
  downloads,
  categoryId,
  slug,
}: {
  downloads: DownloadResource[];
  categoryId: CategoryId;
  slug: string;
}) {
  if (downloads.length === 0) {
    return (
      <EmptyState
        title="No downloads yet"
        description="Worksheets and reference sheets for this experiment will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {downloads.map((download) => (
        <li key={download.id}>
          <a
            href={buildSimulationUrl(categoryId, slug, download.path)}
            download
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-border/30"
          >
            <span className="font-medium text-foreground">{download.label}</span>
            <span className="text-muted">
              {download.type.toUpperCase()}
              {download.sizeLabel ? ` · ${download.sizeLabel}` : ''}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
