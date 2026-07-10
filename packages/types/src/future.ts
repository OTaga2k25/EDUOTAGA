/**
 * Forward-looking contracts for features described in the roadmap
 * (see docs/architecture.md § Future Ready). Nothing implements these
 * yet — they exist so the data shape is agreed on before the feature
 * is built, avoiding breaking changes later.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'student' | 'educator' | 'admin';
  createdAt: string;
}

export interface ExperimentProgress {
  userId: string;
  experimentId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  quizScore?: number;
  completedAt?: string;
}

export interface Bookmark {
  userId: string;
  experimentId: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  subjectId: string;
  issuedAt: string;
  fileUrl: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  rank: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
