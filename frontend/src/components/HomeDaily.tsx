import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDates, fetchPacks, fetchTopics, searchStories } from "../api/client";
import { useAudio } from "../contexts/AudioContext";
import type { DateInfo, Pack, SearchResult, Story, Topic } from "../types";
import SwipeableStoryCard from "./SwipeableStoryCard";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

type DatePeriod = "today" | "yesterday" | "this_week" | "this_month";

function isInPeriod(dateStr: string, period: DatePeriod): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return dt.getTime() === now.getTime();
    case "yesterday": {
      const yday = new Date(now);
      yday.setDate(yday.getDate() - 1);
      return dt.getTime() === yday.getTime();
    }
    case "this_week": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      return dt >= monday && dt <= now;
    }
    case "this_month": {
      return (
        dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() && dt <= now
      );
    }
  }
}

function countStoriesInPeriod(dates: DateInfo[], period: DatePeriod): number {
  return dates.filter((d) => isInPeriod(d.date, period)).reduce((sum, d) => sum + d.count, 0);
}

const PERIOD_LABELS: Record<DatePeriod, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  this_week: "Esta semana",
  this_month: "Este mes",
};

const PERIOD_TITLES: Record<DatePeriod, string> = {
  today: "Edición de Hoy",
  yesterday: "Edición de Ayer",
  this_week: "Esta Semana",
  this_month: "Este Mes",
};

type StoryWithTopicPack = Story & { topic: string; pack: Pack };

export default function HomeDaily() {
  const audio = useAudio();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>("today");
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
          setSelectedPeriod("yesterday");
        }
      } catch (e) {
        console.error("Failed to load dates:", e);
      }
    }
    loadDates();
  }, []);

  // Load packs — single day for today/yesterday, all packs for week/month
  const loadPacks = useCallback(async () => {
    setLoading(true);
    try {
      const isSingleDay = selectedPeriod === "today" || selectedPeriod === "yesterday";
      const date = isSingleDay
        ? selectedPeriod === "today"
          ? todayStr()
          : yesterdayStr()
        : undefined;
      const [packsData, topicsData] = await Promise.all([
        fetchPacks({ type: "daily", topic: activeTopic ?? undefined, date }),
        fetchTopics("daily"),
      ]);
      setPacks(packsData);
      setTopics(topicsData);
    } catch (e) {
      console.error("Failed to load packs:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTopic, selectedPeriod]);

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

  // Visible stories: period filter + not listened + not dismissed + search filter
  const visibleStories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allStories
      .filter((s) => isInPeriod(s.pack.date, selectedPeriod))
      .filter((s) => !audio.isListened(s.id))
      .filter((s) => !dismissed.has(s.id))
      .filter((s) => !query || s.headline.toLowerCase().includes(query));
  }, [allStories, audio, searchQuery, dismissed, selectedPeriod]);

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

  // ── Pull-to-refresh ──
  const pullStartY = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const scrollEl = document.getElementById("app-scroll");
    if (!scrollEl) return;

    const onStart = (e: TouchEvent) => {
      if (scrollEl.scrollTop <= 0 && !isRefreshing) {
        pullStartY.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta > 0 && scrollEl.scrollTop <= 0) {
        e.preventDefault();
        const damped = Math.min(delta * 0.45, 80);
        pullDistRef.current = damped;
        setPullDistance(damped);
      } else {
        isPullingRef.current = false;
        pullDistRef.current = 0;
        setPullDistance(0);
      }
    };

    const onEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      const dist = pullDistRef.current;
      pullDistRef.current = 0;
      if (dist > 50) {
        setIsRefreshing(true);
        setPullDistance(44);
        loadPacks().finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
      }
    };

    scrollEl.addEventListener("touchstart", onStart, { passive: true });
    scrollEl.addEventListener("touchmove", onMove, { passive: false });
    scrollEl.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", onStart);
      scrollEl.removeEventListener("touchmove", onMove);
      scrollEl.removeEventListener("touchend", onEnd);
    };
  }, [loadPacks, isRefreshing]);

  return (
    <div
      style={{
        paddingBottom: hasMiniPlayer ? "var(--content-bottom-mini)" : "var(--content-bottom)",
      }}
    >
      {/* Sticky search header — extends behind status bar */}
      <header
        className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg px-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
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
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-muted text-sm placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          <Link
            to="/settings"
            className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0"
            aria-label="Ajustes"
          >
            <span
              className="material-symbols-outlined text-[20px] text-text-secondary"
              aria-hidden="true"
            >
              person
            </span>
          </Link>
        </div>
      </header>

      {/* Pull-to-refresh indicator — below sticky header so it's visible */}
      <div
        className="flex justify-center items-center overflow-hidden"
        style={{
          height: isRefreshing ? 44 : pullDistance,
          transition: isPullingRef.current ? "none" : "height 250ms ease-out",
        }}
      >
        <span
          className={`material-symbols-outlined text-[22px] text-primary ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={
            isRefreshing
              ? undefined
              : {
                  transform: `rotate(${pullDistance * 4}deg)`,
                  opacity: Math.min(pullDistance / 40, 1),
                }
          }
        >
          refresh
        </span>
      </div>

      {/* Period pills — hidden during search */}
      {!isSearchActive && (
        <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide">
          {(["today", "yesterday", "this_week", "this_month"] as DatePeriod[]).map((period) => {
            const isSelected = period === selectedPeriod;
            const count = countStoriesInPeriod(dates, period);
            return (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);
                  setActiveTopic(null);
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-muted text-text-secondary hover:bg-muted-hover"
                }`}
              >
                {PERIOD_LABELS[period]}
                {count > 0 && <span className="ml-1 tabular-nums opacity-60">{count}</span>}
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
          {isSearchActive ? "Resultados" : PERIOD_TITLES[selectedPeriod]}
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
                ? `No hay historias de "${activeTopic}" para este período`
                : "No hay historias para este período"}
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
