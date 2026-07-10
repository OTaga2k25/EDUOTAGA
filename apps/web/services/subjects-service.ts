import type { SubjectWithCount } from '@eduotaga/types';
import { getExperiments, getSubjects } from '@/lib/data';

export interface ListSubjectsFilters {
  categoryId?: string;
}

export async function listSubjects(filters: ListSubjectsFilters = {}): Promise<SubjectWithCount[]> {
  const [subjects, experiments] = await Promise.all([getSubjects(), getExperiments()]);

  return subjects
    .filter((subject) => !filters.categoryId || subject.categoryId === filters.categoryId)
    .map((subject) => ({
      ...subject,
      experimentCount: experiments.filter((experiment) => experiment.subjectId === subject.id).length,
    }));
}

export async function getSubjectBySlug(slug: string): Promise<SubjectWithCount | null> {
  const subjects = await listSubjects();
  return subjects.find((subject) => subject.slug === slug) ?? null;
}
