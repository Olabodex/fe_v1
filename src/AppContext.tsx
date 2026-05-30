import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import {
  ADDRESSES,
  ETHEREUM_CHAIN_ID,
  ETHEREUM_CHAIN_ID_HEX,
  MARKETPLACE_ABI,
  NFT_ABI,
  PASS_ABI,
} from "./contracts";
import { SHOWCASE_MODE } from "./config";
import type { ChainStats, Listing, NftItem, OwnedPass, RecentActivity, Status } from "./types";
import { compactStatusMessage, imageFromTokenUri, isSameAddress, mapWithConcurrency, shortAddress } from "./utils";

type MarketMode = "list" | "passTransfer" | "nftTransfer";
type ListingFilter = "all" | "1" | "2";

type SignedTx = { wait: () => Promise<unknown>; hash?: string };

function successMessageForAction(label: string) {
  if (label === "Claiming initial pass") return "Initial pass minted successfully.";
  if (label === "Minting worlds") return "NFT minted successfully.";
  return `${label} confirmed successfully.`;
}

function activityTitleForAction(label: string) {
  if (label === "Claiming initial pass") return "Pass minted";
  if (label === "Minting worlds") return "World minted";
  return "Transaction confirmed";
}

type AppContextValue = {
  account: string;
  chainId: number | null;
  stats: ChainStats | null;
  statsLoading: boolean;
  status: Status;
  recentActivities: RecentActivity[];
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
  isEthereumMainnet: boolean;
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
  switchToEthereumMainnet: () => Promise<void>;
  clearStatus: () => void;
  dismissRecentActivity: (id: number) => void;
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
const DEMO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEMO_STATS: ChainStats = {
  nftOwner: DEMO_ADDRESS,
  passOwner: DEMO_ADDRESS,
  marketplaceOwner: DEMO_ADDRESS,
  activePhase: 1,
  paused: false,
  marketplacePaused: false,
  totalMinted: 0n,
  maxSupply: 2000n,
  phaseMinted: [0n, 0n, 0n, 0n],
  phasePrices: [1000000000000000n, 1000000000000000n, 1000000000000000n, 1000000000000000n],
  passTotalMinted: 0n,
  initialPassMinted: 0n,
  initialPassSupply: 1500n,
  phaseOneRewardMinted: 0n,
  phaseOneRewardSupply: 400n,
  phaseTwoRewardMinted: 0n,
  phaseTwoRewardSupply: 600n,
  claimActive: true,
  rewardPoolFunded: 0n,
  mintRevenue: 0n,
  burnFeesCollected: 0n,
  totalFeeShareReceived: 0n,
  phaseOneRewardsFinalized: false,
  phaseOneRewardSelected: 0n,
  phaseOneMinterCount: 0n,
  rewardCountsLocked: false,
  rareRemaining: 20n,
  superRareRemaining: 10n,
  maxListingPrice: 0n,
  transferFee: 0n,
  collectedFees: 0n,
};

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
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
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
  const [listPrice, setListPrice] = useState("0.00055");
  const [transferTo, setTransferTo] = useState("");
  const [inspectKind, setInspectKind] = useState<"pass" | "nft" | null>(null);
  const latestGalleryIdRef = useRef<bigint | undefined>(undefined);
  const activityIdRef = useRef(0);
  const lastInventoryScanRef = useRef("");
  const refreshInFlightRef = useRef(false);
  const passScanInFlightRef = useRef(false);
  const nftScanInFlightRef = useRef(false);
  const galleryInFlightRef = useRef(false);
  const contractCodeCheckedRef = useRef("");
  const tokenMetadataCacheRef = useRef(new Map<string, { image?: string; name?: string }>());
  const manuallyDisconnectedRef = useRef(window.sessionStorage.getItem("walletDisconnected") === "1");
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden");

  const contracts = useMemo(() => {
    if (!provider) return null;
    return {
      nftRead: new Contract(ADDRESSES.nft, NFT_ABI, provider),
      passRead: new Contract(ADDRESSES.pass, PASS_ABI, provider),
      marketplaceRead: new Contract(ADDRESSES.marketplace, MARKETPLACE_ABI, provider),
    };
  }, [provider]);

  const withSigner = useCallback(async () => {
    if (SHOWCASE_MODE) throw new Error("Wallet actions are closed during preview.");
    if (!provider) throw new Error("Connect wallet first");
    const signer = await provider.getSigner();
    return {
      nft: new Contract(ADDRESSES.nft, NFT_ABI, signer),
      pass: new Contract(ADDRESSES.pass, PASS_ABI, signer),
      marketplace: new Contract(ADDRESSES.marketplace, MARKETPLACE_ABI, signer),
    };
  }, [provider]);

  const activePhase = stats?.activePhase ?? 0;
  const isEthereumMainnet = chainId === ETHEREUM_CHAIN_ID;
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
  const canSubmitAdmin = Boolean(account && isEthereumMainnet);
  const ownerCheckFailed = Boolean(account && stats && !isOwner);

  const readTokenMetadata = useCallback(
    async (contract: Contract, id: bigint) => {
      const key = id.toString();
      const cached = tokenMetadataCacheRef.current.get(key);
      if (cached) return cached;
      const tokenUri = await contract.tokenURI(id);
      const metadata = imageFromTokenUri(tokenUri);
      tokenMetadataCacheRef.current.set(key, metadata);
      return metadata;
    },
    [],
  );

  const refresh = useCallback(async (): Promise<ChainStats | undefined> => {
    if (!contracts || !provider || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setStatsLoading(true);
    try {
      const network = await provider.getNetwork();
      const nextChainId = Number(network.chainId);
      setChainId(nextChainId);
      if (nextChainId !== ETHEREUM_CHAIN_ID) {
        setStats(null);
        return undefined;
      }

      const codeCheckKey = `${nextChainId}:${ADDRESSES.nft}:${ADDRESSES.pass}:${ADDRESSES.marketplace}`;
      if (contractCodeCheckedRef.current !== codeCheckKey) {
        const [nftCode, passCode, marketplaceCode] = await Promise.all([
          provider.getCode(ADDRESSES.nft),
          provider.getCode(ADDRESSES.pass),
          provider.getCode(ADDRESSES.marketplace),
        ]);

        if ([nftCode, passCode, marketplaceCode].some((code) => code === "0x")) {
          setStats(DEMO_STATS);
          setStatus({ type: "idle", message: "" });
          return DEMO_STATS;
        }
        contractCodeCheckedRef.current = codeCheckKey;
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

      const nextStats: ChainStats = {
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
      };
      setStats(nextStats);
      return nextStats;
    } finally {
      refreshInFlightRef.current = false;
      setStatsLoading(false);
    }
  }, [contracts, provider]);

  const scanPasses = useCallback(async (statsOverride?: ChainStats) => {
    const statsToScan = statsOverride ?? stats;
    if (!contracts || !statsToScan || !isEthereumMainnet || passScanInFlightRef.current) return;
    passScanInFlightRef.current = true;
    setInventoryLoading(true);
    try {
      const ids = Array.from({ length: Number(statsToScan.passTotalMinted) }, (_, index) => BigInt(index + 1));
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
          const passTypeValue = Number(passType);
          const listingData = { passId: id, passType: passTypeValue, seller: listing[0], price: listing[1], active: listing[2] };
          return {
            owned: account && isSameAddress(owner, account) ? { id, passType: passTypeValue, canUsePhaseOne, canUsePhaseFour, sellable, listing: listingData } : null,
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
      passScanInFlightRef.current = false;
      setInventoryLoading(false);
    }
  }, [account, contracts, isEthereumMainnet, selectedPassId, stats]);

  const scanOwnedNfts = useCallback(async () => {
    if (!contracts || !stats || !account || !isEthereumMainnet || nftScanInFlightRef.current) return;
    nftScanInFlightRef.current = true;
    setInventoryLoading(true);
    try {
      const ids = Array.from({ length: Number(stats.totalMinted) }, (_, index) => BigInt(index + 1));
      const rows: Array<NftItem | null> = await mapWithConcurrency(ids, 12, async (id) => {
        try {
          const owner = await contracts.nftRead.ownerOf(id);
          if (!isSameAddress(owner, account)) return null;
          const [phase, rewardTierValue, pendingFees, metadata] = await Promise.all([
            contracts.nftRead.tokenPhase(id),
            contracts.nftRead.rewardTier(id),
            contracts.nftRead.pendingMarketplaceFees(id),
            readTokenMetadata(contracts.nftRead, id),
          ]);
          return { id, owner, phase: Number(phase), rewardTier: Number(rewardTierValue), pendingFees, ...metadata };
        } catch {
          return null;
        }
      });
      const nextNfts = rows.filter((item): item is NftItem => item !== null);
      setOwnedNfts(nextNfts);
      if (!selectedNftId && nextNfts.length > 0) setSelectedNftId(String(nextNfts[0].id));
    } finally {
      nftScanInFlightRef.current = false;
      setInventoryLoading(false);
    }
  }, [account, contracts, isEthereumMainnet, readTokenMetadata, selectedNftId, stats]);

  const loadGallery = useCallback(async () => {
    if (!contracts || totalMinted === undefined || !isEthereumMainnet || galleryInFlightRef.current) return;
    galleryInFlightRef.current = true;
    setGalleryLoading(true);
    try {
      const total = Number(totalMinted);
      const start = Math.max(1, total - 9);
      const ids = Array.from({ length: Math.min(10, total) }, (_, index) => BigInt(start + index));
      const previousLatest = latestGalleryIdRef.current;
      const rows: Array<NftItem | null> = await mapWithConcurrency(ids, 6, async (id) => {
        try {
          const [owner, phase, rewardTierValue, metadata] = await Promise.all([
            contracts.nftRead.ownerOf(id),
            contracts.nftRead.tokenPhase(id),
            contracts.nftRead.rewardTier(id),
            readTokenMetadata(contracts.nftRead, id),
          ]);
          return {
            id,
            owner,
            phase: Number(phase),
            rewardTier: Number(rewardTierValue),
            fresh: previousLatest ? id > previousLatest : false,
            ...metadata,
          };
        } catch {
          return null;
        }
      });
      const nextGallery = rows.filter((item): item is NftItem => item !== null);
      latestGalleryIdRef.current = nextGallery.length > 0 ? nextGallery[nextGallery.length - 1].id : previousLatest;
      setGalleryNfts(nextGallery);
    } finally {
      galleryInFlightRef.current = false;
      setGalleryLoading(false);
    }
  }, [contracts, isEthereumMainnet, readTokenMetadata, totalMinted]);

  const runTx = useCallback(
    async (label: string, action: () => Promise<SignedTx>) => {
      try {
        setStatus({ type: "loading", message: `${label}...` });
        const tx = await action();
        setStatus({ type: "loading", message: tx.hash ? `Waiting for ${shortAddress(tx.hash)}...` : "Waiting for transaction..." });
        await tx.wait();
        const successMessage = successMessageForAction(label);
        setStatus({ type: "success", message: successMessage, txHash: tx.hash });
        const activity: RecentActivity = {
          id: activityIdRef.current++,
          title: activityTitleForAction(label),
          message: successMessage,
          txHash: tx.hash,
        };
        setRecentActivities((items) => [...items, activity].slice(-8));
        const refreshedStats = await refresh();
        await scanPasses(label === "Claiming initial pass" ? refreshedStats : undefined);
        await scanOwnedNfts();
      } catch (error) {
        setStatus({ type: "error", message: compactStatusMessage(error) });
      }
    },
    [refresh, scanOwnedNfts, scanPasses],
  );

  const connect = useCallback(async () => {
    if (SHOWCASE_MODE) {
      setStatus({ type: "idle", message: "" });
      return;
    }
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

  const switchToEthereumMainnet = useCallback(async () => {
    await window.ethereum?.request?.({ method: "wallet_switchEthereumChain", params: [{ chainId: ETHEREUM_CHAIN_ID_HEX }] });
  }, []);

  const clearStatus = useCallback(() => setStatus({ type: "idle", message: "" }), []);
  const dismissRecentActivity = useCallback((id: number) => {
    setRecentActivities((items) => items.filter((item) => item.id !== id));
  }, []);

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
        if (!SHOWCASE_MODE && accounts[0] && !manuallyDisconnectedRef.current) setAccount(accounts[0].address);
        setChainId(Number(network.chainId));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    const onAccountsChanged = (accounts: unknown) => {
      if (SHOWCASE_MODE) return;
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
    const onVisibilityChange = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    refresh().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
  }, [refresh]);

  useEffect(() => {
    if (!stats || !account || !isEthereumMainnet || !pageVisible) return;
    const scanKey = `${account.toLowerCase()}-${stats.passTotalMinted.toString()}-${stats.totalMinted.toString()}`;
    if (lastInventoryScanRef.current === scanKey) return;
    lastInventoryScanRef.current = scanKey;
    const timer = window.setTimeout(() => {
      scanPasses().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
      scanOwnedNfts().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [account, isEthereumMainnet, pageVisible, scanOwnedNfts, scanPasses, stats]);

  useEffect(() => {
    if (!pageVisible) return;
    const timer = window.setInterval(() => {
      refresh().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 30000 + Math.floor(Math.random() * 5000));
    return () => window.clearInterval(timer);
  }, [pageVisible, refresh]);

  useEffect(() => {
    if (!galleryOpen || !pageVisible) return;
    loadGallery().catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    const timer = window.setInterval(() => {
      refresh()
        .then(loadGallery)
        .catch((error) => setStatus({ type: "error", message: compactStatusMessage(error) }));
    }, 15000 + Math.floor(Math.random() * 5000));
    return () => window.clearInterval(timer);
  }, [galleryOpen, loadGallery, pageVisible, refresh]);

  const filteredListings = listedPasses.filter((listing) => {
    if (listing.passType === 0) return false;
    if (listingFilter === "all") return true;
    return String(listing.passType) === listingFilter;
  });

  const value: AppContextValue = {
    account,
    chainId,
    stats,
    statsLoading,
    status,
    recentActivities,
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
    isEthereumMainnet,
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
    switchToEthereumMainnet,
    clearStatus,
    dismissRecentActivity,
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
