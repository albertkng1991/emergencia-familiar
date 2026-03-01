import { useRef } from "react";

interface DurationMenuProps {
  onSelect2min: () => void;
  onSelectPremium: () => void;
  onClose: () => void;
}

const options = [
  { minutes: 2, label: "Resumen", icon: "timer", locked: false },
  { minutes: 4, label: "Mas detalle", icon: "lock", locked: true },
  { minutes: 6, label: "Super profundo", icon: "lock", locked: true },
] as const;

const CLICK_GUARD_MS = 300;

export default function DurationMenu({
  onSelect2min,
  onSelectPremium,
  onClose,
}: DurationMenuProps) {
  const mountTime = useRef(Date.now());

  const handleSelect = (locked: boolean) => {
    if (Date.now() - mountTime.current < CLICK_GUARD_MS) return;
    if (locked) onSelectPremium();
    else onSelect2min();
  };

  return (
    <>
      {/* Backdrop — fixed to catch outside taps */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu — absolute within the card, centered */}
      <div className="absolute inset-0 z-50 flex items-center justify-center">
        <div
          className="bg-white rounded-2xl shadow-warm-lg border border-border overflow-hidden animate-modal-in"
          style={{ minWidth: 220 }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt, i) => (
            <button
              key={opt.minutes}
              onClick={() => handleSelect(opt.locked)}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-muted active:bg-muted ${
                i < options.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                  opt.locked ? "bg-muted" : "bg-primary/10"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    opt.locked ? "text-text-secondary" : "text-primary"
                  }`}
                  style={opt.locked ? undefined : { fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {opt.icon}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold ${
                    opt.locked ? "text-text-secondary" : "text-text-primary"
                  }`}
                >
                  {opt.minutes} min
                </span>
                <span
                  className={`text-xs ml-2 ${
                    opt.locked ? "text-text-secondary/60" : "text-text-secondary"
                  }`}
                >
                  {opt.label}
                </span>
              </div>

              {opt.locked && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 shrink-0">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
