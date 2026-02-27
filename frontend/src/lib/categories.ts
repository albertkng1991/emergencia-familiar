/* ── Shared category metadata ─────────────────── */

export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Tecnología: { icon: "devices", color: "#d32222" },
  Política: { icon: "gavel", color: "#1a73e8" },
  Economía: { icon: "trending_up", color: "#0d9488" },
  Deportes: { icon: "sports_soccer", color: "#ea580c" },
  Ciencia: { icon: "science", color: "#7c3aed" },
  Salud: { icon: "health_and_safety", color: "#16a34a" },
  Cultura: { icon: "palette", color: "#db2777" },
  Internacional: { icon: "public", color: "#2563eb" },
  IA: { icon: "smart_toy", color: "#d32222" },
};

export function getCategoryMeta(topic: string) {
  return CATEGORY_META[topic] ?? { icon: "newspaper", color: "#d32222" };
}

export function categoryColor(topic: string): string {
  return CATEGORY_META[topic]?.color ?? "#d32222";
}
