/**
 * Supported stock exchanges
 */
export enum Exchange {
  NYSE = 'NYSE',       // New York Stock Exchange
  NASDAQ = 'NASDAQ',   // NASDAQ Stock Market
  AMEX = 'AMEX',       // NYSE American (formerly American Stock Exchange)
  HKSE = 'HKSE',      // Hong Kong Stock Exchange
  SHH = 'SHH',        // Shanghai Stock Exchange
  SHZ = 'SHZ',        // Shenzhen Stock Exchange
  OTC = 'OTC'         // Over-the-Counter Market
}

/**
 * Market location types for stock searches
 */
export enum MarketLocation {
  GLOBAL = 'GLOBAL',   // All markets
  US = 'US',          // United States markets (NYSE, NASDAQ)
  HK = 'HK',          // Hong Kong market (HKSE)
  CN = 'CN'           // Chinese markets (SHH, SHZ)
}

/**
 * Maps market locations to their respective exchanges
 */
export const MARKET_EXCHANGES: Record<MarketLocation, Exchange[]> = {
  [MarketLocation.GLOBAL]: Object.values(Exchange),
  [MarketLocation.US]: [Exchange.NYSE, Exchange.NASDAQ, Exchange.AMEX, Exchange.OTC],
  [MarketLocation.HK]: [Exchange.HKSE],
  [MarketLocation.CN]: [Exchange.SHH, Exchange.SHZ]
};

/**
 * Type for exchange short names
 */
export type ExchangeShortName = keyof typeof Exchange;