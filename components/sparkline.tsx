type SparklineProps = {
  prices: number[];
  days: 7 | 30;
};

export function Sparkline({ prices, days }: SparklineProps) {
  if (prices.length < 2) {
    return <span className="spark spark-empty" />;
  }

  const width = 132;
  const height = 36;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const step = (width - 2) / (prices.length - 1);
  const points = prices
    .map((price, index) => {
      const x = 1 + index * step;
      const y = 2 + (1 - (price - min) / span) * (height - 4);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = prices[prices.length - 1] >= prices[0];

  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={up ? `${days}-day price trend up` : `${days}-day price trend down`}
    >
      <polyline
        fill="none"
        stroke={up ? "#16c784" : "#ea3943"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
