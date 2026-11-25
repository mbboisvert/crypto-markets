export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1 ? 2 : abs >= 0.000001 ? 6 : 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = value.toFixed(2);
  if (rounded === "0.00" || rounded === "-0.00") return "0.00%";
  if (value > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const tiers = [
    { limit: 1e12, suffix: "T" },
    { limit: 1e9, suffix: "B" },
    { limit: 1e6, suffix: "M" },
    { limit: 1e3, suffix: "K" },
  ];
  for (const tier of tiers) {
    if (abs >= tier.limit) {
      return `${sign}$${(abs / tier.limit).toFixed(1)}${tier.suffix}`;
    }
  }
  return `${sign}$${abs.toFixed(0)}`;
}
