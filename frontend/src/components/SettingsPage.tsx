import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchApiKeys, fetchTopics, saveApiKeys, testApiKeys } from "../api/client";
import type { ApiKeysConfig, KeyTestResult, Topic } from "../types";

type KeyStatus = "ok" | "error" | "testing" | "unconfigured";

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

/* ── Status dot for API keys ────────────────────── */
function StatusDot({ status }: { status: KeyStatus }) {
  const colors: Record<KeyStatus, string> = {
    ok: "bg-green-500",
    error: "bg-red-500",
    testing: "bg-yellow-500 animate-pulse",
    unconfigured: "bg-gray-300",
  };
  return (
    <span
      className={`inline-block size-2 rounded-full shrink-0 ${colors[status]}`}
      title={status}
    />
  );
}

export default function SettingsPage() {
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

  // API keys
  const [apiConfig, setApiConfig] = useState<ApiKeysConfig | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [keyStatuses, setKeyStatuses] = useState<Record<string, KeyStatus>>({});
  const [saving, setSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

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

  // Load API keys
  const loadApiKeys = useCallback(async () => {
    try {
      const data = await fetchApiKeys();
      setApiConfig(data);
      const vals: Record<string, string> = {};
      const sts: Record<string, KeyStatus> = {};
      for (const group of data.groups) {
        for (const key of group.keys) {
          vals[key.env_var] = key.value ?? "";
          sts[key.env_var] = key.has_value ? "ok" : "unconfigured";
        }
      }
      setKeyValues(vals);
      setKeyStatuses(sts);
    } catch (e) {
      console.error("Failed to load API keys:", e);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      await saveApiKeys(keyValues);
      await loadApiKeys();
    } finally {
      setSaving(false);
    }
  };

  const handleTestAll = async () => {
    setKeyStatuses((prev) => {
      const next = { ...prev };
      for (const k in next) {
        if (next[k] !== "unconfigured") next[k] = "testing";
      }
      return next;
    });
    try {
      const results: Record<string, KeyTestResult> = await testApiKeys();
      setKeyStatuses((prev) => {
        const next = { ...prev };
        for (const [k, r] of Object.entries(results)) {
          if (!keyValues[k] && !r.ok) {
            next[k] = "unconfigured";
          } else {
            next[k] = r.ok ? "ok" : "error";
          }
        }
        return next;
      });
    } catch {
      // keep current statuses
    }
  };

  const handleTestOne = async (envVar: string) => {
    setKeyStatuses((prev) => ({ ...prev, [envVar]: "testing" }));
    try {
      const results: Record<string, KeyTestResult> = await testApiKeys(envVar);
      const r = results[envVar];
      setKeyStatuses((prev) => ({
        ...prev,
        [envVar]: r?.ok ? "ok" : "error",
      }));
    } catch {
      setKeyStatuses((prev) => ({ ...prev, [envVar]: "error" }));
    }
  };

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
    <div className="pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-4 h-14">
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
      <Section title="Temas de interés">
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
            : ["Tecnología", "Política", "Economía", "Deportes", "Ciencia", "Salud"].map((name) => (
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
            { id: "natural-2", label: "Natural (Masculina)", desc: "Cálida y conversacional" },
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
      <Section title="Duración objetivo">
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
            aria-label="Duración objetivo en minutos"
          />
        </div>
      </Section>

      {/* Account */}
      <Section title="Cuenta y suscripción">
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
            Gestionar suscripción
          </button>
          <button className="w-full text-center py-2.5 text-sm text-text-secondary hover:text-primary transition-colors">
            Cerrar sesión
          </button>
        </div>
      </Section>

      {/* API Keys (collapsible) */}
      <section className="px-5 py-5">
        <button
          onClick={() => setShowApiKeys(!showApiKeys)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="font-display font-bold text-base text-balance">API Keys</h2>
          <span
            className="material-symbols-outlined text-[20px] text-text-secondary"
            aria-hidden="true"
          >
            {showApiKeys ? "expand_less" : "expand_more"}
          </span>
        </button>

        {showApiKeys && apiConfig && (
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleTestAll}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-hover transition-colors"
              >
                Test All
              </button>
              <button
                onClick={handleSaveKeys}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {apiConfig.groups.map((group) => (
              <div key={group.id}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.keys.map((key) => (
                    <div key={key.env_var} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusDot status={keyStatuses[key.env_var] ?? "unconfigured"} />
                        <label className="text-sm font-medium">{key.label}</label>
                        {key.url && (
                          <a
                            href={key.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline ml-auto"
                          >
                            Obtener key
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type={key.secret ? "password" : "text"}
                          value={keyValues[key.env_var] ?? ""}
                          placeholder={key.placeholder ?? ""}
                          onChange={(e) =>
                            setKeyValues((prev) => ({ ...prev, [key.env_var]: e.target.value }))
                          }
                          className="flex-1 rounded-lg border border-border bg-hover px-3 py-2 text-sm placeholder-text-secondary/50 focus:border-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleTestOne(key.env_var)}
                          className="shrink-0 px-3 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-muted"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
