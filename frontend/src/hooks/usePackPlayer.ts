import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../types";

interface PlayerState {
  isPlaying: boolean;
  currentIndex: number;
  currentTime: number;
  storyDuration: number;
  totalElapsed: number;
  totalDuration: number;
}

export function usePackPlayer(stories: Story[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentIndex: 0,
    currentTime: 0,
    storyDuration: 0,
    totalElapsed: 0,
    totalDuration: 0,
  });

  // Calculate total duration from story metadata
  const totalDuration = stories.reduce((sum, s) => sum + s.duration, 0);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setState((prev) => {
        const elapsed =
          stories
            .slice(0, prev.currentIndex)
            .reduce((sum, s) => sum + s.duration, 0) + audio.currentTime;
        return {
          ...prev,
          currentTime: audio.currentTime,
          storyDuration: audio.duration || 0,
          totalElapsed: elapsed,
          totalDuration,
        };
      });
    };

    const onEnded = () => {
      setState((prev) => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex < stories.length) {
          // Auto-advance to next story
          const nextStory = stories[nextIndex];
          if (nextStory.audio_url) {
            audio.src = nextStory.audio_url;
            audio.play();
          }
          return { ...prev, currentIndex: nextIndex };
        }
        // Pack finished
        return { ...prev, isPlaying: false };
      });
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
  }, [stories, totalDuration]);

  const play = useCallback(
    (index?: number) => {
      const audio = audioRef.current;
      if (!audio || stories.length === 0) return;

      const targetIndex = index ?? state.currentIndex;
      const story = stories[targetIndex];
      if (!story?.audio_url) return;

      if (index !== undefined && index !== state.currentIndex) {
        audio.src = story.audio_url;
        setState((prev) => ({ ...prev, currentIndex: index }));
      } else if (!audio.src || audio.src !== window.location.origin + story.audio_url) {
        audio.src = story.audio_url;
      }

      audio.play();
    },
    [stories, state.currentIndex]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const prevStory = useCallback(() => {
    if (state.currentIndex > 0) {
      play(state.currentIndex - 1);
    }
  }, [state.currentIndex, play]);

  const nextStory = useCallback(() => {
    if (state.currentIndex < stories.length - 1) {
      play(state.currentIndex + 1);
    }
  }, [state.currentIndex, stories.length, play]);

  const skip = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || 0));
      }
    },
    []
  );

  return {
    ...state,
    totalDuration,
    play,
    pause,
    togglePlay,
    prevStory,
    nextStory,
    skip,
  };
}
