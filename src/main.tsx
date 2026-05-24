import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { AppProvider, useApp } from "./AppContext";
import { AdminPage } from "./components/AdminPage";
import { Atmosphere } from "./components/Atmosphere";
import { GallerySidebar } from "./components/GallerySidebar";
import { Header } from "./components/Header";
import { MarketplacePage } from "./components/MarketplacePage";
import { MintPage } from "./components/MintPage";
import { StatsBar } from "./components/StatsBar";
import { StatusToast } from "./components/StatusToast";
import "./styles.css";

function AppShell() {
  const { activePhase, status, clearStatus, stats, openGallery } = useApp();

  return (
    <main className={`app phase-${activePhase || 0} ${activePhase === 4 ? "night" : ""}`} data-phase={activePhase || 0}>
      <Atmosphere phase={activePhase} />
      <Header />
      <StatusToast status={status} onClose={clearStatus} />
      <StatsBar />

      <Routes>
        <Route path="/" element={<MintPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/adminofforgottenworld" element={<AdminPage />} />
      </Routes>

      <button className="gallery-float" type="button" onClick={openGallery}>
        <Globe2 size={17} />
        Worlds minted: {String(stats?.totalMinted ?? 0n)}
      </button>

      <GallerySidebar />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>,
);
