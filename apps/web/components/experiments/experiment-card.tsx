import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { Car, FlaskConical, Microscope } from 'lucide-react';

export function ExperimentCard({ experiment }: { experiment: ExperimentSummary }) {
  // Stable random-ish number based on title length
  const minRead = (experiment.title.length % 15) + 5;
  
  return (
    <Link href={`/experiments/${experiment.slug}`} className="block h-full outline-none">
      <div className="neo-card flex h-full flex-col justify-between p-4 min-h-[160px]">
        <div>
          <h3 className="text-sm font-black leading-tight mb-1">{experiment.title}</h3>
          <p className="text-xs font-semibold opacity-70">{experiment.subjectName}</p>
        </div>
        
         <div className="flex items-end justify-between mt-4">
           <span className="text-xs font-bold">{minRead} min read</span>
           <div aria-hidden="true">
             {experiment.subjectName === 'Physics' ? <Car className="h-10 w-10 text-black dark:text-white opacity-70" /> : 
              experiment.subjectName === 'Chemistry' ? <FlaskConical className="h-10 w-10 text-black dark:text-white opacity-70" /> : <Microscope className="h-10 w-10 text-black dark:text-white opacity-70" />}
           </div>
        </div>
      </div>
    </Link>
  );
}
