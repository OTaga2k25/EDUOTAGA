import type { MetadataRoute } from 'next';
import { getExperiments, getSubjects } from '@/lib/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [subjects, experiments] = await Promise.all([getSubjects(), getExperiments()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/subjects`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/experiments`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const subjectRoutes: MetadataRoute.Sitemap = subjects.map((subject) => ({
    url: `${siteUrl}/subjects/${subject.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const experimentRoutes: MetadataRoute.Sitemap = experiments.map((experiment) => ({
    url: `${siteUrl}/experiments/${experiment.slug}`,
    lastModified: experiment.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...subjectRoutes, ...experimentRoutes];
}
