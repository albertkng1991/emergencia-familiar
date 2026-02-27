import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueue } from "../contexts/QueueContext";
import { categoryColor } from "../lib/categories";

export default function FlyAnimationLayer() {
  const queue = useQueue();
  const { flyAnimation, clearFlyAnimation } = queue;
  const ghostRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!flyAnimation) {
      setAnimating(false);
      return;
    }

    // Start at source position, then animate to target on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
      });
    });
  }, [flyAnimation]);

  const handleTransitionEnd = () => {
    clearFlyAnimation();
    setAnimating(false);
  };

  if (!flyAnimation) return null;

  const { sourceRect, targetRect, topic } = flyAnimation;
  const color = categoryColor(topic);

  // Compute translation and scale deltas for compositor-only animation
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const scaleEnd = 20 / sourceRect.width;

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    top: sourceRect.top,
    left: sourceRect.left,
    width: sourceRect.width,
    height: sourceRect.height,
    borderRadius: 12,
    backgroundColor: `${color}20`,
    border: `2px solid ${color}40`,
    zIndex: 9999,
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    willChange: "transform, opacity",
    transition:
      "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const startStyle: React.CSSProperties = {
    ...baseStyle,
    opacity: 1,
    transform: "translate(0, 0) scale(1)",
  };

  const endStyle: React.CSSProperties = {
    ...baseStyle,
    opacity: 0,
    transform: `translate(${dx}px, ${dy}px) scale(${scaleEnd})`,
  };

  return createPortal(
    <div
      ref={ghostRef}
      aria-hidden="true"
      style={animating ? endStyle : startStyle}
      onTransitionEnd={handleTransitionEnd}
    >
      {!animating && (
        <span
          className="material-symbols-outlined"
          style={{ color, fontSize: 24 }}
          aria-hidden="true"
        >
          queue_music
        </span>
      )}
    </div>,
    document.body,
  );
}
