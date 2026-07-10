import type { Category, CategoryId } from '@eduotaga/types';

/**
 * Canonical metadata for the six lab disciplines. The `id` of every
 * entry must match a folder name under `apps/web/public/experiments/`.
 */
export const CATEGORIES: Record<CategoryId, Category> = {
  physics: {
    id: 'physics',
    name: 'Physics',
    description: 'Mechanics, optics, electricity, and waves.',
    icon: 'atom',
    color: 'blue',
  },
  chemistry: {
    id: 'chemistry',
    name: 'Chemistry',
    description: 'Reactions, titrations, and molecular structure.',
    icon: 'flask-conical',
    color: 'emerald',
  },
  biology: {
    id: 'biology',
    name: 'Biology',
    description: 'Cells, physiology, and ecosystems.',
    icon: 'leaf',
    color: 'green',
  },
  electronics: {
    id: 'electronics',
    name: 'Electronics',
    description: 'Circuits, semiconductors, and digital logic.',
    icon: 'circuit-board',
    color: 'amber',
  },
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical',
    description: 'Forces, machines, and material properties.',
    icon: 'cog',
    color: 'slate',
  },
  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Geometry, calculus, and statistics visualized.',
    icon: 'sigma',
    color: 'violet',
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export const CATEGORY_LIST: Category[] = Object.values(CATEGORIES);
