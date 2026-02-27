export interface Story {
  id: number;
  pack_id: number;
  position: number;
  headline: string;
  summary: string;
  source_urls: string[];
  script: string;
  audio_filename: string;
  audio_url: string | null;
  duration: number;
}

export interface Pack {
  id: number;
  topic: string;
  date: string;
  status: "generating" | "ready" | "error";
  total_duration: number;
  created_at: string;
  story_count: number;
  stories?: Story[];
}
