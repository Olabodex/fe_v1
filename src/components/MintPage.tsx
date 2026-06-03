import { useEffect, useRef, useState, type Ref } from "react";
import { Check, Download, Image, Lock, Minus, Moon, Plus, Sparkles, Sun, X } from "lucide-react";
import { useApp } from "../AppContext";
import { SHOWCASE_MODE } from "../config";
import { ADDRESSES, DISPLAY_PHASE_SUPPLIES, PASS_TYPE_NAMES, PHASE_NAMES, REWARD_TIER_NAMES, VISIBLE_MINT_PHASES } from "../contracts";
import type { NftItem, OwnedPass } from "../types";
import { eth, phaseLabels, phaseSubtitles } from "../utils";
import { ActionButton, Section } from "./ui";

export function MintPage() {
  const [previewNft, setPreviewNft] = useState<NftItem | null>(null);
  const {
    account,
    stats,
    quantity,
    setQuantity,
    ownedPasses,
    ownedNfts,
    phaseOnePass,
    inventoryLoading,
    activePrice,
    isEthereumMainnet,
    activePhase,
    claimInitialPass,
    mintWorlds,
  } = useApp();
  const activeCardRef = useRef<HTMLElement | null>(null);
  const claimLocked = !stats?.claimActive;
  const activePhaseVisible = VISIBLE_MINT_PHASES.some((phase) => phase === activePhase);
  const canMint =
    account &&
    isEthereumMainnet &&
    stats &&
    !stats.paused &&
    activePhase !== 0 &&
    activePhaseVisible &&
    (activePhase !== 1 || phaseOnePass);

  useEffect(() => {
    if (!activePhaseVisible || !activeCardRef.current || !window.matchMedia("(max-width: 720px)").matches) return;
    activeCardRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activePhase, activePhaseVisible]);

  return (
    <div className="page-shell">
      {SHOWCASE_MODE && (
        <div className="preview-banner">
          <strong>Preview mode</strong>
          <span>Wallet access is closed for now. You can view the mint structure, phases, and live collection state before the public flow opens.</span>
        </div>
      )}
      <Section title="Dawn - Pass Claim" icon={claimLocked ? <Lock size={20} /> : <Sun size={20} />} locked={claimLocked} note="Claim window has closed." className="claim-card">
        <div className="claim-layout">
          <div>
            <p>Initial passes claimed</p>
            <strong>{stats ? `${stats.initialPassMinted}/${stats.initialPassSupply}` : "..."}</strong>
            <span>{SHOWCASE_MODE ? "Claim access will open when the mint flow is ready." : account ? "Wallet eligibility is checked when you claim." : "Connect wallet to check eligibility."}</span>
          </div>
          <ActionButton disabled={SHOWCASE_MODE || !account || !isEthereumMainnet || !stats?.claimActive} onClick={claimInitialPass}>
            <Check size={17} />
            {SHOWCASE_MODE ? "Preview Only" : "Claim Initial Pass"}
          </ActionButton>
        </div>
      </Section>

      <div className="sun-rule"><Sun size={18} /></div>

      <Section title="Mint Worlds" icon={<Sparkles size={20} />}>
        <PassStrip passes={ownedPasses} loading={inventoryLoading} preview={SHOWCASE_MODE} />
        <div className="phase-card-grid">
          {VISIBLE_MINT_PHASES.map((phase) => (
            <PhaseCard
              key={phase}
              phase={phase}
              cardRef={activePhase === phase ? activeCardRef : undefined}
              active={activePhase === phase}
              locked={activePhase !== phase}
              minted={stats?.phaseMinted[phase - 1] ?? 0n}
              price={stats?.phasePrices[phase - 1] ?? 0n}
              eligible={phase === 1 && Boolean(phaseOnePass)}
            />
          ))}
        </div>

        <div className="mint-box">
          <div className="stepper" aria-label="Quantity">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
            <strong>{quantity}</strong>
            <button type="button" onClick={() => setQuantity(Math.min(3, quantity + 1))}><Plus size={18} /></button>
          </div>
          <p className="context-line">
            {activePhase === 1 && phaseOnePass && `Using 1 Phase 1 pass #${phaseOnePass.id}.`}
            {(activePhase === 0 || !activePhaseVisible) && "Minting is currently locked."}
          </p>
          <ActionButton full disabled={SHOWCASE_MODE || !canMint} onClick={mintWorlds}>
            {SHOWCASE_MODE ? "Mint Preview Closed" : `Mint ${quantity} World${quantity > 1 ? "s" : ""} for ${eth(activePrice * BigInt(quantity))}`}
          </ActionButton>
        </div>
      </Section>

      <Section title="Your Worlds" icon={<Image size={20} />}>
        <NftMiniGallery nfts={ownedNfts} loading={inventoryLoading} account={account} onSelect={setPreviewNft} />
      </Section>

      {previewNft && <NftPreviewModal nft={previewNft} onClose={() => setPreviewNft(null)} />}
    </div>
  );
}

