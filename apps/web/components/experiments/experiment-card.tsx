import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { CATEGORIES } from '@eduotaga/constants';
import { Atom, FlaskConical, Leaf, Cpu, Settings, Sigma, Anchor, Terminal, Sparkles } from 'lucide-react';

const CATEGORY_ICONS = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  electronics: Cpu,
  mechanical: Settings,
  mathematics: Sigma,
  marine: Anchor,
  computer: Terminal,
} as const;

export function ExperimentCard({ experiment }: { experiment: ExperimentSummary }) {
  // Stable random-ish number based on title length
  const minRead = (experiment.title.length % 15) + 5;
  const category = CATEGORIES[experiment.categoryId];
  const Icon = CATEGORY_ICONS[experiment.categoryId];
  const isNew = Boolean(experiment.isNew || experiment.slug === 'ESP_Prototyping');

  return (
    <Link href={`/experiments/${experiment.slug}`} className="block h-full outline-none">
      <div className={`neo-card relative overflow-hidden flex h-full min-h-[160px] flex-col justify-between p-4 transition-all hover:-translate-y-1 ${
        isNew ? 'bg-[#ffde59]/10 dark:bg-[#ffde59]/15' : ''
      }`}>
        {/* ── Corner Ribbon ── */}
        {isNew && (
          <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none z-10">
            <div className="absolute transform rotate-45 bg-[#ffde59] text-black font-black text-[9px] py-1 right-[-28px] top-[14px] w-[95px] text-center border-y-2 border-black shadow-[0_2px_0_rgba(0,0,0,0.3)] tracking-wider uppercase">
              ★ NEW ★
            </div>
          </div>
        )}

        <div className={isNew ? 'pr-12' : ''}>
          <h3 className="mb-1 text-sm leading-tight font-black">{experiment.title}</h3>
          {isNew && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 mt-1">
              <Sparkles className="h-3 w-3 fill-current" /> Newly Added Lab
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-end">
          <div aria-hidden="true">
            <Icon className="h-10 w-10 text-black opacity-70 dark:text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
