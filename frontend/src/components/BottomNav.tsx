import { NavLink } from "react-router-dom";
import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";

const navTabs: { to: string; icon: string; label: string; end?: boolean }[] = [
  { to: "/", icon: "newspaper", label: "Hoy", end: true },
  { to: "/escuchados", icon: "history", label: "Escuchados" },
  { to: "/settings", icon: "person", label: "Ajustes" },
];

export default function BottomNav() {
  const queue = useQueue();
  const { playerView, setPlayerView } = useAudio();
  const bagCount = queue.bag.length;

  const handleTabClick = () => {
    if (playerView !== "mini") setPlayerView("mini");
  };

  const handleColaClick = () => {
    setPlayerView("full");
  };

  const colaActive = playerView === "full";

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-border bg-white/80 backdrop-blur-lg z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {/* Hoy */}
        <NavLink
          to={navTabs[0].to}
          end={navTabs[0].end}
          onClick={handleTabClick}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
              isActive && !colaActive ? "text-primary" : "text-text-secondary"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined text-[22px]"
                aria-hidden="true"
                style={{
                  fontVariationSettings: isActive && !colaActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {navTabs[0].icon}
              </span>
              <span className="text-[10px] font-medium">{navTabs[0].label}</span>
            </>
          )}
        </NavLink>

        {/* Cola — button, not a route */}
        <button
          onClick={handleColaClick}
          aria-label={
            bagCount > 0 ? `Cola, ${bagCount} ${bagCount === 1 ? "historia" : "historias"}` : "Cola"
          }
          className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
            colaActive ? "text-primary" : "text-text-secondary"
          }`}
        >
          <div ref={queue.colaTabRef} className="relative">
            <span
              className="material-symbols-outlined text-[22px]"
              aria-hidden="true"
              style={{
                fontVariationSettings: colaActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              queue_music
            </span>
            {bagCount > 0 && (
              <span
                className={`absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-1 ${
                  queue.badgeBounce ? "animate-badge-pop" : ""
                }`}
              >
                {bagCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Cola</span>
        </button>

        {/* Escuchados + Ajustes */}
        {navTabs.slice(1).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end ?? false}
            onClick={handleTabClick}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive && !colaActive ? "text-primary" : "text-text-secondary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[22px]"
                  aria-hidden="true"
                  style={{
                    fontVariationSettings: isActive && !colaActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
