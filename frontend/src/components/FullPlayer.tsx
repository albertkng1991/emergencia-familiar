import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";
import { categoryColor, getCategoryMeta } from "../lib/categories";
import { formatDuration, formatMinutes } from "../lib/format";

export default function FullPlayer() {
  const audio = useAudio();
  const queueCtx = useQueue();
  const {
    queue,
    currentIndex,
    currentTime,
    isPlaying,
    playerView,
    setPlayerView,
    currentStory,
    togglePlay,
    skip,
    nextStory,
    prevStory,
    cycleSpeed,
    playbackSpeed,
    play,
    seekTo,
  } = audio;

  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  useEffect(() => {
    setDragOffsetY(0);
    setIsDragging(false);
  }, [playerView]);

  const onDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onDragMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      dragCurrentY.current = e.touches[0].clientY;
      setDragOffsetY(dragCurrentY.current - dragStartY.current);
    },
    [isDragging],
  );

  const onDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = dragCurrentY.current - dragStartY.current;

    if (playerView === "half") {
      if (delta < -50) setPlayerView("full");
      else if (delta > 50) setPlayerView("mini");
    } else if (playerView === "full") {
      if (delta > 80) setPlayerView("half");
    }

    setDragOffsetY(0);
  }, [isDragging, playerView, setPlayerView]);

  // Close on Escape key
  useEffect(() => {
    if (playerView === "mini") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayerView("mini");
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [playerView, setPlayerView]);

  if (playerView === "mini") return null;
  // Half requires something playing; full can show just the queue
  if (playerView === "half" && !currentStory) return null;

  const isFull = playerView === "full";
  const meta = currentStory ? getCategoryMeta(currentStory.topic) : null;
  const color = meta?.color ?? "#d32222";
  const hasNext = currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;
  const totalQueueDuration = queue.reduce((sum, s) => sum + s.duration, 0);
  const bagItems = queueCtx.bag;

  // bottom-nav is h-14 = 3.5rem
  const navHeight = "3.5rem";

  const sheetStyle: React.CSSProperties = {
    top: 0,
    bottom: navHeight,
    transform: isDragging
      ? `translateY(calc(${isFull ? "0dvh" : "45dvh"} + ${dragOffsetY}px))`
      : `translateY(${isFull ? "0dvh" : "45dvh"})`,
    transition: isDragging ? "none" : "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-colors duration-300"
        style={{
          bottom: navHeight,
          backgroundColor: isFull ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)",
        }}
        onClick={() => setPlayerView("mini")}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentStory ? `Reproductor: ${currentStory.headline}` : "Cola de reproducción"}
        className="fixed inset-x-0 mx-auto w-full max-w-md z-40 bg-white rounded-t-2xl flex flex-col"
        style={sheetStyle}
      >
        {/* Drag handle */}
        <div
          className="pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border-strong mx-auto" />
        </div>

        {/* ── HALF: player controls only, no scroll ── */}
        {!isFull && currentStory && meta && (
          <div className="flex-1 flex flex-col px-6 pb-4 overflow-hidden">
            {/* Cover art — compact */}
            <div
              className="aspect-square rounded-2xl mx-auto w-full max-w-[180px] flex flex-col items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color}18, ${color}30)`,
                border: `1px solid ${color}20`,
              }}
            >
              <span
                className="material-symbols-outlined text-[56px] mb-1"
                style={{ color, fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                {currentStory.topic}
              </span>
            </div>

            {/* Title */}
            <div className="mt-3 text-center shrink-0">
              <h2 className="font-display font-bold text-sm leading-snug text-balance line-clamp-2">
                {currentStory.headline}
              </h2>
              {queue.length > 1 && (
                <p className="text-[10px] text-text-secondary mt-1 tabular-nums">
                  {currentIndex + 1} de {queue.length} · {formatMinutes(totalQueueDuration)}
                </p>
              )}
            </div>

            {/* Seek bar */}
            <div className="mt-3 shrink-0">
              <input
                type="range"
                min={0}
                max={currentStory.duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full h-1"
                aria-label="Progreso de reproducción"
              />
              <div className="flex justify-between mt-0.5 text-[10px] text-text-secondary tabular-nums">
                <span>{formatDuration(currentTime)}</span>
                <span>-{formatDuration(Math.max(0, currentStory.duration - currentTime))}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-2 shrink-0">
              <button
                onClick={cycleSpeed}
                className="text-xs font-bold text-text-secondary tabular-nums px-2 py-1 rounded-md min-w-[40px]"
                aria-label={`Velocidad: ${playbackSpeed}x`}
              >
                {playbackSpeed}x
              </button>
              <button
                onClick={prevStory}
                disabled={!hasPrev}
                className="p-1.5 disabled:opacity-20"
                aria-label="Anterior"
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  skip_previous
                </span>
              </button>
              <button
                onClick={() => skip(-10)}
                className="p-1.5"
                aria-label="Retroceder 10 segundos"
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  replay_10
                </span>
              </button>
              <button
                onClick={togglePlay}
                className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-warm-lg"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button onClick={() => skip(10)} className="p-1.5" aria-label="Avanzar 10 segundos">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  forward_10
                </span>
              </button>
              <button
                onClick={nextStory}
                disabled={!hasNext}
                className="p-1.5 disabled:opacity-20"
                aria-label="Siguiente"
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  skip_next
                </span>
              </button>
            </div>

            {/* Next up preview */}
            {hasNext &&
              (() => {
                const next = queue[currentIndex + 1];
                const nextColor = categoryColor(next.topic);
                return (
                  <button
                    onClick={nextStory}
                    aria-label={`Siguiente: ${next.headline}`}
                    className="flex items-center gap-3 mt-3 pt-3 border-t border-border shrink-0 w-full text-left"
                  >
                    <div
                      className="size-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: `${nextColor}15` }}
                    >
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ color: nextColor }}
                        aria-hidden="true"
                      >
                        skip_next
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold">
                        Siguiente
                      </p>
                      <p className="text-xs leading-snug truncate">{next.headline}</p>
                    </div>
                    <span className="text-[10px] text-text-secondary tabular-nums shrink-0">
                      {formatDuration(next.duration)}
                    </span>
                  </button>
                );
              })()}
          </div>
        )}

        {/* ── FULL: player (if playing) + queue list, scrollable ── */}
        {isFull && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Compact player — only if something is playing */}
            {currentStory && meta && (
              <div className="px-6 pt-1 pb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="size-16 rounded-xl shrink-0 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${color}18, ${color}30)`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[28px]"
                      style={{ color, fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color }}
                    >
                      {currentStory.topic}
                    </p>
                    <h2 className="font-display font-bold text-sm leading-snug line-clamp-2">
                      {currentStory.headline}
                    </h2>
                  </div>
                </div>

                {/* Seek bar */}
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={currentStory.duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full h-1"
                    aria-label="Progreso de reproducción"
                  />
                  <div className="flex justify-between mt-0.5 text-[10px] text-text-secondary tabular-nums">
                    <span>{formatDuration(currentTime)}</span>
                    <span>-{formatDuration(Math.max(0, currentStory.duration - currentTime))}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button
                    onClick={cycleSpeed}
                    className="text-xs font-bold text-text-secondary tabular-nums px-2 py-1 rounded-md min-w-[40px]"
                    aria-label={`Velocidad: ${playbackSpeed}x`}
                  >
                    {playbackSpeed}x
                  </button>
                  <button
                    onClick={prevStory}
                    disabled={!hasPrev}
                    className="p-1.5 disabled:opacity-20"
                    aria-label="Anterior"
                  >
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      skip_previous
                    </span>
                  </button>
                  <button
                    onClick={() => skip(-10)}
                    className="p-1.5"
                    aria-label="Retroceder 10 segundos"
                  >
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      replay_10
                    </span>
                  </button>
                  <button
                    onClick={togglePlay}
                    className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-warm-lg"
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                  >
                    <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="p-1.5"
                    aria-label="Avanzar 10 segundos"
                  >
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      forward_10
                    </span>
                  </button>
                  <button
                    onClick={nextStory}
                    disabled={!hasNext}
                    className="p-1.5 disabled:opacity-20"
                    aria-label="Siguiente"
                  >
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      skip_next
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Queue list — always visible in full, uses bag */}
            <div className={currentStory ? "border-t border-border" : ""}>
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[20px] text-primary"
                  aria-hidden="true"
                >
                  queue_music
                </span>
                <h3 className="font-display font-bold text-sm">Cola de Reproducción</h3>
              </div>

              {bagItems.length > 0 ? (
                <>
                  <div className="px-5 pb-1">
                    <span className="text-xs text-text-secondary tabular-nums">
                      {bagItems.length} {bagItems.length === 1 ? "historia" : "historias"} ·{" "}
                      {formatMinutes(queueCtx.totalDuration)}
                    </span>
                  </div>
                  <div className="px-5 pb-4">
                    {bagItems.map((story, i) => {
                      const storyColor = categoryColor(story.topic);
                      const playingIndex = queue.findIndex((s) => s.id === story.id);
                      const isCurrent = playingIndex === currentIndex && currentStory !== null;
                      return (
                        <div
                          key={story.id}
                          className={`flex items-center gap-3 py-2.5 ${
                            i < bagItems.length - 1 ? "border-b border-border" : ""
                          } ${isCurrent ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}
                        >
                          <button
                            onClick={() => {
                              play(queueCtx.bag, i);
                            }}
                            className="flex-1 flex items-center gap-3 min-w-0 text-left"
                            aria-label={`Reproducir: ${story.headline}`}
                          >
                            <div
                              className="size-10 rounded-lg shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: `${storyColor}15` }}
                            >
                              {isCurrent && isPlaying ? (
                                <div className="flex items-end gap-[2px] h-4" aria-hidden="true">
                                  <span className="w-[3px] bg-primary rounded-full animate-eq-1" />
                                  <span className="w-[3px] bg-primary rounded-full animate-eq-2" />
                                  <span className="w-[3px] bg-primary rounded-full animate-eq-3" />
                                </div>
                              ) : (
                                <span
                                  className="material-symbols-outlined text-[18px]"
                                  style={{ color: storyColor }}
                                  aria-hidden="true"
                                >
                                  {isCurrent ? "pause" : "play_arrow"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`text-sm leading-snug line-clamp-1 ${
                                  isCurrent ? "font-bold" : ""
                                }`}
                              >
                                {story.headline}
                              </h4>
                              <span className="text-[10px] text-text-secondary tabular-nums">
                                {formatDuration(story.duration)}
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => queueCtx.removeFromBag(story.id)}
                            className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                            aria-label={`Quitar "${story.headline}"`}
                          >
                            <span
                              className="material-symbols-outlined text-[18px] text-text-secondary"
                              aria-hidden="true"
                            >
                              close
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 pb-8">
                    <button onClick={queueCtx.clearBag} className="btn-block-ghost text-sm">
                      Vaciar cola
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 px-5">
                  <span
                    className="material-symbols-outlined text-[48px] text-border-strong mb-3 block"
                    aria-hidden="true"
                  >
                    queue_music
                  </span>
                  <p className="text-text-secondary text-sm">Tu cola está vacía</p>
                  <p className="text-text-secondary/60 text-xs mt-1.5 text-pretty">
                    Toca o desliza una noticia en Hoy para añadirla
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
