import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTopics } from "../api/client";
import { useAudio } from "../contexts/AudioContext";
import type { Topic } from "../types";

/* ── Interest chip ──────────────────────────────── */
function InterestChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
        selected
          ? "bg-primary text-white"
          : "border border-border-strong text-text-secondary hover:bg-muted"
      }`}
      role="checkbox"
      aria-checked={selected}
    >
      {selected && (
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          check
        </span>
      )}
      {label}
    </button>
  );
}

/* ── Section wrapper ────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-5 border-b border-border">
      <h2 className="font-display font-bold text-base mb-4 text-balance">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { currentStory } = useAudio();
  const hasMiniPlayer = currentStory !== null;

  // Topics / interests
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // Delivery time
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // Voice
  const [voice, setVoice] = useState("natural-1");

  // Duration
  const [duration, setDuration] = useState(15);

  // Load topics
  useEffect(() => {
    async function loadTopics() {
      try {
        const t = await fetchTopics("daily");
        setTopics(t);
      } catch (e) {
        console.error("Failed to load topics:", e);
      }
    }
    loadTopics();
  }, []);

  const toggleTopic = (name: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div
      style={{
        paddingBottom: hasMiniPlayer ? "var(--content-bottom-mini)" : "var(--content-bottom)",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-border">
        <div
          className="flex items-center px-4 h-14"
          style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Link to="/" className="p-2 -ml-2 text-text-primary" aria-label="Volver">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              arrow_back
            </span>
          </Link>
          <h1 className="flex-1 text-center font-display font-bold text-base">Ajustes</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Interests */}
      <Section title="Temas de interes">
        <div className="flex flex-wrap gap-2">
          {topics.length > 0
            ? topics.map((t) => (
                <InterestChip
                  key={t.name}
                  label={t.name}
                  selected={selectedTopics.has(t.name)}
                  onToggle={() => toggleTopic(t.name)}
                />
              ))
            : ["Tecnologia", "Politica", "Economia", "Deportes", "Ciencia", "Salud"].map((name) => (
                <InterestChip
                  key={name}
                  label={name}
                  selected={selectedTopics.has(name)}
                  onToggle={() => toggleTopic(name)}
                />
              ))}
        </div>
      </Section>

      {/* Delivery time */}
      <Section title="Hora de entrega">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg overflow-hidden">
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="bg-transparent text-center text-2xl font-display font-bold w-16 py-3 appearance-none focus:outline-none tabular-nums"
              aria-label="Hora"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-2xl font-bold text-text-secondary">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="bg-transparent text-center text-2xl font-display font-bold w-16 py-3 appearance-none focus:outline-none tabular-nums"
              aria-label="Minuto"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setPeriod("AM")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === "AM" ? "bg-primary text-white" : "bg-muted text-text-secondary"
              }`}
            >
              AM
            </button>
            <button
              onClick={() => setPeriod("PM")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === "PM" ? "bg-primary text-white" : "bg-muted text-text-secondary"
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </Section>

      {/* Voice preference */}
      <Section title="Voz preferida">
        <div className="space-y-2">
          {[
            { id: "natural-1", label: "Natural (Femenina)", desc: "Clara y profesional" },
            { id: "natural-2", label: "Natural (Masculina)", desc: "Calida y conversacional" },
            { id: "news-1", label: "Noticiero", desc: "Formal, estilo reportaje" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVoice(v.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                voice === v.id
                  ? "bg-primary-tint border border-primary/30"
                  : "border border-border hover:bg-hover"
              }`}
              role="radio"
              aria-checked={voice === v.id}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  voice === v.id ? "text-primary" : "text-text-secondary"
                }`}
                aria-hidden="true"
              >
                {voice === v.id ? "radio_button_checked" : "radio_button_unchecked"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{v.label}</p>
                <p className="text-xs text-text-secondary">{v.desc}</p>
              </div>
              <button
                className="p-1.5 text-text-secondary hover:text-primary"
                aria-label={`Previsualizar voz ${v.label}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  play_circle
                </span>
              </button>
            </button>
          ))}
        </div>
      </Section>

      {/* Duration */}
      <Section title="Duracion objetivo">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-secondary">5 min</span>
            <span className="text-lg font-display font-bold text-primary tabular-nums">
              {duration} min
            </span>
            <span className="text-xs text-text-secondary">30 min</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
            aria-label="Duracion objetivo en minutos"
          />
        </div>
      </Section>

      {/* Account */}
      <section className="px-5 py-5">
        <h2 className="font-display font-bold text-base mb-4 text-balance">Cuenta y suscripcion</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-text-secondary">Email</span>
            <span className="text-sm font-medium">usuario@email.com</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-text-secondary">Plan</span>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Premium
            </span>
          </div>
          <button className="w-full text-center py-2.5 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-hover transition-colors">
            Gestionar suscripcion
          </button>
          <button className="w-full text-center py-2.5 text-sm text-text-secondary hover:text-primary transition-colors">
            Cerrar sesion
          </button>
        </div>
      </section>
    </div>
  );
}
