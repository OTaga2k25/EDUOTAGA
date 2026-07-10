import Image from 'next/image';
import { Sparkles } from 'lucide-react';

export function WelcomeBanner() {
  return (
    <>
      <div className="neo-card-no-hover relative overflow-hidden bg-white p-5 sm:hidden flex flex-col justify-center min-h-[160px] dark:bg-zinc-900">
        <div className="relative z-10 w-2/3">
          <p className="text-xs font-bold mb-1 flex items-center gap-1">
            Welcome to edUOtaga <Sparkles className="w-3 h-3 text-neo-blue" />
          </p>
          <h1 className="text-xl font-black leading-tight">
            Let's learn something new today!
          </h1>
        </div>
        <div className="absolute right-0 bottom-0 w-44 h-44">
           <Image 
             src="/images/boy.png" 
             alt="Student studying" 
             fill
             sizes="176px"
             className="object-contain object-bottom"
             priority
           />
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-between gap-6 py-4 relative">
        <div className="z-10">
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl flex items-center gap-2">
            Welcome to edUOtaga! <Sparkles className="w-8 h-8 text-neo-blue" />
          </h1>
          <p className="mt-2 text-lg font-medium text-foreground">
            What would you like to learn today?
          </p>
        </div>
        <div
          aria-hidden="true"
          className="absolute right-8 -bottom-10 z-10 w-80 h-64 pointer-events-none"
        >
          <Image 
            src="/images/boy.png" 
            alt="Student studying" 
            fill
            sizes="320px"
            className="object-contain object-bottom"
            priority
          />
        </div>
      </div>
    </>
  );
}
