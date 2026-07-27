import type { Metadata } from 'next';
import { getExperiments } from '@/lib/data';
import { MyLabClient } from './my-lab-client';

export const metadata: Metadata = {
  title: 'My Lab | edUOtaga',
  description: 'Your saved experiments and simulations.',
};

export default async function MyLabPage() {
  const allExperiments = await getExperiments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
          My Lab
        </h1>
        <p className="mt-2 text-lg text-muted">
          Your personal collection of saved experiments.
        </p>
      </div>
      
      <MyLabClient allExperiments={allExperiments} />
    </div>
  );
}
