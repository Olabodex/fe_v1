import type { ReactNode } from "react";

export type Status = { type: "idle" | "success" | "error" | "loading"; message: string; txHash?: string };

export type RecentActivity = {
  id: number;
  title: string;
  message: string;
  txHash?: string;
};

export type ChainStats = {
  nftOwner: string;
  passOwner: string;
  marketplaceOwner: string;
  activePhase: number;
  paused: boolean;
  marketplacePaused: boolean;
  totalMinted: bigint;
  maxSupply: bigint;
  phaseMinted: bigint[];
  phasePrices: bigint[];
  passTotalMinted: bigint;
  initialPassMinted: bigint;
  initialPassSupply: bigint;
  phaseOneRewardMinted: bigint;
  phaseOneRewardSupply: bigint;
  phaseTwoRewardMinted: bigint;
  phaseTwoRewardSupply: bigint;
  claimActive: boolean;
  rewardPoolFunded: bigint;
  mintRevenue: bigint;
  burnFeesCollected: bigint;
  totalFeeShareReceived: bigint;
  phaseOneRewardsFinalized: boolean;
  phaseOneRewardSelected: bigint;
  phaseOneMinterCount: bigint;
  rewardCountsLocked: boolean;
  rareRemaining: bigint;
  superRareRemaining: bigint;
  maxListingPrice: bigint;
  transferFee: bigint;
  collectedFees: bigint;
};

export type Listing = {
  passId: bigint;
  passType: number;
  seller: string;
  price: bigint;
  active: boolean;
};

export type OwnedPass = {
  id: bigint;
  passType: number;
  canUsePhaseOne: boolean;
  canUsePhaseFour: boolean;
  sellable: boolean;
  listing: Listing;
};

export type NftItem = {
  id: bigint;
  owner: string;
  phase: number;
  rewardTier: number;
  pendingFees?: bigint;
  image?: string;
  name?: string;
  fresh?: boolean;
};

export type ChildrenProps = {
  children: ReactNode;
};
