
export const WORKFLOW_STEPS = [
    'Setup',
    'Topic Ideation',
    'Research & Outline',
    'Drafting',
    'Publish',
] as const;

export type WorkflowStep = typeof WORKFLOW_STEPS[number];

export interface RankedKeyword {
    keyword: string;
    competition: number;
    competition_level: string;
    cpc: number;
    search_volume: number;
    difficulty: number;
    intent: string;
}

export interface InternalLink {
    title: string;
    url: string;
}

// Data passed between steps
export interface AppState {
    websiteUrl: string;
    country: string;
    language: string;
    topic: string;
    outline: string[];
    draft: string;
    imageUrl: string;
    internalLinks: InternalLink[];
}

// API result types
export interface TopicIdea {
    title: string;
    description: string;
}

export interface CompetitorInfo {
    title:string;
    summary: string;
    url: string; 
}

export interface EeatSource {
    title: string;
    url: string;
    summary: string;
}

export interface ResearchResult {
    keywords: string[];
    competitors: Omit<CompetitorInfo, 'url'>[];
    outline?: string[] | string; // Make outline optional for two-step generation
}