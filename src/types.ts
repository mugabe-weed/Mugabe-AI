export type AnswerMode = 'balanced' | 'concise' | 'eli5' | 'steps' | 'technical';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  sources?: GroundingSource[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  mode?: AnswerMode;
  groundingMetadata?: GroundingMetadata;
  isStreaming?: boolean;
  error?: string;
  followUpSuggestions?: string[];
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  isBookmarked?: boolean;
}

export interface ModeOption {
  id: AnswerMode;
  label: string;
  description: string;
  iconName: string;
}
