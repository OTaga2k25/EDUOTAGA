import { SectionHeading } from '@eduotaga/ui/web';
import { Hero } from '@/components/home/hero';
import { CategoryGrid } from '@/components/home/category-grid';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import { listExperiments } from '@/services/experiments-service';

export default async function HomePage() {
  const experiments = await listExperiments();
  const featured = experiments.slice(0, 6);

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Disciplines"
          title="Six labs, one platform"
          description="Every experiment lives under a subject, and every subject under one of these disciplines."
        />
        <div className="mt-8">
          <CategoryGrid />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Get started"
          title="Featured experiments"
          description="Jump straight into a hands-on simulation."
        />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      </section>
    </>
  );
}
