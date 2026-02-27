import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDates, fetchPacks, fetchTopics, searchStories } from "../api/client";
import { useAudio } from "../contexts/AudioContext";
import type { DateInfo, Pack, SearchResult, Story, Topic } from "../types";
import SwipeableStoryCard from "./SwipeableStoryCard";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLongDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff < 7) return `Hace ${diff} días`;
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

type StoryWithTopicPack = Story & { topic: string; pack: Pack };

export default function HomeDaily() {
  const audio = useAudio();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  // Load dates
  useEffect(() => {
    async function loadDates() {
      try {
        const d = await fetchDates("daily");
        setDates(d);
        if (d.length > 0 && !d.some((x) => x.date === todayStr())) {
          setSelectedDate(d[0].date);
        }
      } catch (e) {
        console.error("Failed to load dates:", e);
      }
    }
    loadDates();
  }, []);

  // Load packs
  const loadPacks = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const [packsData, topicsData] = await Promise.all([
        fetchPacks({ type: "daily", topic: activeTopic ?? undefined, date: selectedDate }),
        fetchTopics("daily"),
      ]);
      setPacks(packsData);
      setTopics(topicsData);
    } catch (e) {
      console.error("Failed to load packs:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTopic, selectedDate]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  // Flatten all stories from packs, excluding listened
  const allStories: StoryWithTopicPack[] = useMemo(
    () =>
      packs.flatMap((pack) =>
        (pack.stories ?? []).map((story) => ({ ...story, pack, topic: pack.topic })),
      ),
    [packs],
  );

  // Visible stories: not listened + not dismissed + search filter
  const visibleStories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allStories
      .filter((s) => !audio.isListened(s.id))
      .filter((s) => !dismissed.has(s.id))
      .filter((s) => !query || s.headline.toLowerCase().includes(query));
  }, [allStories, audio, searchQuery, dismissed]);

  // Global search with debounce
  const isSearchActive = searchQuery.trim().length >= 2;

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchAbort.current?.abort();
    const ctrl = new AbortController();
    searchAbort.current = ctrl;

    const timer = setTimeout(async () => {
      try {
        const results = await searchStories(query);
        if (!ctrl.signal.aborted) {
          setSearchResults(results);
          setSearchLoading(false);
        }
      } catch {
        if (!ctrl.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery]);

  // Has mini player?
  const hasMiniPlayer = audio.currentStory !== null;

  const handleDismiss = useCallback((storyId: number) => {
    setDismissed((prev) => new Set(prev).add(storyId));
  }, []);

  return (
    <div className={hasMiniPlayer ? "pb-32" : "pb-20"}>
      {/* Masthead */}
      <header className="px-5 pt-8 pb-5 border-b border-border">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight lowercase">
            onda<span className="text-primary">.</span>
          </h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50">
            audio
          </span>
        </div>
        <p className="font-display italic text-text-secondary text-sm mt-0.5">
          {capitalize(formatLongDate(selectedDate))}
        </p>
      </header>
      <div className="h-0.5 brand-accent" />

      {/* Search bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="relative">
          <span
            className="material-symbols-outlined text-[20px] text-text-secondary absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="text"
            placeholder="Buscar noticias..."
            aria-label="Buscar noticias"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm placeholder:text-text-secondary/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined text-[18px] text-text-secondary">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Date pills — hidden during search */}
      {!isSearchActive && dates.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide">
          {dates.map((d) => {
            const isSelected = d.date === selectedDate;
            const label = (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const [y, m, dy] = d.date.split("-").map(Number);
              const dt = new Date(y, m - 1, dy);
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              if (dt.getTime() === today.getTime()) return "Hoy";
              if (dt.getTime() === yesterday.getTime()) return "Ayer";
              return dt.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
            })();
            return (
              <button
                key={d.date}
                onClick={() => {
                  setSelectedDate(d.date);
                  setActiveTopic(null);
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
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

      {/* Topic chips — hidden during search */}
      {!isSearchActive && topics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-5 pb-4 scrollbar-hide">
          <button
            onClick={() => setActiveTopic(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTopic === null
                ? "bg-primary text-white"
                : "border border-border-strong text-text-secondary hover:bg-muted"
            }`}
          >
            Todas
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

      {/* Section header */}
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-balance">
          {isSearchActive ? "Resultados" : "Edición de Hoy"}
        </h2>
        <span className="text-xs text-text-secondary tabular-nums">
          {isSearchActive
            ? `${searchResults.length} ${searchResults.length === 1 ? "resultado" : "resultados"}`
            : `${visibleStories.length} ${visibleStories.length === 1 ? "historia" : "historias"}`}
        </span>
      </div>

      {/* Article list */}
      <div className="px-5">
        {isSearchActive ? (
          // ── Global search results ──
          searchLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="size-20 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              {searchResults.map((story, i) => {
                const prevDate = i > 0 ? searchResults[i - 1].date : null;
                const showDateHeader = story.date !== prevDate;
                const progress = audio.getProgress(story.id);
                return (
                  <div key={story.id}>
                    {showDateHeader && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mt-3 mb-1">
                        {relativeDate(story.date)}
                      </p>
                    )}
                    <SwipeableStoryCard
                      story={story}
                      progress={progress}
                      isLast={i === searchResults.length - 1}
                      onDismiss={handleDismiss}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <span
                className="material-symbols-outlined text-[48px] text-border-strong mb-3 block"
                aria-hidden="true"
              >
                search_off
              </span>
              <p className="text-text-secondary text-sm text-balance">
                No se encontraron resultados para &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-text-secondary/60 text-xs text-pretty mt-1">
                Prueba con otro término de búsqueda
              </p>
            </div>
          )
        ) : loading ? (
          // ── Today's stories loading ──
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="size-20 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleStories.length > 0 ? (
          <div>
            {visibleStories.map((story, i) => {
              const progress = audio.getProgress(story.id);
              return (
                <SwipeableStoryCard
                  key={story.id}
                  story={story}
                  progress={progress}
                  isLast={i === visibleStories.length - 1}
                  onDismiss={handleDismiss}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <span
              className="material-symbols-outlined text-[48px] text-border-strong mb-3 block"
              aria-hidden="true"
            >
              newspaper
            </span>
            <p className="text-text-secondary text-sm text-balance">
              {activeTopic
                ? `No hay historias de "${activeTopic}" hoy`
                : "No hay historias para hoy"}
            </p>
            <p className="text-text-secondary/60 text-xs text-pretty mt-1">
              Las historias se generan automáticamente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
