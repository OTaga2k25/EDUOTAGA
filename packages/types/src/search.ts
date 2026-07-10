export type SearchResultType = 'experiment' | 'subject' | 'video';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  slug: string;
  title: string;
  description: string;
  url: string;
  subjectName?: string;
}
