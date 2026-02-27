import { useCallback, useRef, useState } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { categoryColor } from "../lib/categories";
import { formatDuration } from "../lib/format";
import type { StoryWithTopic } from "../types";

function StoryThumbnail({
  topic,
  progress,
  isPlaying,
}: {
  topic: string;
  progress: number;
  isPlaying: boolean;
}) {
  const color = categoryColor(topic);
  return (
    <div
      className="size-20 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: `${color}15` }}
    >
      {isPlaying ? (
        <div className="flex items-end gap-[3px] h-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full animate-eq-${i}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ) : (
        <span
          className="material-symbols-outlined text-[28px]"
          style={{ color }}
          aria-hidden="true"
        >
          article
        </span>
      )}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/5">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: color, opacity: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}

interface Props {
  story: StoryWithTopic;
  progress: number;
  isLast: boolean;
  onDismiss: (storyId: number) => void;
}

export default function SwipeableStoryCard({ story, progress, isLast, onDismiss }: Props) {
  const queue = useQueue();
  const audio = useAudio();
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slideOut, setSlideOut] = useState<"left" | "right" | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const inBag = queue.isInBag(story.id);
  const isCurrentlyPlaying = audio.currentStory?.id === story.id;

  const handleAddToQueue = useCallback(() => {
    queue.addToBag(story);
    audio.enqueue([story]);
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      queue.triggerFlyAnimation(rect, story.topic);
    }
  }, [queue, audio, story]);

  const handleSwipeRight = useCallback(() => {
    setSlideOut("right");
  }, []);

  const handleSwipeLeft = useCallback(() => {
    setSlideOut("left");
  }, []);

  const swipeState = useSwipeGesture(cardRef, {
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    enabled: !inBag,
  });

  const handleSlideOutEnd = () => {
    if (!slideOut) return;
    setCollapsed(true);
    if (slideOut === "right") {
      handleAddToQueue();
    } else {
      onDismiss(story.id);
    }
  };

  const handleTap = () => {
    if (isCurrentlyPlaying) {
      audio.togglePlay();
      return;
    }
    audio.play([story], 0);
    audio.setPlayerView("mini");
  };

  const color = categoryColor(story.topic);
  const revealOpacity = Math.min(Math.abs(swipeState.offsetX) / 100, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden transition-[max-height,opacity] duration-300"
      style={{
        maxHeight: collapsed ? 0 : 500,
        opacity: collapsed ? 0 : 1,
      }}
      onTransitionEnd={(e) => {
        if (collapsed && e.propertyName === "max-height") {
          // Cleanup after height collapse animation
        }
      }}
    >
      {/* Right swipe reveal — green add */}
      <div
        className="absolute inset-0 flex items-center pl-6 rounded-lg"
        style={{
          backgroundColor: `rgb(22 163 74 / ${revealOpacity * 0.15})`,
          opacity: swipeState.direction === "right" ? 1 : 0,
        }}
      >
        <span
          className="material-symbols-outlined text-[28px]"
          style={{ color: "#16a34a", opacity: revealOpacity }}
          aria-hidden="true"
        >
          queue_music
        </span>
      </div>

      {/* Left swipe reveal — red dismiss */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-6 rounded-lg"
        style={{
          backgroundColor: `rgb(220 38 38 / ${revealOpacity * 0.15})`,
          opacity: swipeState.direction === "left" ? 1 : 0,
        }}
      >
        <span
          className="material-symbols-outlined text-[28px]"
          style={{ color: "#dc2626", opacity: revealOpacity }}
          aria-hidden="true"
        >
          delete_sweep
        </span>
      </div>

      {/* The actual card */}
      <div
        ref={cardRef}
        className="relative bg-white"
        style={{
          transform: slideOut
            ? `translateX(${slideOut === "right" ? "110%" : "-110%"})`
            : `translateX(${swipeState.offsetX}px)`,
          transition: swipeState.isSwiping
            ? "none"
            : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
        onTransitionEnd={(e) => {
          if (slideOut && e.propertyName === "transform") {
            handleSlideOutEnd();
          }
        }}
      >
        <button
          onClick={handleTap}
          aria-label={`${isCurrentlyPlaying ? (audio.isPlaying ? "Pausar" : "Reanudar") : "Reproducir"}: ${story.headline}`}
          className={`flex gap-4 py-4 w-full text-left ${!isLast ? "border-b border-border" : ""}`}
        >
          <StoryThumbnail
            topic={story.topic}
            progress={progress}
            isPlaying={isCurrentlyPlaying && audio.isPlaying}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                {story.topic}
              </p>
              {isCurrentlyPlaying && (
                <span className="text-[10px] font-semibold text-primary">
                  {audio.isPlaying ? "Reproduciendo" : "En pausa"}
                </span>
              )}
              {!isCurrentlyPlaying && inBag && (
                <span
                  className="material-symbols-outlined text-[14px] text-green-600"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-sm leading-snug mt-1 text-balance line-clamp-2">
              {story.headline}
            </h3>
            {story.summary && (
              <p className="text-text-secondary text-xs leading-relaxed mt-1 line-clamp-1">
                {story.summary}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              {isCurrentlyPlaying ? (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {audio.isPlaying ? "pause" : "play_arrow"}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">
                    {formatDuration(audio.currentTime)} / {formatDuration(story.duration)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    play_arrow
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">
                    {formatDuration(story.duration)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
