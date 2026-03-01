import { useMemo } from "react";
import { useAudio } from "../contexts/AudioContext";
import { categoryColor } from "../lib/categories";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatMinutes(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}

/* ── Placeholder thumbnail ──────────────────────── */
function StoryThumbnail({ topic }: { topic: string }) {
  const color = categoryColor(topic);
  return (
    <div
      className="size-20 rounded-lg shrink-0 flex items-center justify-center"
      style={{ backgroundColor: `${color}15` }}
    >
      <span className="material-symbols-outlined text-[28px]" style={{ color }} aria-hidden="true">
        article
      </span>
    </div>
  );
}

export default function Escuchados() {
  const audio = useAudio();

  // Sort by listenedAt descending
  const stories = useMemo(
    () => [...audio.listened].sort((a, b) => b.listenedAt.localeCompare(a.listenedAt)),
    [audio.listened],
  );

  const totalDuration = stories.reduce((sum, s) => sum + s.duration, 0);
  const hasMiniPlayer = audio.currentStory !== null;

  return (
    <div
      style={{
        paddingBottom: hasMiniPlayer ? "var(--content-bottom-mini)" : "var(--content-bottom)",
      }}
    >
      {/* Header */}
      <header
        className="px-5 pb-6 border-b border-border"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[28px] text-primary" aria-hidden="true">
            history
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-balance">
            Escuchados
          </h1>
        </div>
        {stories.length > 0 && (
          <p className="text-text-secondary text-sm mt-1">
            {stories.length} {stories.length === 1 ? "historia" : "historias"} ·{" "}
            {formatMinutes(totalDuration)}
          </p>
        )}
      </header>
      <div className="h-0.5 brand-accent" />

      {stories.length > 0 ? (
        <>
          {/* Story list */}
          <div className="px-5">
            {stories.map((story, i) => (
              <button
                key={`${story.id}-${story.listenedAt}`}
                onClick={() => audio.play([story], 0)}
                className={`flex gap-4 py-4 w-full text-left ${
                  i < stories.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <StoryThumbnail topic={story.topic} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: categoryColor(story.topic) }}
                  >
                    {story.topic}
                  </p>
                  <h3 className="font-display font-bold text-sm leading-snug mt-1 text-balance line-clamp-2">
                    {story.headline}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-text-secondary">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      play_circle
                    </span>
                    <span className="text-xs tabular-nums">{formatDuration(story.duration)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="px-5 pt-4 space-y-3">
            <button
              onClick={() => audio.play(stories)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-primary text-white font-medium text-sm shadow-warm-lg"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                play_arrow
              </span>
              Reproducir Todo · {formatMinutes(totalDuration)}
            </button>
            <button
              onClick={audio.clearListened}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-medium hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                delete_outline
              </span>
              Limpiar historial
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <span
            className="material-symbols-outlined text-[48px] text-border-strong mb-3 block"
            aria-hidden="true"
          >
            headphones
          </span>
          <p className="text-text-secondary text-sm text-balance">No has escuchado nada aún</p>
          <p className="text-text-secondary/60 text-xs text-pretty mt-1">
            Las noticias que escuches aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
}
