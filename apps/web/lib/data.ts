import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import type { Category, Experiment, Subject, Video } from '@eduotaga/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXPERIMENTS_PUBLIC_DIR = path.join(process.cwd(), 'public', 'experiments');

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Thin, cached readers over the JSON content files. This is the only
 * layer that touches the filesystem — swap it for a database client
 * later without changing any service, route, or page.
 */
export const getCategories = cache(async (): Promise<Category[]> => readJson<Category[]>('categories.json'));

export const getSubjects = cache(async (): Promise<Subject[]> => readJson<Subject[]>('subjects.json'));

export const getExperiments = cache(async (): Promise<Experiment[]> =>
  readJson<Experiment[]>('experiments.json'),
);

export const getVideos = cache(async (): Promise<Video[]> => readJson<Video[]>('videos.json'));

export async function findSubjectBySlug(slug: string): Promise<Subject | undefined> {
  const subjects = await getSubjects();
  return subjects.find((subject) => subject.slug === slug);
}

export async function findExperimentBySlug(slug: string): Promise<Experiment | undefined> {
  const experiments = await getExperiments();
  return experiments.find((experiment) => experiment.slug === slug);
}

export async function findVideosByExperimentId(experimentId: string): Promise<Video[]> {
  const videos = await getVideos();
  return videos.filter((video) => video.experimentId === experimentId);
}

/** True if the experiment's simulation folder + entry file actually exist on disk. */
export function simulationExists(categoryId: string, slug: string, entry: string): boolean {
  return existsSync(path.join(EXPERIMENTS_PUBLIC_DIR, categoryId, slug, entry));
}
