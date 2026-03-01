import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";
import { categoryColor, getCategoryMeta } from "../lib/categories";
import { formatDuration, formatMinutes } from "../lib/format";
import { hapticImpact } from "../lib/haptics";
import type { StoryWithTopic } from "../types";
import DurationMenu from "./DurationMenu";
import PremiumModal from "./PremiumModal";

/* ── Queue item with long-press support ── */
function QueueItem({
  story,
  isLast,
  isCurrent,
  isPlaying,
  onPlay,
  onRemove,
}: {
  story: StoryWithTopic;
  isLast: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const storyColor = categoryColor(story.topic);
  const [showMenu, setShowMenu] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (showMenu) return;
      firedRef.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        hapticImpact();
        setShowMenu(true);
      }, 500);
    },
    [showMenu],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 10 || dy > 10) clearTimer();
    },
    [clearTimer],
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(() => {
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    onPlay();
  }, [onPlay]);

  return (
    <div
      className={`relative flex items-center gap-3 py-2.5 ${
        !isLast ? "border-b border-border" : ""
      } ${isCurrent ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}
    >
      <button
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
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
          <h4 className={`text-sm leading-snug line-clamp-1 ${isCurrent ? "font-bold" : ""}`}>
            {story.headline}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                timer
              </span>
              <span className="text-[10px] font-semibold tabular-nums">2 min</span>
            </span>
            <span className="text-[10px] text-text-secondary tabular-nums">
              {formatDuration(story.duration)}
            </span>
          </div>
        </div>
      </button>
      <button
        onClick={onRemove}
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

      {showMenu && (
        <DurationMenu
          onSelect2min={() => {
            setShowMenu(false);
            onPlay();
          }}
          onSelectPremium={() => {
            setShowMenu(false);
            setShowPremium(true);
          }}
          onClose={() => setShowMenu(false)}
        />
      )}
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}

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
  const dragStartX = useRef(0);
  const dragCurrentY = useRef(0);
  const dragStartTime = useRef(0);
  const gesturePhase = useRef<"idle" | "pending" | "dragging">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Seek bar: track dragging to prevent jitter
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const displayTime = isSeeking ? seekTime : currentTime;

  useEffect(() => {
    setDragOffsetY(0);
    setIsDragging(false);
    gesturePhase.current = "idle";
  }, [playerView]);

  // Lock #app-scroll when sheet is open (Capacitor has scrollEnabled:false)
  useEffect(() => {
    if (playerView === "mini") return;
    const scrollEl = document.getElementById("app-scroll");
    if (!scrollEl) return;
    scrollEl.style.overflow = "hidden";
    return () => {
      scrollEl.style.overflow = "";
    };
  }, [playerView]);

  const onDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartX.current = e.touches[0].clientX;
    dragCurrentY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    gesturePhase.current = "pending";
  }, []);

  const onDragMove = useCallback((e: React.TouchEvent) => {
    if (gesturePhase.current === "idle") return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    dragCurrentY.current = currentY;

    if (gesturePhase.current === "pending") {
      const dy = Math.abs(currentY - dragStartY.current);
      const dx = Math.abs(currentX - dragStartX.current);
      if (dy < 8 && dx < 8) return; // dead zone
      if (dx > dy) {
        gesturePhase.current = "idle";
        return; // horizontal — not a sheet gesture
      }
      gesturePhase.current = "dragging";
      setIsDragging(true);
    }

    if (gesturePhase.current === "dragging") {
      e.preventDefault();
      const raw = currentY - dragStartY.current;
      if (raw < 0) {
        setDragOffsetY(raw * 0.15); // rubber-band up
      } else {
        setDragOffsetY(raw);
      }
    }
  }, []);

  const onDragEnd = useCallback(() => {
    if (gesturePhase.current !== "dragging") {
      gesturePhase.current = "idle";
      return;
    }
    gesturePhase.current = "idle";
    setIsDragging(false);
    const delta = dragCurrentY.current - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = Math.abs(delta) / Math.max(elapsed, 1);
    const isFlick = velocity > 0.4;

    // Swipe down → dismiss to mini
    if (delta > (isFlick ? 30 : 80)) {
      setPlayerView("mini");
    }

    setDragOffsetY(0);
  }, [setPlayerView]);

  // Overscroll-to-dismiss: pull down from scroll top
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || playerView !== "full") return;

    let startY = 0;
    let scrollTopAtStart = 0;
    let phase: "idle" | "pending" | "dragging" = "idle";

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      scrollTopAtStart = el.scrollTop;
      phase = "pending";
    };

    const onMove = (e: TouchEvent) => {
      if (phase === "idle") return;
      const delta = e.touches[0].clientY - startY;

      if (phase === "pending") {
        if (Math.abs(delta) < 10) return;
        if (scrollTopAtStart <= 0 && delta > 0) {
          phase = "dragging";
          setIsDragging(true);
          dragStartY.current = startY;
          dragCurrentY.current = e.touches[0].clientY;
          dragStartTime.current = Date.now();
        } else {
          phase = "idle";
          return;
        }
      }

      if (phase === "dragging") {
        e.preventDefault();
        dragCurrentY.current = e.touches[0].clientY;
        setDragOffsetY(delta);
      }
    };

    const onEnd = () => {
      if (phase !== "dragging") {
        phase = "idle";
        return;
      }
      phase = "idle";
      setIsDragging(false);
      const delta = dragCurrentY.current - dragStartY.current;
      const elapsed = Date.now() - dragStartTime.current;
      const vel = Math.abs(delta) / Math.max(elapsed, 1);
      if (delta > (vel > 0.4 ? 30 : 80)) {
        setPlayerView("mini");
      }
      setDragOffsetY(0);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [playerView, setPlayerView]);

  // Close on Escape key
  useEffect(() => {
    if (playerView === "mini") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayerView("mini");
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [playerView, setPlayerView]);

  // Seek bar handlers — prevent jitter while dragging
  const onSeekStart = useCallback(() => {
    setIsSeeking(true);
    setSeekTime(currentTime);
  }, [currentTime]);

  const onSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      setSeekTime(v);
      if (!isSeeking) seekTo(v);
    },
    [isSeeking, seekTo],
  );

  const onSeekEnd = useCallback(() => {
    seekTo(seekTime);
    setIsSeeking(false);
  }, [seekTime, seekTo]);

  if (playerView !== "full") return null;

  const meta = currentStory ? getCategoryMeta(currentStory.topic) : null;
  const color = meta?.color ?? "#d32222";
  const hasNext = currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;
  const bagItems = queueCtx.bag;

  const navHeight = "var(--nav-height)";

  const sheetStyle: React.CSSProperties = {
    top: 0,
    bottom: navHeight,
    transform: isDragging ? `translateY(calc(0dvh + ${dragOffsetY}px))` : "translateY(0dvh)",
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
          backgroundColor: "rgba(0,0,0,0.4)",
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
        {/* Drag handle — extra top padding for Dynamic Island */}
        <div
          className="pb-3 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-text-secondary/30 mx-auto" />
          <div className="flex justify-center mt-1">
            <span
              className="material-symbols-outlined text-[16px] text-text-secondary/40"
              aria-hidden="true"
            >
              expand_more
            </span>
          </div>
        </div>

        {/* ── FULL: player (if playing) + queue list, scrollable ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Compact player — only if something is playing */}
          {currentStory && meta && (
            <div className="px-6 pt-1 pb-4">
              <div
                className="flex items-center gap-4 touch-none"
                onTouchStart={onDragStart}
                onTouchMove={onDragMove}
                onTouchEnd={onDragEnd}
              >
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
                  value={displayTime}
                  onTouchStart={onSeekStart}
                  onTouchEnd={onSeekEnd}
                  onMouseDown={onSeekStart}
                  onMouseUp={onSeekEnd}
                  onChange={onSeekChange}
                  className="w-full h-1"
                  aria-label="Progreso de reproducción"
                />
                <div className="flex justify-between mt-0.5 text-[10px] text-text-secondary tabular-nums">
                  <span>{formatDuration(displayTime)}</span>
                  <span>-{formatDuration(Math.max(0, currentStory.duration - displayTime))}</span>
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
            </div>
          )}

          {/* Queue list — always visible, uses bag */}
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
                    const playingIndex = queue.findIndex((s) => s.id === story.id);
                    const isCurrent = playingIndex === currentIndex && currentStory !== null;
                    return (
                      <QueueItem
                        key={story.id}
                        story={story}
                        isLast={i === bagItems.length - 1}
                        isCurrent={isCurrent}
                        isPlaying={isPlaying}
                        onPlay={() => play(queueCtx.bag, i)}
                        onRemove={() => queueCtx.removeFromBag(story.id)}
                      />
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
      </div>
    </>
  );
}
