"use client";

import { Fragment, useState } from "react";
import { Sparkline } from "@/components/sparkline";
import { TradingViewChart } from "@/components/tradingview-chart";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import type { Coin } from "@/lib/types";

export function MarketsTable({ coins }: { coins: Coin[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sparklineDays = coins[0]?.sparklineDays ?? 7;
  const sparklineHeading = coins.every((coin) => coin.sparklineDays === sparklineDays)
    ? `${sparklineDays} Days`
    : "Trend";

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Coin</th>
            <th scope="col" className="num">
              Price
            </th>
            <th scope="col" className="num">
              24h %
            </th>
            <th scope="col" className="num">
              24h Volume
            </th>
            <th scope="col" className="num">
              Market Cap
            </th>
            <th scope="col" className="num">
              {sparklineHeading}
            </th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const open = openId === coin.id;
            const changeClass =
              coin.change24h == null || coin.change24h === 0
                ? "flat"
                : coin.change24h > 0
                  ? "up"
                  : "down";
            return (
              <Fragment key={coin.id}>
                <tr
                  className={open ? "coin is-open" : "coin"}
                  onClick={() => toggle(coin.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(coin.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={open}
                  aria-controls={`detail-${coin.id}`}
                  aria-label={`${open ? "Hide" : "Show"} details for ${coin.name}`}
                >
                  <td className="rank">{coin.rank}</td>
                  <td>
                    <span className="coin-name">
                      {coin.image ? (
                        // Coin icons come from CoinGecko and are decorative next to the name.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coin.image} alt="" width={28} height={28} />
                      ) : (
                        <span className="coin-fallback" aria-hidden="true" />
                      )}
                      <span className="name">{coin.name}</span>
                      <span className="symbol">{coin.symbol}</span>
                    </span>
                  </td>
                  <td className="num">{formatUsd(coin.price)}</td>
                  <td className={`num ${changeClass}`}>{formatPct(coin.change24h)}</td>
                  <td className="num">{formatCompactUsd(coin.volume24h)}</td>
                  <td className="num">{formatCompactUsd(coin.marketCap)}</td>
                  <td className="num spark-cell">
                    <Sparkline prices={coin.sparkline} days={coin.sparklineDays} />
                  </td>
                </tr>
                {open ? (
                  <tr className="detail">
                    <td colSpan={7} id={`detail-${coin.id}`}>
                      <div className="dropdown">
                        {coin.links.length > 0 ? (
                          <ul className="links">
                            {coin.links.map((link) => (
                              <li key={link.label}>
                                <a
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <TradingViewChart symbol={coin.tvSymbol} title={coin.name} />
                        <div className="extra-data" />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
