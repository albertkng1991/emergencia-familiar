import { NavLink } from "react-router-dom";
import { useAudio } from "../contexts/AudioContext";
import { useQueue } from "../contexts/QueueContext";

function TabContent({
  icon,
  label,
  active,
  badge,
  badgeBounce,
  tabRef,
}: {
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  badgeBounce?: boolean;
  tabRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full rounded-xl transition-colors ${
        active ? "bg-black/[0.07] text-primary" : "text-text-secondary"
      }`}
    >
      <div ref={tabRef} className="relative flex items-center justify-center h-7">
        <span
          className="material-symbols-outlined text-[24px] leading-none"
          aria-hidden="true"
          style={{
            fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {icon}
        </span>
        {badge != null && badge > 0 && (
          <span
            className={`absolute -top-1 -right-3.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-0.5 ${
              badgeBounce ? "animate-badge-pop" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold leading-none mt-0.5">{label}</span>
    </div>
  );
}

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

  const colaActive = playerView !== "mini";

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4"
      style={{ paddingBottom: `calc(var(--nav-pill-gap) + var(--safe-bottom))` }}
    >
      <div
        className="glass-nav flex rounded-2xl touch-none"
        style={{ height: "var(--nav-pill-height)" }}
      >
        <NavLink to="/" end onClick={handleTabClick} className="flex-1 p-1.5">
          {({ isActive }) => (
            <TabContent icon="newspaper" label="Noticias" active={isActive && !colaActive} />
          )}
        </NavLink>

        <NavLink to="/resumenes" onClick={handleTabClick} className="flex-1 p-1.5">
          {({ isActive }) => (
            <TabContent icon="summarize" label="Resúmenes" active={isActive && !colaActive} />
          )}
        </NavLink>

        <button
          onClick={handleColaClick}
          aria-label={
            bagCount > 0 ? `Cola, ${bagCount} ${bagCount === 1 ? "historia" : "historias"}` : "Cola"
          }
          className="flex-1 p-1.5"
        >
          <TabContent
            icon="queue_music"
            label="Cola"
            active={colaActive}
            badge={bagCount}
            badgeBounce={queue.badgeBounce}
            tabRef={queue.colaTabRef}
          />
        </button>

        <NavLink to="/escuchados" onClick={handleTabClick} className="flex-1 p-1.5">
          {({ isActive }) => (
            <TabContent icon="history" label="Historial" active={isActive && !colaActive} />
          )}
        </NavLink>

        <NavLink to="/settings" onClick={handleTabClick} className="flex-1 p-1.5">
          {({ isActive }) => (
            <TabContent icon="person" label="Perfil" active={isActive && !colaActive} />
          )}
        </NavLink>
      </div>
    </nav>
  );
}
