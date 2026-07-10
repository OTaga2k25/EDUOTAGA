import Link from 'next/link';
import { cn } from '@eduotaga/ui/web';

import { Atom, FlaskConical, Cpu, Settings } from 'lucide-react';

const SUBJECTS = [
  { name: 'Physics', icon: Atom, bg: '!bg-neo-purple dark:!bg-neo-purple' },
  { name: 'Chemistry', icon: FlaskConical, bg: '!bg-neo-orange dark:!bg-neo-orange' },
  { name: 'Electronics', icon: Cpu, bg: '!bg-neo-green dark:!bg-neo-green' },
  { name: 'Mechanical', icon: Settings, bg: '!bg-neo-yellow dark:!bg-neo-yellow' }
];

export function SubjectsGrid() {
  return (
    <div className="flex flex-col gap-2 sm:gap-4 mt-2 sm:mt-0">
      <div className="flex sm:hidden justify-between items-end mb-1 px-1">
        <h2 className="font-black text-lg text-foreground tracking-tight">Subjects</h2>
        <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline mb-0.5">
          View all
        </Link>
      </div>
      {/* Mobile View */}
      <div className="grid sm:hidden grid-cols-4 gap-3">
        {SUBJECTS.map(subject => (
          <Link key={subject.name} href={`/subjects`} className="group outline-none flex flex-col items-center gap-2">
            <div className={cn("neo-card flex items-center justify-center aspect-square w-full", subject.bg)}>
               <span className="inline-block transition-transform duration-300 ease-out group-hover:scale-125 group-hover:rotate-12 group-active:scale-90" aria-hidden="true"><subject.icon className="h-8 w-8 text-black" /></span>
            </div>
            <span className="text-[11px] font-bold text-foreground text-center">{subject.name}</span>
          </Link>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 h-32">
        {SUBJECTS.map(subject => (
          <Link 
            key={subject.name} 
            href={`/subjects`} 
            className={cn("neo-card flex flex-row items-center justify-between p-6 overflow-hidden h-full group outline-none", subject.bg)}
          >
            <span className="text-xl font-black text-black z-10">{subject.name}</span>
            <span className="inline-block transition-all duration-300 ease-out group-hover:scale-125 group-hover:-rotate-12 group-hover:-translate-y-1 group-active:scale-90 z-10" aria-hidden="true"><subject.icon className="h-14 w-14 text-black" /></span>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
