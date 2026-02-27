import { useCallback, useEffect, useState } from "react";
import { fetchDates, fetchPack, fetchPacks, fetchTopics, fetchTrending } from "../api/client";
import { useAudio } from "../contexts/AudioContext";
import { getCategoryMeta } from "../lib/categories";
import type { DateInfo, Pack, Topic, TrendingTopic } from "../types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekRange(dateStr: string): string {
  const monday = parseDateLocal(dateStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function HomeWeekly() {
  const audio = useAudio();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [loading, setLoading] = useState(true);

  // Load weekly dates + trending
  useEffect(() => {
    async function loadMeta() {
      try {
        const [d, t] = await Promise.all([fetchDates("weekly"), fetchTrending()]);
        setDates(d);
        setTrending(t);
        if (d.length > 0 && !selectedWeek) {
          setSelectedWeek(d[0].date);
        }
      } catch (e) {
        console.error("Failed to load weekly meta:", e);
      }
    }
    loadMeta();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load packs + topics
  const loadPacks = useCallback(async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetchPacks({ type: "weekly", date: selectedWeek }),
        fetchTopics("weekly"),
      ]);
      setPacks(p);
      setTopics(t);
    } catch (e) {
      console.error("Failed to load weekly packs:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const totalDuration = packs.reduce((sum, p) => sum + p.total_duration, 0);
  const totalStories = packs.reduce((sum, p) => sum + p.story_count, 0);

  // Featured pack: first one or trending
  const featuredPack = trending[0]?.latest_pack ?? packs[0];

  const playPack = async (pack: Pack) => {
    try {
      const fullPack = await fetchPack(pack.id);
      const stories = (fullPack.stories ?? []).map((s) => ({
        ...s,
        topic: pack.topic,
      }));
      if (stories.length > 0) {
        audio.play(stories);
      }
    } catch (e) {
      console.error("Failed to load pack for playback:", e);
    }
  };

  const playAll = async () => {
    if (packs.length === 0) return;
    try {
      const allStories = [];
      for (const pack of packs) {
        const fullPack = await fetchPack(pack.id);
        const stories = (fullPack.stories ?? []).map((s) => ({
          ...s,
          topic: pack.topic,
        }));
        allStories.push(...stories);
      }
      if (allStories.length > 0) {
        audio.play(allStories);
      }
    } catch (e) {
      console.error("Failed to load packs for playback:", e);
    }
  };

  const hasMiniPlayer = audio.currentStory !== null;

  return (
    <div className={hasMiniPlayer ? "pb-32" : "pb-20"}>
      {/* Header */}
      <header className="px-5 pt-8 pb-6 border-b border-border">
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">
          Resumen Semanal
        </h1>
        {selectedWeek && (
          <p className="text-text-secondary text-sm mt-1">{formatWeekRange(selectedWeek)}</p>
        )}
      </header>
      <div className="h-0.5 brand-accent" />

      {/* Week selector */}
      {dates.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide">
          {dates.map((d) => {
            const monday = parseDateLocal(d.date);
            const thisMonday = new Date();
            thisMonday.setHours(0, 0, 0, 0);
            thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7));
            const isThis = monday.getTime() === thisMonday.getTime();
            const label = isThis
              ? "Esta semana"
              : monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

            return (
              <button
                key={d.date}
                onClick={() => setSelectedWeek(d.date)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedWeek === d.date
                    ? "bg-primary text-white"
                    : "bg-muted text-text-secondary hover:bg-muted-hover"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 space-y-4">
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4">
          {/* Featured card */}
          {featuredPack && (
            <button
              onClick={() => playPack(featuredPack)}
              className="block w-full text-left relative rounded-lg overflow-hidden mb-6"
            >
              <div className="bg-gradient-to-br from-bg-dark to-bg-dark-warm h-48 flex flex-col justify-end p-5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Daily Briefing
                </span>
                <h3 className="font-display text-xl font-bold text-white mt-1 text-balance">
                  {featuredPack.topic}
                </h3>
                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-2 bg-primary text-white rounded-full px-4 py-2 text-sm font-medium">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      play_arrow
                    </span>
                    Reproducir
                  </span>
                  <span className="text-white/70 text-xs tabular-nums">
                    {formatDuration(featuredPack.total_duration)}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Summary badge */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-balance">Categorías</h2>
            <span className="text-xs text-text-secondary tabular-nums">
              {totalStories} historias · {formatDuration(totalDuration)}
            </span>
          </div>

          {/* Category grid */}
          {topics.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {topics.map((topic) => {
                const meta = getCategoryMeta(topic.name);
                const topicPacks = packs.filter((p) => p.topic === topic.name);
                const topicDuration = topicPacks.reduce((sum, p) => sum + p.total_duration, 0);
                const firstPack = topicPacks[0];

                return firstPack ? (
                  <button
                    key={topic.name}
                    onClick={() => playPack(firstPack)}
                    className="card-warm p-4 text-left"
                  >
                    <div
                      className="size-10 rounded-md flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${meta.color}12` }}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ color: meta.color }}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm">{topic.name}</h3>
                    <p className="text-text-secondary text-xs mt-0.5 tabular-nums">
                      {topic.count} {topic.count === 1 ? "artículo" : "artículos"} ·{" "}
                      {formatDuration(topicDuration)}
                    </p>
                    {/* Mini progress bar */}
                    <div className="h-1 bg-muted rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: meta.color,
                          width: `${Math.min((topic.count / Math.max(totalStories, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </button>
                ) : (
                  <div
                    key={topic.name}
                    className="bg-white border border-border rounded-lg p-4 opacity-60"
                  >
                    <div
                      className="size-10 rounded-md flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${meta.color}12` }}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ color: meta.color }}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm">{topic.name}</h3>
                    <p className="text-text-secondary text-xs mt-0.5">{topic.count} artículos</p>
                  </div>
                );
              })}
            </div>
          ) : packs.length === 0 ? (
            <div className="text-center py-16">
              <span
                className="material-symbols-outlined text-[48px] text-border-strong mb-3 block"
                aria-hidden="true"
              >
                explore
              </span>
              <p className="text-text-secondary text-sm text-balance">
                No hay resúmenes semanales aún
              </p>
            </div>
          ) : null}

          {/* Listen all button */}
          {packs.length > 0 && (
            <button
              onClick={playAll}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-primary text-white font-medium text-sm mb-4"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                play_arrow
              </span>
              Escuchar Todo el Resumen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
