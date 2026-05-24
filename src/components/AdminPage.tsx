import { useState } from "react";
import { ExternalLink, Lock, Pause, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useApp } from "../AppContext";
import { ADDRESSES, REWARD_TIER_NAMES } from "../contracts";
import { eth, shortAddress } from "../utils";
import { ActionButton, Field, Section, SelectField, StepperField } from "./ui";

export function AdminPage() {
  const {
    account,
    isOwner,
    isSepolia,
    statsLoading,
    stats,
    canSubmitAdmin,
    ownerCheckFailed,
    setActivePhase,
    setPhasePrice,
    toggleClaim,
    togglePause,
    setRewardTier: submitRewardTier,
    fundRewardPool,
    finalizeRewards,
    selectWinners,
    lockRewardCounts,
    withdrawRevenue,
    setMaxListPrice,
    setTransferFee,
  } = useApp();
  const [adminPhase, setAdminPhase] = useState("0");
  const [adminPricePhase, setAdminPricePhase] = useState("1");
  const [adminPrice, setAdminPrice] = useState("0.001");
  const [rewardTokenId, setRewardTokenId] = useState("");
  const [rewardTier, setRewardTier] = useState("1");
  const [rewardPoolAmount, setRewardPoolAmount] = useState("0.01");
  const [winnerCount, setWinnerCount] = useState("10");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [marketMaxPrice, setMarketMaxPrice] = useState("0.002");
  const [marketTransferFee, setMarketTransferFee] = useState("0.0002");
  const [confirmAction, setConfirmAction] = useState<"finalize" | "lock" | null>(null);

  return (
    <div className="admin-shell">
      <div className="contract-pills">
        {Object.entries(ADDRESSES).map(([key, value]) => (
          <a href={`https://sepolia.etherscan.io/address/${value}`} key={key} target="_blank" rel="noreferrer">
            {key} <ExternalLink size={13} />
          </a>
        ))}
      </div>

      {(!canSubmitAdmin || ownerCheckFailed) && !statsLoading && (
        <div className="admin-notice">
          <Lock size={34} />
          <strong>{account ? (ownerCheckFailed ? "Owner not verified" : "Admin actions need Sepolia") : "Connect an admin wallet"}</strong>
          <span>
            {account
              ? ownerCheckFailed
                ? `Connected: ${shortAddress(account)}. Contract owner check says this wallet is not an owner.`
                : isSepolia
                  ? `Connected: ${shortAddress(account)}`
                  : "Switch to Sepolia to use admin actions."
              : "Inputs stay editable, but transactions need the owner wallet."}
          </span>
        </div>
      )}

      <Section title="Phase / Price" icon={<Sun size={19} />}>
        <div className="admin-grid">
          <StepperField label="Active phase" value={adminPhase} onChange={setAdminPhase} min={0} max={4} />
          <StepperField label="Price phase" value={adminPricePhase} onChange={setAdminPricePhase} min={1} max={4} />
          <Field label="Price ETH" value={adminPrice} onChange={setAdminPrice} invalid={!Number.isFinite(Number(adminPrice))} />
        </div>
        <div className="button-grid">
          <ActionButton full disabled={!canSubmitAdmin} onClick={() => setActivePhase(adminPhase)}>Set Phase</ActionButton>
          <ActionButton full tone="soft" disabled={!canSubmitAdmin} onClick={() => setPhasePrice(adminPricePhase, adminPrice)}>Set Price</ActionButton>
        </div>
      </Section>

      <Section title="Claim / Pause" icon={<Pause size={19} />}>
        <div className="button-grid">
          <ActionButton full disabled={!canSubmitAdmin} tone={stats?.claimActive ? "soft" : "primary"} onClick={toggleClaim}>
            <span className={stats?.claimActive ? "state-dot live" : "state-dot"} /> Claim: {stats?.claimActive ? "Open" : "Closed"}
          </ActionButton>
          <ActionButton full disabled={!canSubmitAdmin} tone={stats?.paused ? "primary" : "soft"} onClick={togglePause}>
            <span className={stats?.paused ? "state-dot" : "state-dot live"} /> NFT: {stats?.paused ? "Paused" : "Live"}
          </ActionButton>
        </div>
      </Section>

      <Section title="Reward / Pool" icon={<Sparkles size={19} />}>
        <p className="helper">Current pool: {stats ? eth(stats.rewardPoolFunded) : "..."}</p>
        <div className="admin-grid">
          <Field label="Reward token ID" value={rewardTokenId} onChange={setRewardTokenId} />
          <SelectField label="Tier" value={rewardTier} onChange={setRewardTier}>
            {[0, 1, 2, 3].map((tier) => <option key={tier} value={tier}>{tier} - {REWARD_TIER_NAMES[tier]}</option>)}
          </SelectField>
          <Field label="Pool amount ETH" value={rewardPoolAmount} onChange={setRewardPoolAmount} />
        </div>
        <div className="button-grid">
          <ActionButton full disabled={!canSubmitAdmin} onClick={() => submitRewardTier(rewardTokenId, rewardTier)}>Set Tier</ActionButton>
          <ActionButton full tone="soft" disabled={!canSubmitAdmin} onClick={() => fundRewardPool(rewardPoolAmount)}>Fund Pool</ActionButton>
        </div>
      </Section>

      <Section title="P1 Rewards / Withdraw" icon={<ShieldCheck size={19} />}>
        <div className="step-flow">
          <button type="button" disabled={!canSubmitAdmin} onClick={() => setConfirmAction("finalize")}>1. Finalize</button>
          <button type="button" disabled={!canSubmitAdmin} onClick={() => selectWinners(winnerCount)}>2. Select Winners</button>
          <button type="button" disabled={!canSubmitAdmin} onClick={() => setConfirmAction("lock")}>3. Lock Counts</button>
        </div>
        {confirmAction && (
          <div className="confirm-row">
            <span>Confirm: this cannot be undone.</span>
            <button type="button" disabled={!canSubmitAdmin} onClick={confirmAction === "finalize" ? finalizeRewards : lockRewardCounts}>Confirm</button>
            <button type="button" onClick={() => setConfirmAction(null)}>Cancel</button>
          </div>
        )}
        <div className="admin-grid">
          <StepperField label="Winner count" value={winnerCount} onChange={setWinnerCount} min={0} />
          <Field label="Withdraw to" value={withdrawTo} onChange={setWithdrawTo} placeholder={account || "0x..."} />
        </div>
        <ActionButton full tone="danger" disabled={!canSubmitAdmin} onClick={() => withdrawRevenue(withdrawTo)}>Withdraw Revenue</ActionButton>
      </Section>

      <Section title="Marketplace Admin" icon={<ExternalLink size={19} />}>
        <div className="admin-grid">
          <Field label={`Max list ETH (${stats ? eth(stats.maxListingPrice) : "..."})`} value={marketMaxPrice} onChange={setMarketMaxPrice} />
          <Field label={`Transfer fee ETH (${stats ? eth(stats.transferFee) : "..."})`} value={marketTransferFee} onChange={setMarketTransferFee} />
        </div>
        <div className="button-grid">
          <ActionButton full disabled={!canSubmitAdmin} onClick={() => setMaxListPrice(marketMaxPrice)}>Set Max Price</ActionButton>
          <ActionButton full tone="soft" disabled={!canSubmitAdmin} onClick={() => setTransferFee(marketTransferFee)}>Set Transfer Fee</ActionButton>
        </div>
      </Section>

      {isOwner && <span className="sr-only">Admin wallet verified</span>}
    </div>
  );
}
