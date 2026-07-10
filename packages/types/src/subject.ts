import type { CategoryId } from './category';

export interface Subject {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  icon: string;
  color: string;
}

export interface SubjectWithCount extends Subject {
  experimentCount: number;
}
