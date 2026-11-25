import type { Coin, CoinLink, MarketsResult } from "@/lib/types";
import { resolveTradingViewSymbol } from "@/lib/tradingview";

const API = "https://api.coingecko.com/api/v3";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "crypto-markets/1.0",
};

type Market = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  sparkline: number[];
  sparklineDays: 7 | 30;
};

export async function getTopMarkets(): Promise<MarketsResult> {
  const data = await getJson(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`,
    6,
  );
  const markets = parseMarkets(data);
  if (!markets) return { ok: false };

  const coins = await mapPool(markets, 2, async (market, index) => {
    const [detail, tvSymbol] = await Promise.all([
      getJson(coinUrl(market.id)),
      resolveTradingViewSymbol(market.symbol),
    ]);

    return toCoin(market, index, detail, tvSymbol);
  });

  for (const coin of coins) {
    if (!coin.detailOk) {
      const detail = await getJson(coinUrl(coin.id));
      if (detail) coin.links = linksFrom(detail);
    }
  }

  return { ok: true, coins: coins.map(publishCoin) };
}

function publishCoin(draft: DraftCoin): Coin {
  return {
    id: draft.id,
    rank: draft.rank,
    name: draft.name,
    symbol: draft.symbol,
    image: draft.image,
    price: draft.price,
    change24h: draft.change24h,
    volume24h: draft.volume24h,
    marketCap: draft.marketCap,
    sparkline: draft.sparkline,
    sparklineDays: draft.sparklineDays,
    links: draft.links,
    tvSymbol: draft.tvSymbol,
  };
}

function coinUrl(id: string): string {
  return `${API}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
}

type DraftCoin = Coin & { detailOk: boolean };

function toCoin(
  market: Market,
  index: number,
  detail: unknown,
  tvSymbol: string,
): DraftCoin {
  return {
    id: market.id,
    rank: index + 1,
    name: market.name,
    symbol: market.symbol,
    image: market.image ?? null,
    price: market.current_price,
    change24h: market.price_change_percentage_24h,
    volume24h: market.total_volume,
    marketCap: market.market_cap,
    sparkline: market.sparkline,
    sparklineDays: market.sparklineDays,
    links: linksFrom(detail),
    tvSymbol,
    detailOk: detail != null,
  };
}

function parseMarkets(data: unknown): Market[] | null {
  if (!Array.isArray(data)) return null;
  const markets: Market[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      typeof record.symbol !== "string" ||
      typeof record.current_price !== "number" ||
      !Number.isFinite(record.current_price) ||
      typeof record.market_cap !== "number" ||
      !Number.isFinite(record.market_cap) ||
      typeof record.total_volume !== "number" ||
      !Number.isFinite(record.total_volume)
    ) {
      continue;
    }
    const change = record.price_change_percentage_24h;
    const sparkline = sparklineFromMarket(record);
    markets.push({
      id: record.id,
      symbol: record.symbol,
      name: record.name,
      image: typeof record.image === "string" ? record.image : undefined,
      current_price: record.current_price,
      market_cap: record.market_cap,
      total_volume: record.total_volume,
      price_change_percentage_24h:
        typeof change === "number" && Number.isFinite(change) ? change : null,
      sparkline: sparkline.prices,
      sparklineDays: sparkline.days,
    });
    if (markets.length === 10) break;
  }
  return markets.length > 0 ? markets : null;
}

function linksFrom(detail: unknown): CoinLink[] {
  if (!detail || typeof detail !== "object") return [];
  const links = (detail as { links?: unknown }).links;
  if (!links || typeof links !== "object") return [];
  const record = links as Record<string, unknown>;
  const result: CoinLink[] = [];

  const homepage = firstHttp(record.homepage);
  if (homepage) result.push({ label: "Official site", href: homepage });

  const x = xUrl(record.twitter_screen_name);
  if (x) result.push({ label: "X", href: x });

  const repos = record.repos_url;
  const github =
    repos && typeof repos === "object"
      ? firstHttp((repos as { github?: unknown }).github)
      : null;
  if (github) result.push({ label: "GitHub", href: github });

  const reddit = httpUrl(record.subreddit_url);
  if (reddit && !/^https?:\/\/(www\.)?reddit\.com\/?$/i.test(reddit)) {
    result.push({ label: "Reddit", href: reddit });
  }

  return result;
}

function sparklineFromMarket(record: Record<string, unknown>): {
  prices: number[];
  days: 7 | 30;
} {
  for (const key of Object.keys(record)) {
    if (!/sparkline/i.test(key) || !/30/.test(key)) continue;
    const prices = pricesFrom(record[key]);
    if (prices.length >= 2) return { prices: downsample(prices, 40), days: 30 };
  }
  for (const key of Object.keys(record)) {
    if (!/sparkline/i.test(key)) continue;
    const prices = pricesFrom(record[key]);
    if (prices.length >= 2) return { prices: downsample(prices, 40), days: 7 };
  }
  return { prices: [], days: 7 };
}

function pricesFrom(value: unknown): number[] {
  if (Array.isArray(value)) return numericPrices(value);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if ("price" in record) return numericPrices(record.price);
  if ("prices" in record) return numericPrices(record.prices);
  return [];
}

function numericPrices(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const prices: number[] = [];
  for (const point of value) {
    if (typeof point === "number" && Number.isFinite(point)) {
      prices.push(point);
      continue;
    }
    if (!Array.isArray(point)) continue;
    const candidate = point.length > 1 ? point[1] : point[0];
    if (typeof candidate === "number" && Number.isFinite(candidate)) prices.push(candidate);
  }
  return prices;
}

function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const sampled: number[] = [];
  const step = (values.length - 1) / (max - 1);
  for (let index = 0; index < max; index += 1) {
    sampled.push(values[Math.round(index * step)]);
  }
  return sampled;
}

function firstHttp(values: unknown): string | null {
  if (!Array.isArray(values)) return null;
  for (const value of values) {
    const url = httpUrl(value);
    if (url) return url;
  }
  return null;
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function xUrl(screenName: unknown): string | null {
  if (typeof screenName !== "string") return null;
  const handle = screenName.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,50}$/.test(handle)) return null;
  return `https://x.com/${handle}`;
}

const MAX_COINGECKO_REQUESTS = 2;
let activeCoinGeckoRequests = 0;
const coinGeckoWaiters: Array<() => void> = [];

async function getJson(url: string, attempts = 4): Promise<unknown | null> {
  let wait = 400;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await withCoinGeckoSlot(() =>
        fetch(url, {
          cache: "no-store",
          headers: HEADERS,
          signal: AbortSignal.timeout(12_000),
        }),
      );
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) return null;
    } catch {
      // Retry a rate limit, a server error, or a dropped connection.
    }
    if (attempt < attempts - 1) {
      await sleep(wait);
      wait = Math.min(wait * 2, 3_000);
    }
  }
  return null;
}

async function withCoinGeckoSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCoinGeckoRequests >= MAX_COINGECKO_REQUESTS) {
    await new Promise<void>((resolve) => {
      coinGeckoWaiters.push(resolve);
    });
  }
  activeCoinGeckoRequests += 1;
  try {
    return await fn();
  } finally {
    activeCoinGeckoRequests -= 1;
    const resume = coinGeckoWaiters.shift();
    if (resume) resume();
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
