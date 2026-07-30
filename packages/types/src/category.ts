/** The six top-level lab disciplines. Kept as a literal union so folder
 * names under `public/experiments/<categoryId>/` stay in sync with data. */
export type CategoryId =
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'electronics'
  | 'mechanical'
  | 'mathematics'
  | 'marine'
  | 'computer';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
  color: string;
}
