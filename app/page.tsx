import { Suspense } from "react";
import { MarketsTable } from "@/components/markets-table";
import { getTopMarkets } from "@/lib/coingecko";

export default function Page() {
  return (
    <main className="page">
      <h1>Crypto Markets</h1>
      <Suspense fallback={<MarketsTable coins={[]} />}>
        <MarketList />
      </Suspense>
    </main>
  );
}

async function MarketList() {
  const result = await getTopMarkets();
  if (!result.ok) {
    return (
      <>
        <p className="unavailable">Prices are unavailable.</p>
        <MarketsTable coins={[]} />
      </>
    );
  }
  return <MarketsTable coins={result.coins} />;
}