function PassStrip({ passes, loading, preview }: { passes: OwnedPass[]; loading: boolean; preview?: boolean }) {
  return (
    <div className="pass-strip">
      <span>{preview ? "Pass access preview" : loading ? "Detecting wallet passes..." : "Detected passes"}</span>
      {passes.length === 0 && <em>{preview ? "Wallet detection is closed" : "No passes found"}</em>}
      {passes.map((pass) => (
        <button type="button" key={String(pass.id)}>
          {PASS_TYPE_NAMES[pass.passType].replace("Phase ", "P")} #{String(pass.id)}
        </button>
      ))}
    </div>
  );
}

function NftMiniGallery({
  nfts,
  loading,
  account,
  onSelect,
}: {
  nfts: NftItem[];
  loading: boolean;
  account: string;
  onSelect: (nft: NftItem) => void;
}) {
  return (
    <div className="owned-worlds">
      <div className="owned-worlds-header">
        <span>{account ? (loading ? "Refreshing your worlds..." : `${nfts.length} owned`) : "Connect wallet to view your worlds"}</span>
        <strong>{nfts.length > 0 ? "Tap a world to inspect it live" : "No worlds detected"}</strong>
      </div>
      {nfts.length === 0 ? (
        <div className="empty-state owned-worlds-empty">
          <span>{account ? "Minted NFTs will show here after your wallet inventory refreshes." : "Your minted NFTs will appear here after connecting."}</span>
        </div>
      ) : (
        <div className="owned-world-grid">
          {nfts.map((nft) => (
            <article className="owned-world-tile" key={String(nft.id)}>
              <button type="button" className="owned-world-preview-button" onClick={() => onSelect(nft)}>
                <NftArtwork nft={nft} />
                <span>{nft.name ?? `World #${String(nft.id)}`}</span>
              </button>
              <a className="opensea-token-link" href={openSeaTokenUrl(nft.id)} target="_blank" rel="noreferrer">
                <img src="/opensea-white-logo.svg" alt="" />
                OpenSea
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NftPreviewModal({ nft, onClose }: { nft: NftItem; onClose: () => void }) {
  const canDownload = Boolean(nft.image);

  return (
    <div className="nft-preview-overlay" role="dialog" aria-modal="true" aria-label={nft.name ?? `World #${String(nft.id)}`} onClick={onClose}>
      <div className="nft-preview-panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="nft-preview-close" onClick={onClose} aria-label="Close NFT preview">
          <X size={18} />
        </button>
        <div className="nft-preview-art">
          <NftArtwork nft={nft} live />
        </div>
        <div className="nft-preview-meta">
          <strong>{nft.name ?? `World #${String(nft.id)}`}</strong>
          <span>{PHASE_NAMES[nft.phase]} - {REWARD_TIER_NAMES[nft.rewardTier]}</span>
          <button type="button" className="nft-download-button" disabled={!canDownload} onClick={() => void downloadNftPng(nft)}>
            <Download size={16} />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

async function downloadNftPng(nft: NftItem) {
  if (!nft.image) return;
  const image = await loadImageForDownload(nft.image);
  const size = Math.max(image.naturalWidth, image.naturalHeight, 1024);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(nft.name ?? `forgotten-world-${String(nft.id)}`)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadImageForDownload(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fileSafeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "forgotten-world";
}

function openSeaTokenUrl(id: bigint) {
  return `https://opensea.io/item/ethereum/${ADDRESSES.nft.toLowerCase()}/${String(id)}`;
}

function NftArtwork({ nft, live }: { nft: NftItem; live?: boolean }) {
  if (!nft.image) return <div className="image-fallback">#{String(nft.id)}</div>;
  const isSvg = nft.image.startsWith("data:image/svg+xml") || nft.image.toLowerCase().includes(".svg");
  if (live && isSvg) {
    return <iframe className="nft-live-frame" title={nft.name ?? `World #${String(nft.id)}`} src={nft.image} sandbox="" />;
  }
  return <img src={nft.image} alt={nft.name ?? `World #${String(nft.id)}`} />;
}

function PhaseCard({
  phase,
  cardRef,
  active,
  locked,
  minted,
  price,
  eligible,
}: {
  phase: number;
  cardRef?: Ref<HTMLElement>;
  active: boolean;
  locked: boolean;
  minted: bigint;
  price: bigint;
  eligible: boolean;
}) {
  const supply = DISPLAY_PHASE_SUPPLIES[phase];
  const progress = Math.min(100, (Number(minted) / supply) * 100);
  const tonePhase = phase === 3 ? 4 : phase;
  return (
    <article ref={cardRef} className={`phase-card phase-tone-${tonePhase} ${active ? "active" : ""} ${locked ? "phase-locked" : ""}`}>
      <div className="phase-art">{tonePhase === 4 ? <Moon size={34} /> : <Sun size={34} />}</div>
      <span>{phaseLabels[phase]}</span>
      <h3>{phaseSubtitles[phase]}</h3>
      <div className="progress"><i style={{ width: `${progress}%` }} /></div>
      <p>{String(minted)} / {supply}</p>
      <strong>{eth(price)}</strong>
      {eligible && <b>{phase === 4 ? "Reward passes eligible" : "Phase 1 pass eligible"}</b>}
      {locked && <div className="card-lock"><Lock size={26} /></div>}
    </article>
  );
}
