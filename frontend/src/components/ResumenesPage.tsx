import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";
import { formatMinutes } from "../lib/format";
import { hapticImpact } from "../lib/haptics";
import type { StoryWithTopic } from "../types";
import PremiumModal from "./PremiumModal";
import { useState } from "react";

/* ── Mock data ────────────────────────────────── */

interface Resumen {
  id: number;
  title: string;
  description: string;
  topic: string;
  icon: string;
  color: string;
  duration: number; // seconds
  week: string;
}

const RESUMENES: Resumen[] = [
  {
    id: 9001,
    title: "5 tendencias de IA de la semana",
    description:
      "Desde el nuevo modelo de Google hasta la regulación europea: lo más importante en inteligencia artificial.",
    topic: "IA",
    icon: "smart_toy",
    color: "#d32222",
    duration: 312,
    week: "24–28 Feb",
  },
  {
    id: 9002,
    title: "Wall Street en 5 minutos",
    description: "S&P 500, resultados de Nvidia, y la reacción del mercado a los datos de empleo.",
    topic: "Economía",
    icon: "trending_up",
    color: "#0d9488",
    duration: 295,
    week: "24–28 Feb",
  },
  {
    id: 9003,
    title: "La semana en geopolítica",
    description:
      "Avances diplomáticos en Ucrania, tensiones en el Mar de China y la cumbre del G7.",
    topic: "Internacional",
    icon: "public",
    color: "#2563eb",
    duration: 340,
    week: "24–28 Feb",
  },
  {
    id: 9004,
    title: "Lo más viral en redes",
    description: "Los memes, debates y tendencias que dominaron TikTok, X e Instagram esta semana.",
    topic: "Cultura",
    icon: "trending_up",
    color: "#db2777",
    duration: 260,
    week: "24–28 Feb",
  },
  {
    id: 9005,
    title: "5 avances científicos",
    description: "Edición genética, un nuevo exoplaneta habitable y avances contra el Alzheimer.",
    topic: "Ciencia",
    icon: "science",
    color: "#7c3aed",
    duration: 305,
    week: "24–28 Feb",
  },
  {
    id: 9006,
    title: "Resumen de La Liga",
    description:
      "Barça y Madrid se juegan el liderato, sorpresas en la jornada y el mercado de fichajes.",
    topic: "Deportes",
    icon: "sports_soccer",
    color: "#ea580c",
    duration: 275,
    week: "24–28 Feb",
  },
  {
    id: 9007,
    title: "Lo que pasó en el Congreso",
    description:
      "Debate presupuestario, la nueva ley de vivienda y las reacciones de todos los partidos.",
    topic: "Política",
    icon: "gavel",
    color: "#1a73e8",
    duration: 330,
    week: "24–28 Feb",
  },
  {
    id: 9008,
    title: "5 startups que han levantado ronda",
    description: "De fintech a biotech: las rondas de financiación más destacadas de la semana.",
    topic: "Tecnología",
    icon: "rocket_launch",
    color: "#d32222",
    duration: 288,
    week: "24–28 Feb",
  },
  {
    id: 9009,
    title: "Cripto: resumen semanal",
    description:
      "Bitcoin roza máximos, Ethereum se prepara para su upgrade y el debate sobre stablecoins.",
    topic: "Economía",
    icon: "currency_bitcoin",
    color: "#f59e0b",
    duration: 310,
    week: "24–28 Feb",
  },
  {
    id: 9010,
    title: "Las 5 series y pelis de la semana",
    description: "Estrenos de Netflix, HBO y cine: qué ver este fin de semana según la crítica.",
    topic: "Cultura",
    icon: "movie",
    color: "#db2777",
    duration: 265,
    week: "24–28 Feb",
  },
];

/* ── Helpers ──────────────────────────────────── */

function resumenToStory(r: Resumen): StoryWithTopic {
  return {
    id: r.id,
    pack_id: 0,
    position: 0,
    headline: r.title,
    summary: r.description,
    source_urls: [],
    source_count: 0,
    script: "",
    audio_filename: "",
    audio_url: null,
    duration: r.duration,
    topic: r.topic,
  };
}

/* ── Card ─────────────────────────────────────── */

