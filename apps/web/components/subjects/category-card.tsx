import Link from 'next/link';
import type { Category } from '@eduotaga/types';
import { Atom, FlaskConical, Leaf, Cpu, Settings, Sigma } from 'lucide-react';

const CATEGORY_ICONS = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  electronics: Cpu,
  mechanical: Settings,
  mathematics: Sigma,
  marine: Leaf, // using Leaf temporarily or Ship if available
} as const;

const CATEGORY_BG = {
  physics: '!bg-neo-purple dark:!bg-neo-purple',
  chemistry: '!bg-neo-orange dark:!bg-neo-orange',
  biology: '!bg-neo-pink dark:!bg-neo-pink',
  electronics: '!bg-neo-green dark:!bg-neo-green',
  mechanical: '!bg-neo-yellow dark:!bg-neo-yellow',
  mathematics: '!bg-neo-blue dark:!bg-neo-blue',
  marine: '!bg-neo-cyan dark:!bg-neo-cyan',
} as const;

export function CategoryCard({
  category,
  subjectCount,
  experimentCount,
}: {
  category: Category;
  subjectCount: number;
  experimentCount: number;
}) {
  const Icon = CATEGORY_ICONS[category.id];

  return (
    <Link href={`/subjects?categoryId=${category.id}`} className="group block h-full outline-none">
      <div className="neo-card flex h-full flex-col gap-3 p-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black dark:border-white ${CATEGORY_BG[category.id]}`}>
          <Icon className="h-8 w-8 text-black transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6" />
        </div>
        <h3 className="text-lg font-black text-foreground">{category.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm font-semibold opacity-70">{category.description}</p>
        <p className="text-xs font-bold opacity-70">
          {subjectCount} subject{subjectCount === 1 ? '' : 's'} · {experimentCount} experiment{experimentCount === 1 ? '' : 's'}
        </p>
      </div>
    </Link>
  );
}
