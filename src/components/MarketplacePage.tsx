import { Moon } from "lucide-react";
import { useApp } from "../AppContext";
import { PASS_TYPE_NAMES, PHASE_NAMES, REWARD_TIER_NAMES } from "../contracts";
import { eth, shortAddress } from "../utils";
import { ActionButton, Field, SelectField } from "./ui";

export function MarketplacePage() {
  const app = useApp();

  return (
    <div className="market-shell">
      <section className="market-column">
        <div className="column-heading"><h2>Listings</h2></div>
        <div className="filter-pills">
          {(["all", "0", "1", "2"] as const).map((item) => (
            <button type="button" className={app.listingFilter === item ? "active" : ""} onClick={() => app.setListingFilter(item)} key={item}>
              {item === "all" ? "All" : PASS_TYPE_NAMES[Number(item)].replace("Phase ", "P")}
            </button>
          ))}
        </div>
        <div className="listing-list">
          {app.filteredListings.length === 0 && (
            <div className="empty-state">
              <Moon size={42} />
              <strong>No passes listed</strong>
            </div>
          )}
          {app.filteredListings.map((listing) => (
            <article className="listing-card" key={String(listing.passId)}>
              <span>Pass #{String(listing.passId)}</span>
              <strong>{eth(listing.price)}</strong>
              <small>Seller {shortAddress(listing.seller)}</small>
              <ActionButton tone="soft" disabled={!app.account || !app.isSepolia} onClick={() => app.buyPass(listing)}>Buy</ActionButton>
            </article>
          ))}
        </div>
      </section>

      <section className="market-column action-column">
        <div className="segmented">
          <button type="button" className={app.marketMode === "list" ? "active" : ""} onClick={() => app.setMarketMode("list")}>List Pass</button>
          <button type="button" className={app.marketMode === "passTransfer" ? "active" : ""} onClick={() => app.setMarketMode("passTransfer")}>Transfer Pass</button>
          <button type="button" className={app.marketMode === "nftTransfer" ? "active" : ""} onClick={() => app.setMarketMode("nftTransfer")}>Transfer NFT</button>
        </div>

        {app.marketMode !== "nftTransfer" ? (
          <SelectField label="Your passes" value={app.selectedPassId} onChange={(value) => { app.setSelectedPassId(value); app.setInspectKind("pass"); }}>
            <option value="">Select a pass</option>
            {app.ownedPasses.map((pass) => (
              <option key={String(pass.id)} value={String(pass.id)}>#{String(pass.id)} - {pass.sellable ? "sellable" : "locked"}</option>
            ))}
          </SelectField>
        ) : (
          <SelectField label="Your NFTs" value={app.selectedNftId} onChange={(value) => { app.setSelectedNftId(value); app.setInspectKind("nft"); }}>
            <option value="">Select an NFT</option>
            {app.ownedNfts.map((nft) => (
              <option key={String(nft.id)} value={String(nft.id)}>#{String(nft.id)} - {PHASE_NAMES[nft.phase]}</option>
            ))}
          </SelectField>
        )}

        {app.marketMode === "list" && (
          <>
            <Field label="ETH price" value={app.listPrice} onChange={app.setListPrice} invalid={Number(app.listPrice) < 0} />
            <p className="helper">Max price: {app.stats ? eth(app.stats.maxListingPrice) : "..."}</p>
            <ActionButton full disabled={!app.selectedPass?.sellable} onClick={app.listPass}>List Pass</ActionButton>
            {app.selectedPass?.listing.active && (
              <div className="current-listing">
                <span>Listed for {eth(app.selectedPass.listing.price)}</span>
                <ActionButton tone="danger" onClick={app.cancelListing}>Cancel Listing</ActionButton>
              </div>
            )}
          </>
        )}

        {app.marketMode === "passTransfer" && (
          <>
            <Field label="Recipient address" value={app.transferTo} onChange={app.setTransferTo} placeholder="0x..." />
            <p className="helper">Transfer fee: {app.stats ? eth(app.stats.transferFee) : "..."}</p>
            <ActionButton full disabled={!app.selectedPass?.sellable || !app.transferTo} onClick={app.transferPass}>Transfer Pass</ActionButton>
          </>
        )}

        {app.marketMode === "nftTransfer" && (
          <>
            <Field label="Recipient address" value={app.transferTo} onChange={app.setTransferTo} placeholder="0x..." />
            <p className="helper">NFT transfers use the standard token transfer flow.</p>
            <ActionButton full disabled={!app.selectedNft || !app.transferTo} onClick={app.transferNft}>Transfer NFT</ActionButton>
            <ActionButton tone="soft" full disabled={app.ownedNfts.length === 0} onClick={app.claimNftFees}>Claim NFT Fees</ActionButton>
          </>
        )}
      </section>

      <section className="market-column inspect-column">
        <div className="column-heading"><h2>Inspect</h2></div>
        {!app.inspectKind && <div className="empty-state"><span>Select a pass or NFT to inspect</span></div>}
        {app.inspectKind === "pass" && app.inspectedPass && (
          <div className="inspect-card">
            <strong>Pass #{String(app.inspectedPass.id)}</strong>
            <span>Type: {PASS_TYPE_NAMES[app.inspectedPass.passType]}</span>
            <span>Sellable: <b className={app.inspectedPass.sellable ? "ok" : "muted-badge"}>{app.inspectedPass.sellable ? "Yes" : "No"}</b></span>
            <span>Listed: {app.inspectedPass.listing.active ? <b className="ok">Listed for {eth(app.inspectedPass.listing.price)}</b> : "Not listed"}</span>
          </div>
        )}
        {app.inspectKind === "nft" && app.inspectedNft && (
          <div className="inspect-card">
            <strong>{app.inspectedNft.name ?? `World #${String(app.inspectedNft.id)}`}</strong>
            <span>Phase: {PHASE_NAMES[app.inspectedNft.phase]}</span>
            <span>Reward: {REWARD_TIER_NAMES[app.inspectedNft.rewardTier]}</span>
            <span>Pending fees: {app.inspectedNft.pendingFees ? eth(app.inspectedNft.pendingFees) : "0 ETH"}</span>
          </div>
        )}
      </section>
    </div>
  );
}
