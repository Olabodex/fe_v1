import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { AppProvider, useApp } from "./AppContext";
import { SHOWCASE_MODE } from "./config";
import { Atmosphere } from "./components/Atmosphere";
import { GallerySidebar } from "./components/GallerySidebar";
import { Header } from "./components/Header";
import { RecentActivityToast } from "./components/RecentActivityToast";
import { StatsBar } from "./components/StatsBar";
import { StatusToast } from "./components/StatusToast";
import "./styles.css";

const AdminPage = lazy(() => import("./components/AdminPage").then((module) => ({ default: module.AdminPage })));
const MarketplacePage = lazy(() => import("./components/MarketplacePage").then((module) => ({ default: module.MarketplacePage })));
const MintPage = lazy(() => import("./components/MintPage").then((module) => ({ default: module.MintPage })));
const WhitepaperPage = lazy(() => import("./components/WhitepaperPage").then((module) => ({ default: module.WhitepaperPage })));

function AppShell() {
  const { activePhase, status, clearStatus, stats, openGallery, recentActivities, dismissRecentActivity } = useApp();

  return (
    <main className={`app phase-${activePhase || 0} ${activePhase === 4 ? "night" : ""}`} data-phase={activePhase || 0}>
      <Atmosphere phase={activePhase} />
      <Header />
      <RecentActivityToast activity={recentActivities[0]} onDone={dismissRecentActivity} />
      <StatusToast status={status} onClose={clearStatus} />
      <StatsBar />

      <Suspense fallback={<div className="route-loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<MintPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/whitepaper" element={<WhitepaperPage />} />
          {!SHOWCASE_MODE && <Route path="/adminofforgottenworld" element={<AdminPage />} />}
        </Routes>
      </Suspense>

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
