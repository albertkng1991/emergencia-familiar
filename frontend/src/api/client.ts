import type {
  ApiKeysConfig,
  DateInfo,
  KeyTestResult,
  Pack,
  SearchResult,
  Topic,
  TrendingTopic,
} from "../types";

type PackType = "daily" | "weekly";

export async function fetchPacks(opts?: {
  topic?: string;
  date?: string;
  type?: PackType;
}): Promise<Pack[]> {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.topic) params.set("topic", opts.topic);
  if (opts?.date) params.set("date", opts.date);
  const qs = params.toString();
  const url = qs ? `/api/packs?${qs}` : "/api/packs";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch packs");
  const data = await res.json();
  return data.packs;
}

export async function fetchDates(type: PackType = "daily"): Promise<DateInfo[]> {
  const res = await fetch(`/api/packs/dates?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch dates");
  const data = await res.json();
  return data.dates;
}

export async function fetchTrending(): Promise<TrendingTopic[]> {
  const res = await fetch("/api/packs/trending");
  if (!res.ok) throw new Error("Failed to fetch trending");
  const data = await res.json();
  return data.trending;
}

export async function fetchTopics(type: PackType = "daily"): Promise<Topic[]> {
  const res = await fetch(`/api/topics?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch topics");
  const data = await res.json();
  return data.topics;
}

export async function searchStories(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/stories/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search stories");
  const data = await res.json();
  return data.stories;
}

export async function fetchPack(id: number): Promise<Pack> {
  const res = await fetch(`/api/packs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch pack");
  return res.json();
}

export async function generatePack(topic: string = "IA", count: number = 5): Promise<Pack> {
  const res = await fetch("/api/packs/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function fetchApiKeys(): Promise<ApiKeysConfig> {
  const res = await fetch("/api/keys");
  if (!res.ok) throw new Error("Failed to fetch API keys");
  return res.json();
}

export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error("Failed to save API keys");
}

export async function testApiKeys(key?: string): Promise<Record<string, KeyTestResult>> {
  const res = await fetch("/api/keys/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(key ? { key } : {}),
  });
  if (!res.ok) throw new Error("Failed to test API keys");
  return res.json();
}
