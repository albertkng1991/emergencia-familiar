export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatMinutes(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}
