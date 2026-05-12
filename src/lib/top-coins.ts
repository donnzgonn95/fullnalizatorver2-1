import { useQuery } from "@tanstack/react-query";
import {
  fetchTop100Coins,
  fetchCoinOHLC,
  fetchCoinVolumes,
  type Candle,
  type VolumePoint,
} from "@/lib/providers/coingecko-top";
import type { Coin } from "@/lib/demo-data";

// ---- Cache strategy ----
// Top 100 list: refresh every 2 min (it's a heavy endpoint).
// OHLC: 5 min (CoinGecko caches OHLC for ~30 min anyway).
// Volumes: 5 min.
// All queries share React Query cache via stable keys → opening the same coin
// twice or jumping between ranges hits the in-memory cache, not the network.

const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;

export function useTopCoins(enabled: boolean = true) {
  return useQuery({
    queryKey: ["coins", "top100"],
    queryFn: fetchTop100Coins,
    enabled,
    refetchInterval: enabled ? TWO_MIN : false,
    staleTime: TWO_MIN,
    gcTime: TEN_MIN,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCoinOHLC(id: string | undefined, days: number) {
  return useQuery({
    queryKey: ["ohlc", id, days],
    queryFn: () => fetchCoinOHLC(id!, days),
    enabled: !!id,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchInterval: false, // OHLC rarely changes between candles; user can switch range to refresh
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCoinVolumes(id: string | undefined, days: number) {
  return useQuery({
    queryKey: ["vol", id, days],
    queryFn: () => fetchCoinVolumes(id!, days),
    enabled: !!id,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchInterval: false,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export type { Candle, Coin, VolumePoint };
