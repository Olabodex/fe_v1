import { Check, Lock, Minus, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { useApp } from "../AppContext";
import { SHOWCASE_MODE } from "../config";
import { PASS_TYPE_NAMES, PHASE_SUPPLIES } from "../contracts";
import type { OwnedPass } from "../types";
import { eth, phaseLabels, phaseSubtitles } from "../utils";
import { ActionButton, Section } from "./ui";

export function MintPage() {
  const {
    account,
    stats,
    quantity,
    setQuantity,
    ownedPasses,
    phaseOnePass,
    phaseFourPasses,
    inventoryLoading,
    activePrice,
    isEthereumMainnet,
    activePhase,
    claimInitialPass,
    mintWorlds,
  } = useApp();
  const claimLocked = !stats?.claimActive;
  const canMint =
    account &&
    isEthereumMainnet &&
    stats &&
    !stats.paused &&
    activePhase !== 0 &&
    (activePhase !== 1 || phaseOnePass) &&
    (activePhase !== 4 || phaseFourPasses.length >= quantity);

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
          {[1, 2, 3, 4].map((phase) => (
            <PhaseCard
              key={phase}
              phase={phase}
              active={activePhase === phase}
              locked={activePhase !== phase}
              minted={stats?.phaseMinted[phase - 1] ?? 0n}
              price={stats?.phasePrices[phase - 1] ?? 0n}
              eligible={(phase === 1 && Boolean(phaseOnePass)) || (phase === 4 && phaseFourPasses.length > 0)}
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
            {activePhase === 4 && phaseFourPasses.length > 0 && `Using ${phaseFourPasses.length} reward pass${phaseFourPasses.length > 1 ? "es" : ""}.`}
            {activePhase === 0 && "Minting is currently locked."}
          </p>
          <ActionButton full disabled={SHOWCASE_MODE || !canMint} onClick={mintWorlds}>
            {SHOWCASE_MODE ? "Mint Preview Closed" : `Mint ${quantity} World${quantity > 1 ? "s" : ""} for ${eth(activePrice * BigInt(quantity))}`}
          </ActionButton>
        </div>
      </Section>
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

function PhaseCard({
  phase,
  active,
  locked,
  minted,
  price,
  eligible,
}: {
  phase: number;
  active: boolean;
  locked: boolean;
  minted: bigint;
  price: bigint;
  eligible: boolean;
}) {
  const supply = PHASE_SUPPLIES[phase];
  const progress = Math.min(100, (Number(minted) / supply) * 100);
  return (
    <article className={`phase-card phase-tone-${phase} ${active ? "active" : ""} ${locked ? "phase-locked" : ""}`}>
      <div className="phase-art">{phase === 4 ? <Moon size={34} /> : <Sun size={34} />}</div>
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
