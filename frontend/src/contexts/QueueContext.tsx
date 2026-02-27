import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { StoryWithTopic } from "../types";

interface FlyAnimation {
  sourceRect: DOMRect;
  targetRect: DOMRect;
  topic: string;
}

interface QueueContextValue {
  bag: StoryWithTopic[];
  addToBag: (story: StoryWithTopic) => void;
  addAllToBag: (stories: StoryWithTopic[]) => void;
  removeFromBag: (storyId: number) => void;
  clearBag: () => void;
  isInBag: (storyId: number) => boolean;
  totalDuration: number;
  colaTabRef: RefObject<HTMLDivElement | null>;
  triggerFlyAnimation: (sourceRect: DOMRect, topic: string) => void;
  flyAnimation: FlyAnimation | null;
  clearFlyAnimation: () => void;
  badgeBounce: boolean;
}

const QueueCtx = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<StoryWithTopic[]>([]);
  const [flyAnimation, setFlyAnimation] = useState<FlyAnimation | null>(null);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const colaTabRef = useRef<HTMLDivElement | null>(null);

  const addToBag = useCallback((story: StoryWithTopic) => {
    setBag((prev) => {
      if (prev.some((s) => s.id === story.id)) return prev;
      return [...prev, story];
    });
  }, []);

  const addAllToBag = useCallback((stories: StoryWithTopic[]) => {
    setBag((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      const newStories = stories.filter((s) => !ids.has(s.id));
      return newStories.length > 0 ? [...prev, ...newStories] : prev;
    });
  }, []);

  const removeFromBag = useCallback((storyId: number) => {
    setBag((prev) => prev.filter((s) => s.id !== storyId));
  }, []);

  const clearBag = useCallback(() => {
    setBag([]);
  }, []);

  const isInBag = useCallback((storyId: number) => bag.some((s) => s.id === storyId), [bag]);

  const totalDuration = useMemo(() => bag.reduce((sum, s) => sum + s.duration, 0), [bag]);

  const triggerFlyAnimation = useCallback((sourceRect: DOMRect, topic: string) => {
    const tabEl = colaTabRef.current;
    if (!tabEl) return;
    const targetRect = tabEl.getBoundingClientRect();
    setFlyAnimation({ sourceRect, targetRect, topic });
  }, []);

  const clearFlyAnimation = useCallback(() => {
    setFlyAnimation(null);
    setBadgeBounce(true);
    setTimeout(() => setBadgeBounce(false), 350);
  }, []);

  return (
    <QueueCtx.Provider
      value={{
        bag,
        addToBag,
        addAllToBag,
        removeFromBag,
        clearBag,
        isInBag,
        totalDuration,
        colaTabRef,
        triggerFlyAnimation,
        flyAnimation,
        clearFlyAnimation,
        badgeBounce,
      }}
    >
      {children}
    </QueueCtx.Provider>
  );
}

export function useQueue(): QueueContextValue {
  const ctx = useContext(QueueCtx);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}
