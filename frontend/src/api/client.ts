import type { Pack } from "../types";

export async function fetchPacks(): Promise<Pack[]> {
  const res = await fetch("/api/packs");
  if (!res.ok) throw new Error("Failed to fetch packs");
  const data = await res.json();
  return data.packs;
}

export async function fetchPack(id: number): Promise<Pack> {
  const res = await fetch(`/api/packs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch pack");
  return res.json();
}

export async function generatePack(
  topic: string = "IA",
  count: number = 5
): Promise<Pack> {
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
