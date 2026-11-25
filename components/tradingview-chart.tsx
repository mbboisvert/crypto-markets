type TradingViewChartProps = {
  symbol: string;
  title: string;
};

export function TradingViewChart({ symbol, title }: TradingViewChartProps) {
  const params = new URLSearchParams({
    symbol,
    interval: "D",
    theme: "light",
    style: "1",
    locale: "en",
    hideideas: "1",
    hidesidetoolbar: "1",
    allow_symbol_change: "0",
    saveimage: "0",
    withdateranges: "0",
    timezone: "Etc/UTC",
  });

  return (
    <iframe
      className="chart"
      title={`${title} daily chart`}
      src={`https://www.tradingview.com/widgetembed/?${params.toString()}`}
      loading="lazy"
    />
  );
}
