import Link from 'next/link';
import {
  Sun,
  Anchor,
  Code2,
  Zap,
  Globe,
  Atom,
  FlaskConical,
  Leaf,
  Cpu,
  Settings,
  Sigma,
  Monitor,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { ExperimentSummary } from '@eduotaga/types';

interface SubjectModuleCardProps {
  subjectId?: string;
  subjectName: string;
  subjectSlug?: string;
  subjectDescription?: string;
  iconName?: string;
  subjectColor?: string;
  categoryId?: string;
  experiments: ExperimentSummary[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  anchor: Anchor,
  code: Code2,
  zap: Zap,
  globe: Globe,
  atom: Atom,
  flask: FlaskConical,
  leaf: Leaf,
  cpu: Cpu,
  settings: Settings,
  sigma: Sigma,
  monitor: Monitor,
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  electronics: Cpu,
  mechanical: Settings,
  mathematics: Sigma,
  marine: Anchor,
  computer: Code2,
};

const COLOR_BG: Record<string, string> = {
  orange: 'bg-orange-300 dark:bg-orange-400',
  amber: 'bg-amber-300 dark:bg-amber-400',
  sky: 'bg-sky-300 dark:bg-sky-400',
  cyan: 'bg-cyan-300 dark:bg-cyan-400',
  purple: 'bg-purple-300 dark:bg-purple-400',
  green: 'bg-emerald-300 dark:bg-emerald-400',
  yellow: 'bg-yellow-300 dark:bg-yellow-400',
  emerald: 'bg-emerald-300 dark:bg-emerald-400',
};

const CATEGORY_BG: Record<string, string> = {
  physics: 'bg-purple-300 dark:bg-purple-400',
  chemistry: 'bg-orange-300 dark:bg-orange-400',
  biology: 'bg-pink-300 dark:bg-pink-400',
  electronics: 'bg-emerald-300 dark:bg-emerald-400',
  mechanical: 'bg-yellow-300 dark:bg-yellow-400',
  mathematics: 'bg-blue-300 dark:bg-blue-400',
  marine: 'bg-cyan-300 dark:bg-cyan-400',
  computer: 'bg-indigo-300 dark:bg-indigo-400',
};

export function SubjectModuleCard({
  subjectId,
  subjectName,
  subjectSlug,
  subjectDescription,
  iconName,
  subjectColor,
  categoryId,
  experiments,
}: SubjectModuleCardProps) {
  const IconComponent =
    (iconName && ICON_MAP[iconName.toLowerCase()]) ||
    (categoryId && CATEGORY_ICONS[categoryId.toLowerCase()]) ||
    Sparkles;

  const bgStyle =
    (subjectColor && COLOR_BG[subjectColor.toLowerCase()]) ||
    (categoryId && CATEGORY_BG[categoryId.toLowerCase()]) ||
    'bg-neo-yellow dark:bg-neo-yellow';

  const subjectHref = subjectSlug ? `/subjects/${subjectSlug}` : undefined;

  return (
    <div className="neo-card flex h-full flex-col justify-between p-5 transition-all duration-300 sm:p-6">
      {/* ── Top section: Subject Info ── */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${bgStyle}`}
          >
            <IconComponent className="h-6 w-6 text-black" />
          </div>

          <span className="text-foreground rounded-full border-2 border-black bg-black/5 px-2.5 py-0.5 text-xs font-black dark:border-white/30 dark:bg-white/10">
            {experiments.length} {experiments.length === 1 ? 'lab' : 'labs'}
          </span>
        </div>

        <div className="mt-4">
          {subjectHref ? (
            <Link href={subjectHref} className="group/title block">
              <h3 className="text-foreground group-hover/title:text-primary text-xl leading-snug font-black tracking-tight transition-colors">
                {subjectName}
              </h3>
            </Link>
          ) : (
            <h3 className="text-foreground text-xl leading-snug font-black tracking-tight">
              {subjectName}
            </h3>
          )}

          {subjectDescription && (
            <p className="text-muted mt-1.5 line-clamp-2 text-xs leading-relaxed font-semibold">
              {subjectDescription}
            </p>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="my-5 border-t-2 border-dashed border-black/15 dark:border-white/20" />

        {/* ── Experiments section ── */}
        <div>
          <div className="text-muted mb-3 flex items-center justify-between text-[11px] font-black tracking-wider uppercase">
            <span>Experiments</span>
            <span>{experiments.length}</span>
          </div>

          <div className="flex flex-col gap-3">
            {experiments.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiments/${exp.slug}`}
                className="group/exp block rounded-lg border-2 border-black bg-black/[0.02] p-3.5 transition-all hover:-translate-y-0.5 hover:bg-black/[0.05] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white/40 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)]"
              >
                <div>
                  <h4 className="text-foreground group-hover/exp:text-primary text-sm leading-snug font-black transition-colors">
                    {exp.title}
                  </h4>
                </div>

                {exp.summary && (
                  <p className="text-muted mt-1.5 line-clamp-2 text-xs leading-relaxed font-medium">
                    {exp.summary}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 dark:border-white/10">
                  <span className="text-muted max-w-[150px] truncate text-[11px] font-bold">
                    Interactive Lab
                  </span>
                  <span className="text-primary inline-flex items-center gap-1 text-xs font-black group-hover/exp:underline">
                    Launch Lab
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/exp:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer Link ── */}
      {subjectHref && (
        <div className="mt-5 border-t border-black/10 pt-3 dark:border-white/10">
          <Link
            href={subjectHref}
            className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-black transition-colors hover:underline"
          >
            Explore all in {subjectName}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
