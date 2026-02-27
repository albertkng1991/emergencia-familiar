import { Route, Routes } from "react-router-dom";
import PackList from "./components/PackList";
import PackPlayer from "./components/PackPlayer";

export default function App() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Daily Audio Digest</h1>
        <p className="text-gray-400 text-sm mt-1">
          Tu briefing diario de noticias en audio
        </p>
      </header>
      <Routes>
        <Route path="/" element={<PackList />} />
        <Route path="/pack/:id" element={<PackPlayer />} />
      </Routes>
    </div>
  );
}
