// Unified live-data hook — dispatches to the selected provider.
import { useQuery } from "@tanstack/react-query";
import type { Coin } from "./demo-data";
import { useDataSource, type DataSource } from "./data-source";
import { fetchBinanceCoins } from "./providers/binance";
import { fetchCoingeckoCoins } from "./providers/coingecko";
import { fetchCryptoCompareCoins } from "./providers/cryptocompare";

export type LiveCoin = Coin & { live: true };

const fetchers: Record<DataSource, () => Promise<Coin[]>> = {
  binance: fetchBinanceCoins,
  coingecko: fetchCoingeckoCoins,
  cryptocompare: fetchCryptoCompareCoins,
};

export function useLiveCoins() {
  const source = useDataSource();
  return useQuery({
    queryKey: ["coins", source],
    queryFn: async (): Promise<LiveCoin[]> => {
      const data = await fetchers[source]();
      return data.map((c) => ({ ...c, live: true as const }));
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 1,
  });
}
