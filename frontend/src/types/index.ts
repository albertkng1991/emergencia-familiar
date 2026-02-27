export interface Story {
  id: number;
  pack_id: number;
  position: number;
  headline: string;
  summary: string;
  source_urls: string[];
  source_count: number;
  script: string;
  audio_filename: string;
  audio_url: string | null;
  duration: number;
}

export interface Pack {
  id: number;
  topic: string;
  date: string;
  pack_type: "daily" | "weekly";
  status: "generating" | "ready" | "error";
  total_duration: number;
  created_at: string;
  story_count: number;
  stories?: Story[];
}

export interface Topic {
  name: string;
  count: number;
}

export interface DateInfo {
  date: string;
  count: number;
}

export interface TrendingTopic {
  topic: string;
  pack_count: number;
  story_count: number;
  latest_pack: Pack;
}

export interface ApiKeyConfig {
  env_var: string;
  label: string;
  required: boolean;
  secret: boolean;
  url: string | null;
  placeholder?: string;
  has_value?: boolean;
  value?: string;
}

export interface ApiKeyGroup {
  id: string;
  label: string;
  keys: ApiKeyConfig[];
}

export interface ApiKeysConfig {
  groups: ApiKeyGroup[];
}

export interface KeyTestResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

export type StoryWithTopic = Story & { topic: string };

export type SearchResult = Story & { topic: string; date: string };