function ResumenCard({ resumen }: { resumen: Resumen }) {
  const queue = useQueue();
  const audio = useAudio();
  const [showPremium, setShowPremium] = useState(false);
  const story = resumenToStory(resumen);
  const inBag = queue.isInBag(resumen.id);
  const bagPosition = inBag ? queue.bag.findIndex((s) => s.id === resumen.id) + 1 : 0;
  const isPlaying = audio.currentStory?.id === resumen.id;

  const handlePlay = () => {
    if (isPlaying) {
      audio.togglePlay();
    } else {
      audio.play([story], 0);
      audio.setPlayerView("mini");
    }
  };

  const handleQueue = () => {
    hapticImpact();
    if (inBag) {
      queue.removeFromBag(resumen.id);
    } else {
      if (queue.bag.length >= 4) {
        setShowPremium(true);
        return;
      }
      queue.addToBag(story);
      audio.enqueue([story]);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        {/* Color header band */}
        <div
          className="h-20 flex items-center justify-center relative"
          style={{ backgroundColor: `${resumen.color}10` }}
        >
          <span
            className="material-symbols-outlined text-[36px]"
            style={{ color: resumen.color, fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {resumen.icon}
          </span>
          {/* Week pill */}
          <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-text-secondary">
            {resumen.week}
          </span>
          {/* Queue badge */}
          {inBag && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-0.5 bg-green-50 text-green-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                check
              </span>
              Cola · #{bagPosition}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-4">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: resumen.color }}
          >
            {resumen.topic}
          </p>
          <h3 className="font-display font-bold text-[15px] leading-snug mt-1 text-balance">
            {resumen.title}
          </h3>
          <p className="text-text-secondary text-xs leading-relaxed mt-1 line-clamp-2">
            {resumen.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handlePlay}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-sm font-semibold transition-colors active:bg-primary/80"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {isPlaying && audio.isPlaying ? "pause" : "play_arrow"}
              </span>
              {isPlaying
                ? audio.isPlaying
                  ? "Pausar"
                  : "Reanudar"
                : formatMinutes(resumen.duration)}
            </button>
            <button
              onClick={handleQueue}
              className={`flex items-center justify-center size-10 rounded-lg border transition-colors ${
                inBag
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-border text-text-secondary hover:bg-muted"
              }`}
              aria-label={inBag ? "Quitar de cola" : "Añadir a cola"}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {inBag ? "playlist_remove" : "queue_music"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </>
  );
}

/* ── Topic helpers ────────────────────────────── */

function useTopics(resumenes: Resumen[]) {
  const counts = new Map<string, number>();
  for (const r of resumenes) {
    counts.set(r.topic, (counts.get(r.topic) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count }));
}

/* ── Page ─────────────────────────────────────── */

export default function ResumenesPage() {
  const { currentStory } = useAudio();
  const hasMiniPlayer = currentStory !== null;
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const topics = useTopics(RESUMENES);
  const filtered = activeTopic ? RESUMENES.filter((r) => r.topic === activeTopic) : RESUMENES;

  return (
    <div
      style={{
        paddingBottom: hasMiniPlayer ? "var(--content-bottom-mini)" : "var(--content-bottom)",
      }}
    >
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-border">
        <div
          className="flex items-center px-5 h-14"
          style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        >
          <h1 className="font-display font-bold text-lg">Resúmenes</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <p className="text-xs text-text-secondary mb-4">Semana del 24–28 de febrero</p>

        {/* Topic chips */}
        {topics.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <button
              onClick={() => setActiveTopic(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTopic === null
                  ? "bg-primary text-white"
                  : "border border-border-strong text-text-secondary hover:bg-muted"
              }`}
            >
              Todas
              <span className="ml-1 tabular-nums opacity-60">{RESUMENES.length}</span>
            </button>
            {topics.map((t) => (
              <button
                key={t.name}
                onClick={() => setActiveTopic(activeTopic === t.name ? null : t.name)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeTopic === t.name
                    ? "bg-primary text-white"
                    : "border border-border-strong text-text-secondary hover:bg-muted"
                }`}
              >
                {t.name}
                <span className="ml-1 tabular-nums opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <ResumenCard key={r.id} resumen={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
