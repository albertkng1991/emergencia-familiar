import { useRef } from "react";
import { useAudio } from "../contexts/AudioContext";
import { formatMinutes } from "../lib/format";

export default function MiniPlayer() {
  const audio = useAudio();
  const {
    currentStory,
    isPlaying,
    togglePlay,
    setPlayerView,
    playerView,
    currentTime,
    queue,
    currentIndex,
    nextStory,
    prevStory,
  } = audio;

  const dragStartY = useRef(0);

  if (!currentStory || playerView !== "mini") return null;

  const progress = currentStory.duration > 0 ? (currentTime / currentStory.duration) * 100 : 0;

  const totalQueueDuration = queue.reduce((sum, s) => sum + s.duration, 0);
  const hasNext = currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    if (deltaY < -30) {
      setPlayerView("half");
    }
  };

  return (
    <div
      className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md z-40"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="bg-white border-t border-border shadow-warm-md">
        {/* Progress bar */}
        <div className="h-[2px] bg-muted">
          <div
            className="h-full w-full bg-primary origin-left transition-transform duration-300"
            style={{ transform: `scaleX(${Math.min(progress, 100) / 100})` }}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2">
          {/* Info — tap to expand */}
          <button onClick={() => setPlayerView("half")} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{currentStory.headline}</p>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                {currentStory.topic}
              </span>
              {queue.length > 1 && (
                <span className="text-[10px] text-text-secondary tabular-nums">
                  · {currentIndex + 1}/{queue.length} · {formatMinutes(totalQueueDuration)}
                </span>
              )}
            </div>
          </button>

          {/* Prev */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
            disabled={!hasPrev}
            className="p-1 shrink-0 disabled:opacity-20"
            aria-label="Anterior"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              skip_previous
            </span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-1 shrink-0"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>

          {/* Next */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
            disabled={!hasNext}
            className="p-1 shrink-0 disabled:opacity-20"
            aria-label="Siguiente"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              skip_next
            </span>
          </button>

          {/* Expand */}
          <button
            onClick={() => setPlayerView("half")}
            className="p-1 shrink-0"
            aria-label="Expandir reproductor"
          >
            <span
              className="material-symbols-outlined text-[20px] text-text-secondary"
              aria-hidden="true"
            >
              expand_less
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
