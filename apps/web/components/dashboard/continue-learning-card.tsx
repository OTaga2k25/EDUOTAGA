import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { Bookmark, ArrowRight, Settings } from 'lucide-react';
import Image from 'next/image';

export function ContinueLearningCard({
  experiment,
}: {
  experiment: ExperimentSummary;
}) {
  return (
    <div>
      <h2 className="hidden sm:block text-xl font-black text-foreground mb-3">Continue Learning</h2>
      <div className="neo-card-no-hover p-3 sm:p-4 flex flex-row gap-3 sm:gap-4 items-center">
        <div className="w-20 h-20 sm:w-48 sm:h-32 bg-neo-purple rounded-xl border-2 border-black dark:border-white flex items-center justify-center shrink-0 overflow-hidden relative">
           <Image src="/images/boy.png" alt="Ohm's Law" fill sizes="80px" className="object-cover opacity-50 sm:hidden" />
           <Settings className="w-14 h-14 text-black hidden sm:block" />
        </div>
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="flex justify-between items-start">
             <div>
               <h3 className="text-[15px] sm:text-lg font-black leading-tight sm:leading-normal">{experiment.title}</h3>
             </div>
             <button aria-label="Bookmark experiment" className="hidden sm:block hover:opacity-70">
               <Bookmark className="h-6 w-6" />
             </button>
             <Link href={`/experiments/${experiment.slug}`} className="sm:hidden flex h-7 w-7 mt-1 items-center justify-center rounded-full border-2 border-black dark:border-white shrink-0">
               <ArrowRight className="h-4 w-4" strokeWidth={3} />
             </Link>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
             <Link href={`/experiments/${experiment.slug}`} className="hidden sm:inline-flex neo-btn whitespace-nowrap">
               Continue
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
