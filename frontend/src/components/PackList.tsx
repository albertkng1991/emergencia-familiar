import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPacks, generatePack } from "../api/client";
import type { Pack } from "../types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PackList() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("IA");

  const loadPacks = useCallback(async () => {
    try {
      const data = await fetchPacks();
      setPacks(data);
    } catch (e) {
      console.error("Failed to load packs:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generatePack(topic);
      await loadPacks();
    } catch (e) {
      console.error("Generation failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Generate controls */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Tema..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {generating ? "Generando..." : "Generar pack"}
        </button>
      </div>

      {/* Pack list */}
      {loading ? (
        <p className="text-gray-500 text-center py-12">Cargando...</p>
      ) : packs.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay packs todavia. Genera el primero!</p>
      ) : (
        <div className="space-y-3">
          {packs.map((pack) => (
            <Link
              key={pack.id}
              to={`/pack/${pack.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{pack.topic}</span>
                  <span className="text-gray-500 text-sm ml-3">{pack.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{pack.story_count} noticias</span>
                  {pack.total_duration > 0 && (
                    <span className="text-gray-500 text-sm">
                      {formatDuration(pack.total_duration)}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      pack.status === "ready"
                        ? "bg-green-900/50 text-green-400"
                        : pack.status === "generating"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {pack.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
