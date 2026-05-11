// Demo data for crypto monitor — replace with real API later (CoinGecko / Binance / CryptoCompare)

export type Coin = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  rsi: number;
  strength: number; // 0-100 relative strength score
  // Optional metadata used by extended providers (top 100, search, detail page)
  id?: string;        // CoinGecko id, e.g. "bitcoin"
  image?: string;     // logo URL
  rank?: number;      // market cap rank
  high24h?: number;
  low24h?: number;
  ath?: number;
  athChangePct?: number;
  circulatingSupply?: number;
  totalSupply?: number;
};

export const coins: Coin[] = [
  { symbol: "BTC", name: "Bitcoin", price: 71240, change24h: 2.4, change7d: 5.8, volume24h: 38.4e9, marketCap: 1.41e12, rsi: 62, strength: 78 },
  { symbol: "ETH", name: "Ethereum", price: 3820, change24h: 3.1, change7d: 8.2, volume24h: 21.7e9, marketCap: 458e9, rsi: 65, strength: 82 },
  { symbol: "SOL", name: "Solana", price: 184.5, change24h: 5.7, change7d: 14.3, volume24h: 4.2e9, marketCap: 87e9, rsi: 71, strength: 89 },
  { symbol: "BNB", name: "BNB", price: 612, change24h: 1.2, change7d: 3.4, volume24h: 1.8e9, marketCap: 92e9, rsi: 58, strength: 64 },
  { symbol: "XRP", name: "XRP", price: 0.58, change24h: -1.4, change7d: -2.1, volume24h: 1.4e9, marketCap: 32e9, rsi: 44, strength: 38 },
  { symbol: "AVAX", name: "Avalanche", price: 38.2, change24h: 4.8, change7d: 11.6, volume24h: 720e6, marketCap: 14e9, rsi: 68, strength: 76 },
  { symbol: "LINK", name: "Chainlink", price: 16.8, change24h: 2.9, change7d: 6.1, volume24h: 480e6, marketCap: 9.8e9, rsi: 60, strength: 71 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.142, change24h: -0.8, change7d: 1.2, volume24h: 890e6, marketCap: 20e9, rsi: 49, strength: 45 },
  { symbol: "MATIC", name: "Polygon", price: 0.78, change24h: -2.1, change7d: -4.6, volume24h: 320e6, marketCap: 7.2e9, rsi: 38, strength: 28 },
  { symbol: "ARB", name: "Arbitrum", price: 1.24, change24h: 6.4, change7d: 18.2, volume24h: 410e6, marketCap: 4.8e9, rsi: 73, strength: 85 },
];

export type SentimentData = {
  fearGreedIndex: number; // 0-100
  fearGreedLabel: string;
  btcDominance: number;
  ethDominance: number;
  totalMarketCap: number;
  marketCapChange24h: number;
  trend: "bullish" | "bearish" | "neutral";
};

export const sentiment: SentimentData = {
  fearGreedIndex: 72,
  fearGreedLabel: "Chciwość",
  btcDominance: 52.4,
  ethDominance: 16.8,
  totalMarketCap: 2.69e12,
  marketCapChange24h: 2.8,
  trend: "bullish",
};

// Capital flow rotation BTC -> ETH -> SOL -> alts (last 14 days)
export const capitalFlow = [
  { day: "D-13", BTC: 100, ETH: 95, SOL: 90, ALT: 85 },
  { day: "D-12", BTC: 102, ETH: 96, SOL: 92, ALT: 86 },
  { day: "D-11", BTC: 104, ETH: 98, SOL: 95, ALT: 87 },
  { day: "D-10", BTC: 105, ETH: 101, SOL: 98, ALT: 89 },
  { day: "D-9", BTC: 106, ETH: 104, SOL: 102, ALT: 91 },
  { day: "D-8", BTC: 107, ETH: 107, SOL: 106, ALT: 93 },
  { day: "D-7", BTC: 108, ETH: 110, SOL: 110, ALT: 96 },
  { day: "D-6", BTC: 108, ETH: 112, SOL: 114, ALT: 99 },
  { day: "D-5", BTC: 109, ETH: 114, SOL: 118, ALT: 103 },
  { day: "D-4", BTC: 109, ETH: 115, SOL: 122, ALT: 107 },
  { day: "D-3", BTC: 110, ETH: 117, SOL: 126, ALT: 112 },
  { day: "D-2", BTC: 110, ETH: 118, SOL: 130, ALT: 117 },
  { day: "D-1", BTC: 111, ETH: 119, SOL: 133, ALT: 122 },
  { day: "Dziś", BTC: 112, ETH: 121, SOL: 138, ALT: 128 },
];

export type Setup = {
  symbol: string;
  type: "Long" | "Short" | "Obserwuj";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  confidence: number; // 0-100
  reason: string;
  timeframe: string;
};

