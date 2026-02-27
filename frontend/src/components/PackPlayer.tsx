import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPack } from "../api/client";
import { usePackPlayer } from "../hooks/usePackPlayer";
import type { Pack } from "../types";
import StoryCard from "./StoryCard";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PackPlayer() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);

  const stories = pack?.stories ?? [];
  const player = usePackPlayer(stories);

  const loadPack = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchPack(Number(id));
      setPack(data);
    } catch (e) {
      console.error("Failed to load pack:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPack();
  }, [loadPack]);

  if (loading) {
    return <p className="text-gray-500 text-center py-12">Cargando...</p>;
  }

  if (!pack) {
    return <p className="text-red-400 text-center py-12">Pack no encontrado</p>;
  }

  const totalProgress =
    player.totalDuration > 0 ? (player.totalElapsed / player.totalDuration) * 100 : 0;

  return (
    <div>
      {/* Back link */}
      <Link
        to="/"
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block transition-colors"
      >
        &larr; Volver
      </Link>

      {/* Pack header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">{pack.topic}</h2>
        <p className="text-gray-400 text-sm mt-1">
          {pack.date} &middot; {stories.length} noticias &middot;{" "}
          {formatDuration(pack.total_duration)}
        </p>
      </div>

      {/* Story list */}
      <div className="space-y-2 mb-6">
        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            story={story}
            isActive={i === player.currentIndex}
            currentTime={i === player.currentIndex ? player.currentTime : 0}
            onClick={() => player.play(i)}
          />
        ))}
      </div>

      {/* Total progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Pack</span>
          <span>
            {formatDuration(player.totalElapsed)} / {formatDuration(player.totalDuration)}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(totalProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={player.prevStory}
          disabled={player.currentIndex === 0}
          className="text-gray-400 hover:text-white disabled:text-gray-700 p-2 transition-colors"
          title="Anterior"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-5 3.333a1 1 0 000 1.664l5 3.333zM15.445 14.832A1 1 0 0017 14V6a1 1 0 00-1.555-.832l-5 3.333a1 1 0 000 1.664l5 3.333z" />
          </svg>
        </button>

        <button
          onClick={() => player.skip(-15)}
          className="text-gray-400 hover:text-white p-2 text-xs font-medium transition-colors"
          title="-15s"
        >
          -15s
        </button>

        <button
          onClick={player.togglePlay}
          className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors"
        >
          {player.isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <button
          onClick={() => player.skip(15)}
          className="text-gray-400 hover:text-white p-2 text-xs font-medium transition-colors"
          title="+15s"
        >
          +15s
        </button>

        <button
          onClick={player.nextStory}
          disabled={player.currentIndex >= stories.length - 1}
          className="text-gray-400 hover:text-white disabled:text-gray-700 p-2 transition-colors"
          title="Siguiente"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832l5-3.333a1 1 0 000-1.664l-5-3.333zM11.555 5.168A1 1 0 0010 6v8a1 1 0 001.555.832l5-3.333a1 1 0 000-1.664l-5-3.333z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
