import type { DashboardStat } from '@eduotaga/constants';
import { cn } from '@eduotaga/ui/web';

const STAT_COLORS = [
  'bg-neo-purple dark:bg-neo-purple',
  'bg-neo-orange dark:bg-neo-orange',
  'bg-neo-yellow dark:bg-neo-yellow',
  'bg-neo-green dark:bg-neo-green',
];

export function StatsRow({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.id} className={cn("neo-card-no-hover p-4 flex flex-col justify-between relative overflow-hidden dark:text-black", STAT_COLORS[index % STAT_COLORS.length])}>
          <p className="text-sm font-bold">{stat.label}</p>
          <div className="mt-6 flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{stat.value}</span>
              <span className="text-xs font-bold bg-white/30 px-1.5 py-0.5 rounded flex items-center text-black">
                ↑ {stat.delta}
              </span>
            </div>
          </div>
          <div className="absolute right-2 bottom-2 text-5xl">
            {stat.icon}
          </div>
          {index === 3 && (
             <p className="mt-1 text-xs font-bold">Keep it up! 🔥</p>
          )}
        </div>
      ))}
    </div>
  );
}
