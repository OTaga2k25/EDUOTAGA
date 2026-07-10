import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { Bookmark, ArrowRight, Settings } from 'lucide-react';
import Image from 'next/image';

export function ContinueLearningCard({
  experiment,
  progressPercent,
}: {
  experiment: ExperimentSummary;
  progressPercent: number;
}) {
  return (
    <div>
      <h2 className="hidden sm:block text-xl font-black text-foreground mb-3">Continue Learning</h2>
      <div className="neo-card-no-hover p-3 sm:p-4 flex flex-row gap-3 sm:gap-4 items-center">
        <div className="w-20 h-20 sm:w-48 sm:h-32 bg-neo-purple rounded-xl border-2 border-black dark:border-white flex items-center justify-center shrink-0 overflow-hidden relative">
           <Image src="/images/boy.png" alt="Ohm's Law" fill className="object-cover opacity-50 sm:hidden" />
           <Settings className="w-14 h-14 text-black hidden sm:block" />
        </div>
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="flex justify-between items-start">
             <div>
               <span className="hidden sm:inline-block bg-neo-yellow px-2 py-0.5 rounded text-xs font-bold border-2 border-black mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:text-black">
                 Simulation
               </span>
               <h3 className="text-[15px] sm:text-lg font-black leading-tight sm:leading-normal">{experiment.title}</h3>
               <p className="text-[11px] sm:text-sm font-semibold opacity-70 mt-0.5 sm:mt-0">{experiment.subjectName}</p>
             </div>
             <button className="hidden sm:block hover:opacity-70">
               <Bookmark className="h-6 w-6" />
             </button>
             <Link href={`/experiments/${experiment.slug}`} className="sm:hidden flex h-7 w-7 mt-1 items-center justify-center rounded-full border-2 border-black dark:border-white shrink-0">
               <ArrowRight className="h-4 w-4" strokeWidth={3} />
             </Link>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
             <div className="w-24 sm:flex-1 h-1.5 sm:h-3 rounded-full border border-black sm:border-2 dark:border-white bg-white overflow-hidden flex">
                <div className="h-full bg-neo-blue border-r-2 border-black dark:border-white" style={{ width: `${progressPercent}%` }} />
             </div>
             <span className="text-[10px] sm:text-sm font-bold w-10">{progressPercent}%</span>
             <Link href={`/experiments/${experiment.slug}`} className="hidden sm:inline-flex neo-btn whitespace-nowrap">
               Continue
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
