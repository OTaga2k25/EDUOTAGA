import { SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';
import type { ExperimentDetail, Subject } from '@eduotaga/types';

/**
 * Single source of truth for the canonical production origin. Every
 * canonical URL, sitemap entry, robots directive, and JSON-LD `@id`
 * derives from this — keep it in sync with the domain verified in
 * Google Search Console and in the Android App Links assetlinks.json.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edu.otaga.in').replace(/\/$/, '');

export const SITE_TITLE = `${SITE_NAME} - Open Virtual Laboratory`;

/** Turns a root-relative path into an absolute, canonical URL. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Canonical `alternates` block for a page. Pointing every page at its own
 * clean URL stops query strings (?q=, ?ref=, utm_*) from being indexed as
 * separate duplicate pages.
 */
export function canonical(path: string) {
  return { alternates: { canonical: absoluteUrl(path) } };
}

/** The publisher entity every other JSON-LD node points back at. */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/logo-light.png'),
    },
  };
}

/**
 * Site-level node with a SearchAction, which is what lets Google surface a
 * sitelinks search box wired to /search?q=.
 */
export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Breadcrumb trail. Feeds the breadcrumb line shown under a search result. */
export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Longest a <title> can get before Google truncates it in results.
 * Includes the " · EDUOTAGA" suffix the root layout's title template appends.
 */
const TITLE_BUDGET = 65;
const BRAND_SUFFIX_LENGTH = ` · ${SITE_NAME}`.length;

/**
 * Appends a keyword qualifier to a page title, but only when it actually
 * earns its place: skipped if the title already carries those words, or if
 * the result would be truncated in the SERP anyway. Blindly concatenating
 * "- Virtual {Subject} Experiment" produces titles like "Bending Light:
 * Reflection & Refraction - Virtual Light — Reflection & Refraction
 * Experiment", which is both duplicated and cut off.
 */
export function composeTitle(base: string, qualifier: string): string {
  const haystack = base.toLowerCase();
  const alreadyCovered = qualifier
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3)
    .every((word) => haystack.includes(word));

  if (alreadyCovered) return base;

  const combined = `${base} - ${qualifier}`;
  return combined.length + BRAND_SUFFIX_LENGTH <= TITLE_BUDGET ? combined : base;
}

/**
 * Picks the most specific qualifier that still fits: the subject name is the
 * strongest keyword, with a generic fallback when it's too long.
 */
export function experimentTitle(title: string, subjectName: string): string {
  const withSubject = composeTitle(title, `Virtual ${subjectName} Experiment`);
  if (withSubject !== title) return withSubject;

  return composeTitle(title, 'Virtual Lab Experiment') === title
    ? composeTitle(title, 'Virtual Lab')
    : composeTitle(title, 'Virtual Lab Experiment');
}

const DIFFICULTY_LEVEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;

/**
 * An experiment is modelled as a LearningResource — the vocabulary Google
 * uses for educational material. `Course` is deliberately avoided: it
 * requires provider/offers data we don't have, and an incomplete Course
 * node is worse than an accurate LearningResource one.
 */
export function experimentSchema(experiment: ExperimentDetail) {
  const url = absoluteUrl(`/experiments/${experiment.slug}`);

  return {
    '@type': 'LearningResource',
    '@id': `${url}#resource`,
    url,
    name: experiment.title,
    description: experiment.summary,
    learningResourceType: 'Virtual laboratory simulation',
    educationalLevel: DIFFICULTY_LEVEL[experiment.difficulty],
    educationalUse: 'Laboratory experiment',
    about: { '@type': 'Thing', name: experiment.subject.name },
    inLanguage: 'en',
    isAccessibleForFree: true,
    keywords: experiment.tags.join(', '),
    dateCreated: experiment.createdAt,
    dateModified: experiment.updatedAt,
    provider: { '@id': `${SITE_URL}/#organization` },
    ...(experiment.estimatedDurationMinutes
      ? { timeRequired: `PT${experiment.estimatedDurationMinutes}M` }
      : {}),
    ...(experiment.videos.length
      ? {
          video: experiment.videos.map((video) => ({
            '@type': 'VideoObject',
            name: video.title,
            description: video.description ?? experiment.summary,
            embedUrl: video.url,
            uploadDate: experiment.createdAt,
            ...(video.thumbnailUrl ? { thumbnailUrl: video.thumbnailUrl } : {}),
            ...(video.durationSeconds
              ? { duration: `PT${video.durationSeconds}S` }
              : {}),
          })),
        }
      : {}),
  };
}

/** A subject page is a collection — expose its experiments as an ItemList. */
export function subjectSchema(subject: Subject, experiments: Array<{ slug: string; title: string }>) {
  const url = absoluteUrl(`/subjects/${subject.slug}`);

  return {
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: subject.name,
    description: subject.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: experiments.length,
      itemListElement: experiments.map((experiment, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/experiments/${experiment.slug}`),
        name: experiment.title,
      })),
    },
  };
}