export const setups: Setup[] = [
  {
    symbol: "SOL",
    type: "Long",
    entry: 184.5,
    stopLoss: 176,
    takeProfit: 210,
    riskReward: 3.0,
    confidence: 82,
    reason: "Silny breakout z konsolidacji + rosnący wolumen + RSI 71 (jeszcze nie wykupione strukturalnie)",
    timeframe: "4H",
  },
  {
    symbol: "ARB",
    type: "Long",
    entry: 1.24,
    stopLoss: 1.16,
    takeProfit: 1.48,
    riskReward: 3.0,
    confidence: 78,
    reason: "Najwyższa siła relatywna 7D (+18%), rotacja kapitału w alty L2",
    timeframe: "1D",
  },
  {
    symbol: "ETH",
    type: "Long",
    entry: 3820,
    stopLoss: 3680,
    takeProfit: 4150,
    riskReward: 2.4,
    confidence: 74,
    reason: "Higher highs + dominacja ETH rośnie, kapitał płynie z BTC",
    timeframe: "1D",
  },
  {
    symbol: "MATIC",
    type: "Short",
    entry: 0.78,
    stopLoss: 0.83,
    takeProfit: 0.68,
    riskReward: 2.0,
    confidence: 65,
    reason: "Najsłabsza relatywnie (-4.6% 7D), RSI 38, pęknięty support",
    timeframe: "4H",
  },
  {
    symbol: "XRP",
    type: "Obserwuj",
    entry: 0.58,
    stopLoss: 0.55,
    takeProfit: 0.64,
    riskReward: 2.0,
    confidence: 48,
    reason: "Brak wyraźnego trendu, czekać na wybicie z zakresu 0.55–0.62",
    timeframe: "1D",
  },
];

export type Alert = {
  id: string;
  time: string;
  symbol: string;
  level: "info" | "warning" | "critical";
  message: string;
};

export const alerts: Alert[] = [
  { id: "1", time: "14:32", symbol: "SOL", level: "critical", message: "Wybicie powyżej 184$ z wolumenem +180% — potwierdzony breakout" },
  { id: "2", time: "13:18", symbol: "ARB", level: "warning", message: "RSI 73 — strefa wykupienia, ostrożnie z pogonią" },
  { id: "3", time: "12:05", symbol: "BTC", level: "info", message: "Dominacja BTC spadła do 52.4% — rotacja w alty trwa" },
  { id: "4", time: "10:47", symbol: "MATIC", level: "warning", message: "Złamanie supportu 0.80$ — możliwa kontynuacja spadków" },
  { id: "5", time: "09:22", symbol: "ETH", level: "info", message: "Funding rate dodatni — przewaga longów na futures" },
  { id: "6", time: "08:10", symbol: "AVAX", level: "info", message: "Wzrost wolumenu o 45% w ostatnich 4h" },
];

// Polish glossary of trading terms
export const glossary = [
  { term: "Long", pl: "Pozycja długa", desc: "Kupujesz licząc na wzrost ceny." },
  { term: "Short", pl: "Pozycja krótka", desc: "Sprzedajesz licząc na spadek ceny." },
  { term: "Stop Loss (SL)", pl: "Zlecenie obronne", desc: "Automatyczne zamknięcie pozycji ze stratą — limit ryzyka." },
  { term: "Take Profit (TP)", pl: "Realizacja zysku", desc: "Automatyczne zamknięcie pozycji z zyskiem." },
  { term: "RSI", pl: "Wskaźnik siły względnej", desc: "0–100. Powyżej 70 = wykupienie, poniżej 30 = wyprzedanie." },
  { term: "Risk/Reward (RR)", pl: "Stosunek ryzyka do zysku", desc: "Np. RR 3.0 = potencjalny zysk 3× większy niż ryzyko." },
  { term: "Breakout", pl: "Wybicie", desc: "Cena przebija ważny poziom oporu/supportu." },
  { term: "Support", pl: "Wsparcie", desc: "Poziom, od którego cena historycznie odbija w górę." },
  { term: "Resistance", pl: "Opór", desc: "Poziom, od którego cena historycznie zawraca w dół." },
  { term: "Dominance", pl: "Dominacja", desc: "Udział kapitalizacji danej krypto w całym rynku." },
  { term: "Fear & Greed", pl: "Strach i Chciwość", desc: "Indeks 0–100 mierzący nastroje rynku." },
  { term: "Funding rate", pl: "Stopa finansowania", desc: "Opłata płacona między longami a shortami na rynku futures." },
  { term: "Liquidity / Volume", pl: "Płynność / Wolumen", desc: "Ile pieniędzy obraca się danym aktywem." },
  { term: "Rotacja kapitału", pl: "Przepływ kapitału", desc: "Przesunięcie pieniędzy między BTC → ETH → SOL → alty." },
  { term: "Setup", pl: "Konfiguracja transakcji", desc: "Plan wejścia: entry, SL, TP, uzasadnienie." },
];

export type SimpleAdvice = {
  headline: string;
  action: "Kupuj selektywnie" | "Sprzedawaj słabe" | "Czekaj" | "Realizuj zyski";
  color: "bull" | "bear" | "neutral" | "warning";
  bullets: string[];
};

export const simpleAdvice: SimpleAdvice = {
  headline: "Rynek w fazie rotacji — kapitał płynie z BTC w alty",
  action: "Kupuj selektywnie",
  color: "bull",
  bullets: [
    "Najsilniejsze: SOL, ARB, ETH — szukaj wejść na korektach",
    "Unikaj: MATIC, XRP — słabość relatywna, brak wolumenu",
    "Trzymaj 30–40% kapitału w gotówce na ewentualne wstrząsy",
    "RSI rynku zbliża się do 70 — nie kupuj na euforii",
  ],
};
