import { EmptyState } from '@eduotaga/ui/web';

export function SimulationFrame({
  simulationUrl,
  available,
  title,
}: {
  simulationUrl: string;
  available: boolean;
  title: string;
}) {
  if (!available) {
    return (
      <EmptyState
        title="Simulation coming soon"
        description="This experiment's interactive simulation hasn't been added yet. Check back soon, or contribute one — see docs/adding-experiments.md."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <iframe
        src={simulationUrl}
        title={`${title} simulation`}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        className="h-[520px] w-full"
      />
    </div>
  );
}
