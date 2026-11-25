export type CoinLink = {
  label: "Official site" | "X" | "GitHub" | "Reddit";
  href: string;
};

export type Coin = {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  image: string | null;
  price: number;
  change24h: number | null;
  volume24h: number;
  marketCap: number;
  sparkline: number[];
  sparklineDays: 7 | 30;
  links: CoinLink[];
  tvSymbol: string;
};

export type MarketsResult = { ok: true; coins: Coin[] } | { ok: false };
