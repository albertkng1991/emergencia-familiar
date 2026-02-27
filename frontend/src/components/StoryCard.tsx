import type { Story } from "../types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface StoryCardProps {
  story: Story;
  isActive: boolean;
  currentTime: number;
  onClick: () => void;
}

export default function StoryCard({ story, isActive, currentTime, onClick }: StoryCardProps) {
  const progress = isActive && story.duration > 0 ? (currentTime / story.duration) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-colors ${
        isActive
          ? "bg-gray-800 border-blue-500/50"
          : "bg-gray-900 border-gray-800 hover:border-gray-600"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isActive ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          {story.position}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isActive ? "text-white" : "text-gray-300"}`}>
            {story.headline}
          </p>
          {story.summary && (
            <p className="text-gray-500 text-sm mt-0.5 truncate">{story.summary}</p>
          )}
        </div>
        <span className="text-gray-500 text-sm flex-shrink-0">
          {isActive && currentTime > 0
            ? `${formatDuration(currentTime)} / ${formatDuration(story.duration)}`
            : formatDuration(story.duration)}
        </span>
      </div>

      {/* Story progress bar */}
      {isActive && (
        <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </button>
  );
}
