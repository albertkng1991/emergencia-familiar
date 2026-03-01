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
    cycleSpeed,
    playbackSpeed,
  } = audio;

  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  if (!currentStory || playerView !== "mini") return null;

  const progress = currentStory.duration > 0 ? (currentTime / currentStory.duration) * 100 : 0;

  const totalQueueDuration = queue.reduce((sum, s) => sum + s.duration, 0);
  const hasNext = currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = Math.abs(deltaY) / Math.max(elapsed, 1);
    const threshold = velocity > 0.4 ? 15 : 30;
    if (deltaY < -threshold) {
      setPlayerView("full");
    }
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 touch-none"
      style={{
        bottom: `calc(var(--nav-height) + var(--mini-gap))`,
        width: "calc(min(100vw, 28rem) - 1.5rem)",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="bg-white rounded-2xl shadow-warm-lg overflow-hidden">
        {/* Swipe-up handle */}
        <div className="flex justify-center pt-2 pb-0.5">
          <div className="w-9 h-1 rounded-full bg-text-secondary/25" />
        </div>

        {/* Progress bar */}
        <div className="h-[2px] mx-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full w-full bg-primary origin-left rounded-full will-change-transform"
            style={{ transform: `scaleX(${Math.min(progress, 100) / 100})` }}
          />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2">
          {/* Speed control */}
          <button
            onClick={cycleSpeed}
            className="shrink-0 text-[11px] font-bold text-text-secondary tabular-nums px-1.5 py-0.5 rounded-md bg-muted min-w-[36px] text-center"
            aria-label={`Velocidad: ${playbackSpeed}x`}
          >
            {playbackSpeed}x
          </button>

          {/* Info — tap to expand */}
          <button onClick={() => setPlayerView("full")} className="flex-1 min-w-0 text-left px-1.5">
            <p className="text-sm font-semibold truncate leading-tight">{currentStory.headline}</p>
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

          {/* Play/Pause — prominent */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="size-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
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
        </div>
      </div>
    </div>
  );
}
