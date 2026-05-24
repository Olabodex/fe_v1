import { formatEther } from "ethers";

export const phaseLabels: Record<number, string> = {
  0: "Locked",
  1: "Morning",
  2: "Afternoon",
  3: "Dusk",
  4: "Night",
};

export const phaseSubtitles: Record<number, string> = {
  1: "Phase 1 Mint",
  2: "Phase 2 Mint",
  3: "Phase 3 Mint",
  4: "Phase 4 Mint",
};

export function shortAddress(value: string) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function eth(value: bigint | string | number) {
  return `${Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 5 })} ETH`;
}

export function isSameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function imageFromTokenUri(tokenUri: string) {
  try {
    if (!tokenUri.startsWith("data:application/json;base64,")) return {};
    const json = JSON.parse(atob(tokenUri.replace("data:application/json;base64,", ""))) as { image?: string; name?: string };
    return { image: json.image, name: json.name };
  } catch {
    return {};
  }
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function compactStatusMessage(value: unknown) {
  const raw = value instanceof Error ? value.message : typeof value === "string" ? value : "Something went wrong";
  const withoutRevert = raw.replace("execution reverted: ", "");
  const reasonMatch = withoutRevert.match(/reason="([^"]+)"/) ?? withoutRevert.match(/message="([^"]+)"/);
  const short = reasonMatch?.[1] ?? withoutRevert.split("\n")[0];
  return short.replace(/\s*\(.*$/, "").slice(0, 180);
}
