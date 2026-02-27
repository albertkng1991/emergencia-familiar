import { Route, Routes } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Escuchados from "./components/Escuchados";
import FlyAnimationLayer from "./components/FlyAnimationLayer";
import FullPlayer from "./components/FullPlayer";
import HomeDaily from "./components/HomeDaily";
import MiniPlayer from "./components/MiniPlayer";
import SettingsPage from "./components/SettingsPage";
import { AudioProvider } from "./contexts/AudioContext";
import { QueueProvider } from "./contexts/QueueContext";

export default function App() {
  return (
    <AudioProvider>
      <QueueProvider>
        <div className="relative max-w-md mx-auto min-h-dvh bg-white shadow-warm-lg">
          <Routes>
            <Route path="/" element={<HomeDaily />} />
            <Route path="/escuchados" element={<Escuchados />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          <MiniPlayer />
          <BottomNav />
          <FullPlayer />
          <FlyAnimationLayer />
        </div>
      </QueueProvider>
    </AudioProvider>
  );
}
