import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import {
  ADDRESSES,
  MARKETPLACE_ABI,
  NFT_ABI,
  PASS_ABI,
  SEPOLIA_CHAIN_ID,
} from "./contracts";
import type { ChainStats, Listing, NftItem, OwnedPass, Status } from "./types";
import { compactStatusMessage, imageFromTokenUri, isSameAddress, mapWithConcurrency, shortAddress } from "./utils";

type MarketMode = "list" | "passTransfer" | "nftTransfer";
type ListingFilter = "all" | "0" | "1" | "2";

type SignedTx = { wait: () => Promise<unknown>; hash?: string };

type AppContextValue = {
  account: string;
  chainId: number | null;
  stats: ChainStats | null;
  statsLoading: boolean;
  status: Status;
  quantity: number;
  setQuantity: (value: number) => void;
  ownedPasses: OwnedPass[];
  ownedNfts: NftItem[];
  listedPasses: Listing[];
  filteredListings: Listing[];
  galleryNfts: NftItem[];
  galleryOpen: boolean;
  galleryLoading: boolean;
  inventoryLoading: boolean;
  selectedPassId: string;
  setSelectedPassId: (value: string) => void;
  selectedNftId: string;
  setSelectedNftId: (value: string) => void;
  marketMode: MarketMode;
  setMarketMode: (value: MarketMode) => void;
  listingFilter: ListingFilter;
  setListingFilter: (value: ListingFilter) => void;
  listPrice: string;
  setListPrice: (value: string) => void;
  transferTo: string;
  setTransferTo: (value: string) => void;
  inspectKind: "pass" | "nft" | null;
  setInspectKind: (value: "pass" | "nft" | null) => void;
  activePhase: number;
  activePrice: bigint;
  isSepolia: boolean;
  isOwner: boolean;
  phaseOnePass?: OwnedPass;
  phaseFourPasses: OwnedPass[];
  selectedPass?: OwnedPass;
  selectedNft?: NftItem;
  inspectedPass?: OwnedPass;
  inspectedNft?: NftItem;
  canSubmitAdmin: boolean;
  ownerCheckFailed: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  clearStatus: () => void;
  openGallery: () => void;
  closeGallery: () => void;
  claimInitialPass: () => Promise<void>;
  mintWorlds: () => Promise<void>;
  buyPass: (listing: Listing) => Promise<void>;
  listPass: () => Promise<void>;
  cancelListing: () => Promise<void>;
  transferPass: () => Promise<void>;
  transferNft: () => Promise<void>;
  claimNftFees: () => Promise<void>;
  setActivePhase: (phase: string) => Promise<void>;
  setPhasePrice: (phase: string, price: string) => Promise<void>;
  toggleClaim: () => Promise<void>;
  togglePause: () => Promise<void>;
  setRewardTier: (tokenId: string, tier: string) => Promise<void>;
  fundRewardPool: (amount: string) => Promise<void>;
  finalizeRewards: () => Promise<void>;
  selectWinners: (count: string) => Promise<void>;
  lockRewardCounts: () => Promise<void>;
  withdrawRevenue: (to: string) => Promise<void>;
  setMaxListPrice: (price: string) => Promise<void>;
  setTransferFee: (fee: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [quantity, setQuantity] = useState(1);
  const [ownedPasses, setOwnedPasses] = useState<OwnedPass[]>([]);
  const [ownedNfts, setOwnedNfts] = useState<NftItem[]>([]);
  const [listedPasses, setListedPasses] = useState<Listing[]>([]);
  const [galleryNfts, setGalleryNfts] = useState<NftItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState("");
  const [selectedNftId, setSelectedNftId] = useState("");
  const [marketMode, setMarketMode] = useState<MarketMode>("list");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");
  const [listPrice, setListPrice] = useState("0.001");
  const [transferTo, setTransferTo] = useState("");
  const [inspectKind, setInspectKind] = useState<"pass" | "nft" | null>(null);
  const latestGalleryIdRef = useRef<bigint | undefined>(undefined);
  const lastInventoryScanRef = useRef("");
  const refreshInFlightRef = useRef(false);
  const manuallyDisconnectedRef = useRef(window.sessionStorage.getItem("walletDisconnected") === "1");

  const contracts = useMemo(() => {
    if (!provider) return null;
    return {
      nftRead: new Contract(ADDRESSES.nft, NFT_ABI, provider),
      passRead: new Contract(ADDRESSES.pass, PASS_ABI, provider),
      marketplaceRead: new Contract(ADDRESSES.marketplace, MARKETPLACE_ABI, provider),
    };
  }, [provider]);

  const withSigner = useCallback(async () => {
    if (!provider) throw new Error("Connect wallet first");
    const signer = await provider.getSigner();
    return {
      nft: new Contract(ADDRESSES.nft, NFT_ABI, signer),
      pass: new Contract(ADDRESSES.pass, PASS_ABI, signer),
      marketplace: new Contract(ADDRESSES.marketplace, MARKETPLACE_ABI, signer),
    };
  }, [provider]);

  const activePhase = stats?.activePhase ?? 0;
  const isSepolia = chainId === SEPOLIA_CHAIN_ID;
  const totalMinted = stats?.totalMinted;
  const activePrice = stats?.phasePrices[Math.max(activePhase - 1, 0)] ?? 0n;
  const phaseOnePass = ownedPasses.find((item) => item.canUsePhaseOne);
  const phaseFourPasses = ownedPasses.filter((item) => item.canUsePhaseFour).slice(0, quantity);
  const selectedPass = ownedPasses.find((item) => String(item.id) === selectedPassId);
  const selectedNft = ownedNfts.find((item) => String(item.id) === selectedNftId);
  const inspectedPass = ownedPasses.find((item) => String(item.id) === selectedPassId);
  const inspectedNft = ownedNfts.find((item) => String(item.id) === selectedNftId);
  const isOwner = Boolean(
    stats &&
      account &&
      (isSameAddress(account, stats.nftOwner) || isSameAddress(account, stats.passOwner) || isSameAddress(account, stats.marketplaceOwner)),
  );
  const canSubmitAdmin = Boolean(account && isSepolia);
  const ownerCheckFailed = Boolean(account && stats && !isOwner);

  const refresh = useCallback(async () => {
    if (!contracts || !provider || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setStatsLoading(true);
    try {
      const network = await provider.getNetwork();
      const nextChainId = Number(network.chainId);
      setChainId(nextChainId);
      if (nextChainId !== SEPOLIA_CHAIN_ID) {
        setStats(null);
        return;
      }

      const [nftCode, passCode, marketplaceCode] = await Promise.all([
        provider.getCode(ADDRESSES.nft),
        provider.getCode(ADDRESSES.pass),
        provider.getCode(ADDRESSES.marketplace),
      ]);

      if ([nftCode, passCode, marketplaceCode].some((code) => code === "0x")) {
        setStats(null);
        setStatus({ type: "error", message: "Contract addresses not found on Sepolia." });
        return;
      }

      const { nftRead, passRead, marketplaceRead } = contracts;
      const [
        phaseMinted,
        phasePrices,
        nftOwner,
        passOwner,
        marketplaceOwner,
        activePhaseValue,
        paused,
        marketplacePaused,
        totalMintedValue,
        maxSupply,
        passTotalMinted,
        initialPassMinted,
        initialPassSupply,
        phaseOneRewardMinted,
        phaseOneRewardSupply,
        phaseTwoRewardMinted,
        phaseTwoRewardSupply,
        claimActive,
        rewardPoolFunded,
        mintRevenue,
        burnFeesCollected,
        totalFeeShareReceived,
        phaseOneRewardsFinalized,
        phaseOneRewardSelected,
        phaseOneMinterCount,
        rewardCountsLocked,
        rareRemaining,
        superRareRemaining,
        maxListingPrice,
        transferFee,
        collectedFees,
      ] = await Promise.all([
        Promise.all([nftRead.phaseOneMinted(), nftRead.phaseTwoMinted(), nftRead.phaseThreeMinted(), nftRead.phaseFourMinted()]),
        Promise.all([1, 2, 3, 4].map((phase) => nftRead.priceForPhase(phase))),
        nftRead.owner(),
        passRead.owner(),
        marketplaceRead.owner(),
        nftRead.activePhase(),
        nftRead.paused(),
        marketplaceRead.paused(),
        nftRead.totalMinted(),
        nftRead.MAX_SUPPLY(),
        passRead.totalMinted(),
        passRead.initialPassMinted(),
        passRead.INITIAL_PASS_SUPPLY(),
        passRead.phaseOneRewardMinted(),
        passRead.PHASE_ONE_REWARD_SUPPLY(),
        passRead.phaseTwoRewardMinted(),
        passRead.PHASE_TWO_REWARD_SUPPLY(),
        passRead.claimActive(),
        nftRead.rewardPoolFunded(),
        nftRead.mintRevenue(),
        nftRead.burnFeesCollected(),
        nftRead.totalFeeShareReceived(),
        nftRead.phaseOneRewardsFinalized(),
        nftRead.phaseOneRewardSelected(),
        nftRead.phaseOneMinterCount(),
        nftRead.rewardCountsLocked(),
        nftRead.rareRemaining(),
        nftRead.superRareRemaining(),
        marketplaceRead.maxListingPrice(),
        marketplaceRead.transferFee(),
        marketplaceRead.collectedFees(),
      ]);

      setStats({
        nftOwner,
        passOwner,
        marketplaceOwner,
        activePhase: Number(activePhaseValue),
        paused,
        marketplacePaused,
        totalMinted: totalMintedValue,
        maxSupply,
        phaseMinted,
        phasePrices,
        passTotalMinted,
        initialPassMinted,
        initialPassSupply,
        phaseOneRewardMinted,
        phaseOneRewardSupply,
        phaseTwoRewardMinted,
        phaseTwoRewardSupply,
        claimActive,
        rewardPoolFunded,
        mintRevenue,
        burnFeesCollected,
        totalFeeShareReceived,
        phaseOneRewardsFinalized,
        phaseOneRewardSelected,
        phaseOneMinterCount,
        rewardCountsLocked,
        rareRemaining,
        superRareRemaining,
        maxListingPrice,
        transferFee,
        collectedFees,
      });
    } finally {
      refreshInFlightRef.current = false;
      setStatsLoading(false);
    }
  }, [contracts, provider]);

  const scanPasses = useCallback(async () => {
    if (!contracts || !stats || !isSepolia) return;
    setInventoryLoading(true);
    try {
      const ids = Array.from({ length: Number(stats.passTotalMinted) }, (_, index) => BigInt(index + 1));
      const passRows = await mapWithConcurrency(ids, 12, async (id) => {
        try {
          const [passType, canUsePhaseOne, canUsePhaseFour, sellable, listing, owner] = await Promise.all([
            contracts.passRead.passTypeOf(id),
            contracts.passRead.canUseForPhase(id, 1),
            contracts.passRead.canUseForPhase(id, 4),
            contracts.passRead.isSellable(id),
            contracts.marketplaceRead.getListing(id),
            contracts.passRead.ownerOf(id),
          ]);
          const listingData = { passId: id, seller: listing[0], price: listing[1], active: listing[2] };
          return {
            owned: account && isSameAddress(owner, account) ? { id, passType: Number(passType), canUsePhaseOne, canUsePhaseFour, sellable, listing: listingData } : null,
            listing: listingData.active ? listingData : null,
          };
        } catch {
          return { owned: null, listing: null };
        }
      });

      const nextOwned = passRows.map((item) => item.owned).filter((item): item is OwnedPass => Boolean(item));
      const nextListings = passRows.map((item) => item.listing).filter((item): item is Listing => Boolean(item));
      setOwnedPasses(nextOwned);
      setListedPasses(nextListings);
      if (!selectedPassId && nextOwned.length > 0) setSelectedPassId(String(nextOwned[0].id));
    } finally {
      setInventoryLoading(false);
    }
  }, [account, contracts, isSepolia, selectedPassId, stats]);

  const scanOwnedNfts = useCallback(async () => {
    if (!contracts || !stats || !account || !isSepolia) return;
    setInventoryLoading(true);
    try {
      const ids = Array.from({ length: Number(stats.totalMinted) }, (_, index) => BigInt(index + 1));
      const rows: Array<NftItem | null> = await mapWithConcurrency(ids, 12, async (id) => {
        try {
          const owner = await contracts.nftRead.ownerOf(id);
          if (!isSameAddress(owner, account)) return null;
          const [phase, rewardTierValue, pendingFees, tokenUri] = await Promise.all([
            contracts.nftRead.tokenPhase(id),
            contracts.nftRead.rewardTier(id),
            contracts.nftRead.pendingMarketplaceFees(id),
            contracts.nftRead.tokenURI(id),
          ]);
          return { id, owner, phase: Number(phase), rewardTier: Number(rewardTierValue), pendingFees, ...imageFromTokenUri(tokenUri) };
        } catch {
          return null;
        }
      });
      const nextNfts = rows.filter((item): item is NftItem => item !== null);
      setOwnedNfts(nextNfts);
      if (!selectedNftId && nextNfts.length > 0) setSelectedNftId(String(nextNfts[0].id));
    } finally {
      setInventoryLoading(false);
    }
  }, [account, contracts, isSepolia, selectedNftId, stats]);

  const loadGallery = useCallback(async () => {
    if (!contracts || totalMinted === undefined || !isSepolia) return;
    setGalleryLoading(true);
    try {
      const total = Number(totalMinted);
      const start = Math.max(1, total - 9);
      const ids = Array.from({ length: Math.min(10, total) }, (_, index) => BigInt(start + index));
      const previousLatest = latestGalleryIdRef.current;
      const rows: Array<NftItem | null> = await mapWithConcurrency(ids, 6, async (id) => {
        try {
          const [owner, phase, rewardTierValue, tokenUri] = await Promise.all([
            contracts.nftRead.ownerOf(id),
            contracts.nftRead.tokenPhase(id),
            contracts.nftRead.rewardTier(id),
            contracts.nftRead.tokenURI(id),
          ]);
          return {
            id,
            owner,
            phase: Number(phase),
            rewardTier: Number(rewardTierValue),
            fresh: previousLatest ? id > previousLatest : false,
            ...imageFromTokenUri(tokenUri),
          };
        } catch {
          return null;
        }
      });
      const nextGallery = rows.filter((item): item is NftItem => item !== null);
      latestGalleryIdRef.current = nextGallery.length > 0 ? nextGallery[nextGallery.length - 1].id : previousLatest;
      setGalleryNfts(nextGallery);
    } finally {
      setGalleryLoading(false);
    }
  }, [contracts, isSepolia, totalMinted]);

  const runTx = useCallback(
    async (label: string, action: () => Promise<SignedTx>) => {
      try {
        setStatus({ type: "loading", message: `${label}...` });
        const tx = await action();
        setStatus({ type: "loading", message: tx.hash ? `Waiting for ${shortAddress(tx.hash)}...` : "Waiting for transaction..." });
        await tx.wait();
        setStatus({ type: "success", message: `${label} complete.` });
        await refresh();
        await scanPasses();
        await scanOwnedNfts();
      } catch (error) {
        setStatus({ type: "error", message: compactStatusMessage(error) });
      }
    },
    [refresh, scanOwnedNfts, scanPasses],
  );

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setStatus({ type: "error", message: "MetaMask or another injected wallet is required." });
      return;
    }
    const nextProvider = new BrowserProvider(window.ethereum);
    manuallyDisconnectedRef.current = false;
    window.sessionStorage.removeItem("walletDisconnected");
    setProvider(nextProvider);
    setStatus({ type: "loading", message: "Connecting wallet..." });
    try {
      const [accounts, network] = await Promise.all([
        (window.ethereum.request?.({ method: "eth_requestAccounts" }) ?? Promise.resolve([])) as Promise<string[]>,
        nextProvider.getNetwork(),
      ]);
      setAccount(accounts[0] ?? "");
      setChainId(Number(network.chainId));
      setStatus({ type: "success", message: "Wallet connected." });
    } catch (error) {
      setStatus({ type: "error", message: compactStatusMessage(error) });
    }
  }, []);

  const disconnect = useCallback(() => {
    manuallyDisconnectedRef.current = true;
    window.sessionStorage.setItem("walletDisconnected", "1");
    setAccount("");
    setOwnedPasses([]);
    setOwnedNfts([]);
    setSelectedPassId("");
    setSelectedNftId("");
    setStatus({ type: "success", message: "Wallet disconnected." });
    lastInventoryScanRef.current = "";
  }, []);

  const switchToSepolia = useCallback(async () => {
    await window.ethereum?.request?.({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
  }, []);

  const clearStatus = useCallback(() => setStatus({ type: "idle", message: "" }), []);

  const openGallery = useCallback(() => {
    setGalleryOpen(true);
    loadGallery().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
  }, [loadGallery]);

  const closeGallery = useCallback(() => setGalleryOpen(false), []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    const injected = new BrowserProvider(ethereum);
    setProvider(injected);
    Promise.all([injected.listAccounts(), injected.getNetwork()])
      .then(([accounts, network]) => {
        if (accounts[0] && !manuallyDisconnectedRef.current) setAccount(accounts[0].address);
        setChainId(Number(network.chainId));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    const onAccountsChanged = (accounts: unknown) => {
      const nextAccount = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
      if (nextAccount) {
        manuallyDisconnectedRef.current = false;
        window.sessionStorage.removeItem("walletDisconnected");
      }
      if (!manuallyDisconnectedRef.current) setAccount(nextAccount);
      setSelectedPassId("");
      setSelectedNftId("");
      lastInventoryScanRef.current = "";
    };
    const onChainChanged = (id: unknown) => {
      setChainId(Number(BigInt(String(id))));
      setStats(null);
      lastInventoryScanRef.current = "";
      setProvider(new BrowserProvider(ethereum));
    };
    ethereum.on?.("accountsChanged", onAccountsChanged);
    ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  useEffect(() => {
    refresh().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
  }, [refresh]);

  useEffect(() => {
    if (!stats || !account || !isSepolia) return;
    const scanKey = `${account.toLowerCase()}-${stats.passTotalMinted.toString()}-${stats.totalMinted.toString()}`;
    if (lastInventoryScanRef.current === scanKey) return;
    lastInventoryScanRef.current = scanKey;
    const timer = window.setTimeout(() => {
      scanPasses().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
      scanOwnedNfts().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [account, isSepolia, scanOwnedNfts, scanPasses, stats]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    loadGallery().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    const timer = window.setInterval(() => {
      refresh()
        .then(loadGallery)
        .catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadGallery, refresh]);

  const filteredListings = listedPasses.filter((listing) => {
    if (listingFilter === "all") return true;
    const found = ownedPasses.find((item) => item.id === listing.passId);
    return found ? String(found.passType) === listingFilter : true;
  });

  const value: AppContextValue = {
    account,
    chainId,
    stats,
    statsLoading,
    status,
    quantity,
    setQuantity,
    ownedPasses,
    ownedNfts,
    listedPasses,
    filteredListings,
    galleryNfts,
    galleryOpen,
    galleryLoading,
    inventoryLoading,
    selectedPassId,
    setSelectedPassId,
    selectedNftId,
    setSelectedNftId,
    marketMode,
    setMarketMode,
    listingFilter,
    setListingFilter,
    listPrice,
    setListPrice,
    transferTo,
    setTransferTo,
    inspectKind,
    setInspectKind,
    activePhase,
    activePrice,
    isSepolia,
    isOwner,
    phaseOnePass,
    phaseFourPasses,
    selectedPass,
    selectedNft,
    inspectedPass,
    inspectedNft,
    canSubmitAdmin,
    ownerCheckFailed,
    connect,
    disconnect,
    switchToSepolia,
    clearStatus,
    openGallery,
    closeGallery,
    claimInitialPass: async () => {
      const signed = await withSigner();
      await runTx("Claiming initial pass", () => signed.pass.claimInitialPass());
    },
    mintWorlds: async () => {
      const signed = await withSigner();
      const value = activePrice * BigInt(quantity);
      await runTx("Minting worlds", async () => {
        if (activePhase === 1) return signed.nft.mintPhaseOne(quantity, phaseOnePass?.id, { value });
        if (activePhase === 2) return signed.nft.mintPhaseTwo(quantity, { value });
        if (activePhase === 3) return signed.nft.mintPhaseThree(quantity, { value });
        return signed.nft.mintPhaseFour(quantity, phaseFourPasses.map((item) => item.id), { value });
      });
    },
    buyPass: async (listing) => {
      const signed = await withSigner();
      await runTx("Buying pass", () => signed.marketplace.buyPass(listing.passId, { value: listing.price }));
    },
    listPass: async () => {
      if (!selectedPass) return;
      const signed = await withSigner();
      await runTx("Listing pass", () => signed.marketplace.listPass(selectedPass.id, parseEther(listPrice)));
    },
    cancelListing: async () => {
      if (!selectedPass) return;
      const signed = await withSigner();
      await runTx("Canceling listing", () => signed.marketplace.cancelListing(selectedPass.id));
    },
    transferPass: async () => {
      if (!selectedPass) return;
      const signed = await withSigner();
      await runTx("Transferring pass", () => signed.marketplace.transferPass(transferTo, selectedPass.id, { value: stats?.transferFee ?? 0n }));
    },
    transferNft: async () => {
      if (!selectedNft || !account) return;
      const signed = await withSigner();
      await runTx("Transferring NFT", () => signed.nft.transferFrom(account, transferTo, selectedNft.id));
    },
    claimNftFees: async () => {
      const signed = await withSigner();
      await runTx("Claiming marketplace fees", () => signed.nft.claimMarketplaceFees(ownedNfts.map((item) => item.id)));
    },
    setActivePhase: async (phase) => {
      const signed = await withSigner();
      await runTx("Setting phase", () => signed.nft.setActivePhase(Number(phase)));
    },
    setPhasePrice: async (phase, price) => {
      const signed = await withSigner();
      await runTx("Setting price", () => signed.nft.setPhasePrice(Number(phase), parseEther(price)));
    },
    toggleClaim: async () => {
      const signed = await withSigner();
      await runTx("Updating claim", () => signed.pass.setClaimActive(!stats?.claimActive));
    },
    togglePause: async () => {
      const signed = await withSigner();
      await runTx(stats?.paused ? "Unpausing NFT" : "Pausing NFT", () => (stats?.paused ? signed.nft.unpause() : signed.nft.pause()));
    },
    setRewardTier: async (tokenId, tier) => {
      const signed = await withSigner();
      await runTx("Setting reward tier", () => signed.nft.setRewardTier(BigInt(tokenId), Number(tier)));
    },
    fundRewardPool: async (amount) => {
      const signed = await withSigner();
      await runTx("Funding reward pool", () => signed.nft.fundRewardPool({ value: parseEther(amount) }));
    },
    finalizeRewards: async () => {
      const signed = await withSigner();
      await runTx("Finalizing P1 rewards", () => signed.nft.finalizePhaseOneRewards());
    },
    selectWinners: async (count) => {
      const signed = await withSigner();
      await runTx("Selecting winners", () => signed.nft.selectPhaseOneRewardWinners(Number(count)));
    },
    lockRewardCounts: async () => {
      const signed = await withSigner();
      await runTx("Locking reward counts", () => signed.nft.lockRewardCounts());
    },
    withdrawRevenue: async (to) => {
      const signed = await withSigner();
      await runTx("Withdrawing revenue", () => signed.nft.withdrawMintRevenue(to || account));
    },
    setMaxListPrice: async (price) => {
      const signed = await withSigner();
      await runTx("Setting max list price", () => signed.marketplace.setMaxListingPrice(parseEther(price)));
    },
    setTransferFee: async (fee) => {
      const signed = await withSigner();
      await runTx("Setting transfer fee", () => signed.marketplace.setTransferFee(parseEther(fee)));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
