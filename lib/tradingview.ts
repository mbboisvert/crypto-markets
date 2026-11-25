type SymbolHit = {
  symbol?: string;
  type?: string;
  currency_code?: string | null;
  source_id?: string;
  prefix?: string;
  typespecs?: string[];
};

const EXCHANGE_RANK: Record<string, number> = {
  BINANCE: 60,
  COINBASE: 55,
  BITSTAMP: 50,
  KRAKEN: 45,
  BYBIT: 30,
  OKX: 28,
  KUCOIN: 26,
  CRYPTO: 10,
};

const USD_STABLES = new Set([
  "USDT",
  "USDC",
  "DAI",
  "TUSD",
  "FDUSD",
  "USDE",
  "PYUSD",
]);

function fallbackSymbol(symbol: string): string {
  const tick = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (USD_STABLES.has(tick)) return `CRYPTO:${tick}USD`;
  return `BINANCE:${tick}USDT`;
}

function matchesTicker(symbol: string, ticker: string): boolean {
  const tick = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!tick) return false;
  const upper = symbol.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9.]/g, "");
  if (compact.startsWith(tick)) {
    const rest = compact.slice(tick.length).replace(/^\./, "");
    if (
      rest === "" ||
      rest === "USD" ||
      rest === "USDT" ||
      rest === "USDC" ||
      rest.endsWith("USD")
    ) {
      return true;
    }
  }
  return upper.endsWith(".USD") && upper.replace(/[^A-Z0-9]/g, "").includes(tick);
}

function scoreHit(hit: SymbolHit, ticker: string): number {
  if (!hit.symbol || !hit.type) return -1;
  const specs = hit.typespecs ?? [];
  if (hit.type === "swap" || specs.includes("perpetual")) return -1;
  if (hit.source_id === "CRYPTOCAP" || hit.type === "index") return -1;
  if (!matchesTicker(hit.symbol, ticker)) return -1;

  let score = hit.type === "spot" ? 100 : 0;
  if (hit.currency_code === "USD") score += 40;
  const upper = hit.symbol.toUpperCase();
  if (upper.endsWith("USD") && !upper.endsWith("USDT") && !upper.endsWith("USDC")) {
    score += 15;
  } else if (upper.endsWith("USDT") || upper.endsWith("USDC")) {
    score += 8;
  }
  score += EXCHANGE_RANK[hit.prefix || hit.source_id || ""] ?? 0;
  return score;
}

export async function resolveTradingViewSymbol(symbol: string): Promise<string> {
  const fallback = fallbackSymbol(symbol);
  const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(symbol.trim())}&search_type=crypto&hl=0&lang=en&domain=production`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "crypto-markets/1.0",
          Origin: "https://www.tradingview.com",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      if (!response.ok) return fallback;
      const data = (await response.json()) as { symbols?: SymbolHit[] };
      const hits = Array.isArray(data.symbols) ? data.symbols : [];
      let best: { score: number; symbol: string } | null = null;
      for (const hit of hits) {
        const score = scoreHit(hit, symbol);
        const exchange = hit.prefix || hit.source_id;
        if (score < 0 || !exchange || !hit.symbol) continue;
        const full = `${exchange}:${hit.symbol}`;
        if (!best || score > best.score) best = { score, symbol: full };
      }
      return best?.symbol ?? fallback;
    } catch {
      await sleep(400 * 2 ** attempt);
    }
  }
  return fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
