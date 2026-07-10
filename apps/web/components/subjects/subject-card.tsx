import Link from 'next/link';
import { CATEGORIES } from '@eduotaga/constants';
import type { SubjectWithCount } from '@eduotaga/types';

export function SubjectCard({ subject }: { subject: SubjectWithCount }) {
  const category = CATEGORIES[subject.categoryId];

  return (
    <Link href={`/subjects/${subject.slug}`} className="block h-full outline-none">
      <div className="neo-card flex h-full flex-col gap-3 p-6">
        <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {category.name}
        </span>
        <h3 className="text-lg font-black text-foreground">{subject.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm font-semibold opacity-70">{subject.description}</p>
        <p className="text-xs font-bold opacity-70">
          {subject.experimentCount} experiment{subject.experimentCount === 1 ? '' : 's'}
        </p>
      </div>
    </Link>
  );
}
