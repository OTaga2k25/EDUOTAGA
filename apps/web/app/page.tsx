import {
  LEARNING_PATH_STEPS,
  MOCK_CONTINUE_LEARNING,
  MOCK_DASHBOARD_STATS,
} from '@eduotaga/constants';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { LearningPath } from '@/components/dashboard/learning-path';
import { ContinueLearningCard } from '@/components/dashboard/continue-learning-card';
import { PopularExperiments } from '@/components/dashboard/popular-experiments';
import { RecommendedList } from '@/components/dashboard/recommended-list';
import { HowItWorksBanner } from '@/components/dashboard/how-it-works-banner';
import { SubjectsGrid } from '@/components/dashboard/subjects-grid';
import { SearchBar } from '@/components/search/search-bar';
import { listExperiments } from '@/services/experiments-service';
import Link from 'next/link';
import { Suspense } from 'react';

export default async function HomePage() {
  const experiments = await listExperiments();
  const continueExperiment =
    experiments.find((experiment) => experiment.slug === MOCK_CONTINUE_LEARNING.experimentSlug) ??
    experiments[0];
  const popular = experiments.slice(0, 4);
  const recommended = experiments.slice(0, 3);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
      <WelcomeBanner />

      <div className="sm:hidden -mt-2">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="hidden sm:block">
        <SubjectsGrid />
      </div>
      <div className="hidden sm:block">
        <LearningPath steps={LEARNING_PATH_STEPS} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {continueExperiment && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end sm:hidden px-1">
                <h2 className="font-black text-[18px] text-foreground tracking-tight">Continue Learning</h2>
                <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline mb-0.5">
                  View all
                </Link>
              </div>
              <ContinueLearningCard
                experiment={continueExperiment}
                progressPercent={MOCK_CONTINUE_LEARNING.progressPercent}
              />
            </div>
          )}

          <div className="sm:hidden">
            <SubjectsGrid />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end sm:hidden px-1 mt-2">
              <h2 className="font-black text-[18px] text-foreground tracking-tight">Popular Experiments</h2>
              <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline mb-0.5">
                View all
              </Link>
            </div>
            <PopularExperiments experiments={popular} />
          </div>
        </div>

        <div className="hidden lg:block">
          <RecommendedList experiments={recommended} />
        </div>
      </div>

      <div className="hidden sm:block">
        <HowItWorksBanner />
      </div>
    </div>
  );
}
