import type { MetadataRoute } from 'next';
import { getExperiments, getSubjects } from '@/lib/data';
import { absoluteUrl } from '@/lib/seo';

/**
 * Only indexable routes belong here. /search, /my-lab and /videos are
 * marked noindex in their page metadata, so listing them would send Google
 * mixed signals — they are deliberately omitted.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [subjects, experiments] = await Promise.all([getSubjects(), getExperiments()]);

  const lastModified = experiments.reduce<string | undefined>(
    (latest, experiment) => (!latest || experiment.updatedAt > latest ? experiment.updatedAt : latest),
    undefined,
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/subjects'), lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/experiments'), lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/help'), changeFrequency: 'monthly', priority: 0.3 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  const subjectRoutes: MetadataRoute.Sitemap = subjects.map((subject) => ({
    url: absoluteUrl(`/subjects/${subject.slug}`),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const experimentRoutes: MetadataRoute.Sitemap = experiments.map((experiment) => ({
    url: absoluteUrl(`/experiments/${experiment.slug}`),
    lastModified: experiment.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...subjectRoutes, ...experimentRoutes];
}
