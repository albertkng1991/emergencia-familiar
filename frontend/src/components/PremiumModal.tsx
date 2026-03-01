import { useEffect } from "react";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

const features = [
  { icon: "headphones", text: "Audios en profundidad de hasta 10 min" },
  { icon: "insights", text: "Análisis exclusivo con más contexto" },
  { icon: "all_inclusive", text: "Acceso ilimitado a todo el archivo" },
];

export default function PremiumModal({ open, onClose }: PremiumModalProps) {
  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl shadow-warm-lg max-w-sm w-full overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="onda premium"
      >
        {/* Top accent bar */}
        <div className="brand-accent h-1.5" />

        <div className="px-6 pt-6 pb-5">
          {/* Title */}
          <h2 className="font-display text-2xl font-bold text-text-primary">
            onda.<span className="text-primary">premium</span>
          </h2>
          <p className="text-sm text-text-secondary mt-1">Desbloquea la experiencia completa</p>

          {/* Features */}
          <ul className="mt-5 space-y-3.5">
            {features.map((f) => (
              <li key={f.icon} className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[22px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <span className="text-sm text-text-primary">{f.text}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button onClick={onClose} className="btn-block-primary mt-6">
            Suscribirme
          </button>

          {/* Secondary */}
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-text-secondary mt-3 py-1"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
