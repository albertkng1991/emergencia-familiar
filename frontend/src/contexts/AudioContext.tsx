import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Story } from "../types";

export interface ListenedStory extends Story {
  topic: string;
  listenedAt: string;
}

type PlayerView = "mini" | "half" | "full";

interface AudioState {
  queue: (Story & { topic: string })[];
  currentIndex: number;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  playerView: PlayerView;
}

interface AudioContextValue extends AudioState {
  currentStory: (Story & { topic: string }) | null;
  totalDuration: number;
  totalElapsed: number;
  play: (stories: (Story & { topic: string })[], startIndex?: number) => void;
  enqueue: (stories: (Story & { topic: string })[]) => void;
  togglePlay: () => void;
  pause: () => void;
  skip: (seconds: number) => void;
  nextStory: () => void;
  prevStory: () => void;
  cycleSpeed: () => void;
  setPlayerView: (v: PlayerView) => void;
  seekTo: (time: number) => void;
  listened: ListenedStory[];
  isListened: (storyId: number) => boolean;
  clearListened: () => void;
  getProgress: (storyId: number) => number;
}

const SPEEDS = [1, 1.5, 2];
const LISTENED_KEY = "listened";

function loadListened(): ListenedStory[] {
  try {
    const raw = localStorage.getItem(LISTENED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveListened(items: ListenedStory[]) {
  localStorage.setItem(LISTENED_KEY, JSON.stringify(items));
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    queue: [],
    currentIndex: 0,
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    playerView: "mini",
  });
  const [listened, setListened] = useState<ListenedStory[]>(loadListened);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});

  // Stable ref for state to avoid stale closures in audio event handlers
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const s = stateRef.current;
      const elapsed =
        s.queue.slice(0, s.currentIndex).reduce((sum, st) => sum + st.duration, 0) +
        audio.currentTime;
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        totalElapsed: elapsed,
      }));
      // Track per-story progress (fraction 0..1)
      const cur = s.queue[s.currentIndex];
      if (cur && cur.duration > 0) {
        const frac = Math.min(audio.currentTime / cur.duration, 1);
        setProgressMap((prev) => {
          if (Math.abs((prev[cur.id] ?? 0) - frac) < 0.005) return prev;
          return { ...prev, [cur.id]: frac };
        });
      }
    };

    const onEnded = () => {
      const s = stateRef.current;
      const finishedStory = s.queue[s.currentIndex];

      // Mark as listened
      if (finishedStory) {
        setListened((prev) => {
          if (prev.some((l) => l.id === finishedStory.id)) return prev;
          const next = [...prev, { ...finishedStory, listenedAt: new Date().toISOString() }];
          saveListened(next);
          return next;
        });
      }

      const nextIndex = s.currentIndex + 1;
      if (nextIndex < s.queue.length) {
        const nextStory = s.queue[nextIndex];
        if (nextStory.audio_url) {
          audio.src = nextStory.audio_url;
          audio.playbackRate = s.playbackSpeed;
          audio.play();
        }
        setState((prev) => ({ ...prev, currentIndex: nextIndex, currentTime: 0 }));
      } else {
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
    };

    const onPlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const onPause = () => setState((prev) => ({ ...prev, isPlaying: false }));

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackSpeed;
    }
  }, [state.playbackSpeed]);

  const play = useCallback((stories: (Story & { topic: string })[], startIndex: number = 0) => {
    const audio = audioRef.current;
    if (!audio || stories.length === 0) return;

    const story = stories[startIndex];
    if (!story?.audio_url) return;

    audio.src = story.audio_url;
    audio.playbackRate = stateRef.current.playbackSpeed;
    audio.play();

    setState((prev) => ({
      ...prev,
      queue: stories,
      currentIndex: startIndex,
      currentTime: 0,
    }));
  }, []);

  const enqueue = useCallback((stories: (Story & { topic: string })[]) => {
    const s = stateRef.current;
    const audio = audioRef.current;

    const ids = new Set(s.queue.map((q) => q.id));
    const newStories = stories.filter((st) => !ids.has(st.id));
    if (newStories.length === 0) return;

    const updatedQueue = [...s.queue, ...newStories];

    if (!s.isPlaying) {
      const first = newStories[0];
      if (audio && first?.audio_url) {
        audio.src = first.audio_url;
        audio.playbackRate = s.playbackSpeed;
        audio.play();
        setState((prev) => ({
          ...prev,
          queue: updatedQueue,
          currentIndex: updatedQueue.indexOf(first),
          currentTime: 0,
        }));
        return;
      }
    }

    setState((prev) => {
      const prevIds = new Set(prev.queue.map((q) => q.id));
      const toAdd = stories.filter((st) => !prevIds.has(st.id));
      return toAdd.length > 0 ? { ...prev, queue: [...prev.queue, ...toAdd] } : prev;
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (stateRef.current.isPlaying) {
      audio.pause();
    } else {
      const s = stateRef.current;
      const story = s.queue[s.currentIndex];
      if (story?.audio_url) {
        if (!audio.src || audio.ended) {
          audio.src = story.audio_url;
          audio.playbackRate = s.playbackSpeed;
        }
        audio.play();
      }
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || 0));
    }
  }, []);

  const nextStory = useCallback(() => {
    const s = stateRef.current;
    if (s.currentIndex < s.queue.length - 1) {
      const next = s.currentIndex + 1;
      const story = s.queue[next];
      const audio = audioRef.current;
      if (audio && story?.audio_url) {
        audio.src = story.audio_url;
        audio.playbackRate = s.playbackSpeed;
        audio.play();
        setState((prev) => ({ ...prev, currentIndex: next, currentTime: 0 }));
      }
    }
  }, []);

  const prevStory = useCallback(() => {
    const s = stateRef.current;
    if (s.currentIndex > 0) {
      const prev = s.currentIndex - 1;
      const story = s.queue[prev];
      const audio = audioRef.current;
      if (audio && story?.audio_url) {
        audio.src = story.audio_url;
        audio.playbackRate = s.playbackSpeed;
        audio.play();
        setState((p) => ({ ...p, currentIndex: prev, currentTime: 0 }));
      }
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    setState((prev) => {
      const idx = SPEEDS.indexOf(prev.playbackSpeed);
      return { ...prev, playbackSpeed: SPEEDS[(idx + 1) % SPEEDS.length] };
    });
  }, []);

  const setPlayerView = useCallback((v: PlayerView) => {
    setState((prev) => ({ ...prev, playerView: v }));
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
    }
  }, []);

  const isListened = useCallback(
    (storyId: number) => listened.some((l) => l.id === storyId),
    [listened],
  );

  const clearListened = useCallback(() => {
    setListened([]);
    localStorage.removeItem(LISTENED_KEY);
  }, []);

  const getProgress = useCallback((storyId: number) => progressMap[storyId] ?? 0, [progressMap]);

  const currentStory = state.queue[state.currentIndex] ?? null;
  const totalDuration = state.queue.reduce((sum, s) => sum + s.duration, 0);
  const totalElapsed =
    state.queue.slice(0, state.currentIndex).reduce((sum, s) => sum + s.duration, 0) +
    state.currentTime;

  return (
    <AudioCtx.Provider
      value={{
        ...state,
        currentStory,
        totalDuration,
        totalElapsed,
        play,
        enqueue,
        togglePlay,
        pause,
        skip,
        nextStory,
        prevStory,
        cycleSpeed,
        setPlayerView,
        seekTo,
        listened,
        isListened,
        clearListened,
        getProgress,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
