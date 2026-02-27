import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface SwipeState {
  offsetX: number;
  isSwiping: boolean;
  direction: "left" | "right" | null;
}

interface SwipeConfig {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

const MAX_OFFSET = 150;

export function useSwipeGesture(
  ref: RefObject<HTMLElement | null>,
  config: SwipeConfig,
): SwipeState {
  const { threshold = 80, onSwipeLeft, onSwipeRight, enabled = true } = config;
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    isSwiping: false,
    direction: null,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const rafId = useRef(0);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });
  callbacksRef.current = { onSwipeLeft, onSwipeRight };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    setState({ offsetX: 0, isSwiping: false, direction: null });
    isHorizontal.current = null;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reducedMotion) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      isHorizontal.current = null;
      setState((prev) => ({ ...prev, isSwiping: true }));
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      if (isHorizontal.current === null) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
        }
        if (!isHorizontal.current) return;
      }

      if (!isHorizontal.current) return;

      e.preventDefault();
      const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, deltaX));

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setState({
          offsetX: clamped,
          isSwiping: true,
          direction: clamped > 0 ? "right" : clamped < 0 ? "left" : null,
        });
      });
    };

    const onTouchEnd = () => {
      const { offsetX } = stateRef.current;
      if (Math.abs(offsetX) > threshold) {
        if (offsetX > 0) callbacksRef.current.onSwipeRight?.();
        else callbacksRef.current.onSwipeLeft?.();
      }
      reset();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [ref, enabled, threshold, reducedMotion, reset]);

  const stateRef = useRef(state);
  stateRef.current = state;

  return state;
}
