import Link from 'next/link';
import { Anchor, ArrowRight, Atom, Code2, Cpu, FlaskConical, Leaf, Settings, Sigma, Sparkles } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  electronics: Cpu,
  mechanical: Settings,
  mathematics: Sigma,
  marine: Anchor,
  computer: Code2,
};

const BG: Record<string, string> = {
  physics: 'bg-purple-300 dark:bg-purple-400',
  chemistry: 'bg-orange-300 dark:bg-orange-400',
  biology: 'bg-pink-300 dark:bg-pink-400',
  electronics: 'bg-emerald-300 dark:bg-emerald-400',
  mechanical: 'bg-yellow-300 dark:bg-yellow-400',
  mathematics: 'bg-blue-300 dark:bg-blue-400',
  marine: 'bg-cyan-300 dark:bg-cyan-400',
  computer: 'bg-indigo-300 dark:bg-indigo-400',
};

interface CategoryCardProps {
  categoryId: string;
  name: string;
  description?: string;
  subjectNames: string[];
  experimentCount: number;
  hasNew?: boolean;
}

/** A large, tappable card for one discipline (Physics, Chemistry, …) on the experiments landing page. */
export function CategoryCard({ categoryId, name, description, subjectNames, experimentCount, hasNew }: CategoryCardProps) {
  const Icon = ICONS[categoryId] ?? Sparkles;
  const bg = BG[categoryId] ?? 'bg-neo-yellow';
  const shown = subjectNames.slice(0, 4);
  const more = subjectNames.length - shown.length;

  return (
    <Link
      href={`/experiments?categoryId=${encodeURIComponent(categoryId)}`}
      className="neo-card group flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-1 sm:p-6"
      aria-label={`${name}: ${experimentCount} labs`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] ${bg}`}
        >
          <Icon className="h-8 w-8 text-black" />
        </div>
        {hasNew && (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-[#ffde59] px-2.5 py-0.5 text-[10px] font-black tracking-wider text-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]">
            ★ New labs
          </span>
        )}
      </div>

      <h2 className="text-foreground group-hover:text-primary mt-5 text-3xl font-black tracking-tight transition-colors">
        {name}
      </h2>
      {description && <p className="text-muted mt-1.5 text-sm leading-relaxed font-semibold">{description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-foreground rounded-full border-2 border-black bg-black/5 px-3 py-0.5 text-xs font-black dark:border-white/30 dark:bg-white/10">
          {experimentCount} {experimentCount === 1 ? 'lab' : 'labs'}
        </span>
        <span className="bg-neo-yellow/30 text-foreground rounded-full border-2 border-black px-3 py-0.5 text-xs font-black dark:border-white/30">
          {subjectNames.length} {subjectNames.length === 1 ? 'topic' : 'topics'}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {shown.map((s) => (
          <li key={s} className="text-foreground/80 flex items-center gap-2 text-sm font-bold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span className="truncate">{s}</span>
          </li>
        ))}
        {more > 0 && <li className="text-muted pl-3.5 text-xs font-bold">+{more} more</li>}
      </ul>

      <div className="mt-auto pt-5">
        <span className="bg-foreground text-background inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black px-4 py-3 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:translate-x-0.5 dark:border-white">
          Open {name} labs
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
