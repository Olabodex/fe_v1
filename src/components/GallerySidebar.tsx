import { X } from "lucide-react";
import { useApp } from "../AppContext";
import { PHASE_NAMES, REWARD_TIER_NAMES } from "../contracts";
import { shortAddress } from "../utils";

export function GallerySidebar() {
  const { galleryOpen, galleryNfts, galleryLoading, stats, closeGallery } = useApp();

  return (
    <div className={`gallery-overlay ${galleryOpen ? "open" : ""}`} onClick={closeGallery}>
      <aside className={`gallery-sidebar ${galleryOpen ? "open" : ""}`} onClick={(event) => event.stopPropagation()}>
        <button className="gallery-close" type="button" onClick={closeGallery}><X size={18} /></button>
        <div className="gallery-title">
          <h2>Minted Worlds</h2>
          <span><i className="state-dot live" /> Refreshes while open</span>
          <strong>Total {String(stats?.totalMinted ?? 0n)}</strong>
        </div>
        {galleryLoading && <p className="helper">Refreshing gallery...</p>}
        <div className="gallery-list">
          {!galleryLoading && galleryNfts.length === 0 && (
            <div className="empty-state">
              <strong>No worlds loaded</strong>
              <span>Minted NFTs will appear here once the gallery reads the contract.</span>
            </div>
          )}
          {galleryNfts.map((nft) => (
            <article className={`world-card ${nft.fresh ? "fresh" : ""}`} key={String(nft.id)}>
              {nft.image ? <img src={nft.image} alt={nft.name ?? `World #${nft.id}`} /> : <div className="image-fallback">#{String(nft.id)}</div>}
              <div className="world-meta">
                <strong>{nft.name ?? `World #${String(nft.id)}`}</strong>
                <span>{PHASE_NAMES[nft.phase]} - {REWARD_TIER_NAMES[nft.rewardTier]}</span>
                <small>{shortAddress(nft.owner)}</small>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
