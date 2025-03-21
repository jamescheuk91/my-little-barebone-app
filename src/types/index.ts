export type Language = 'en'

export interface ChatRequest {
  text: string;
  targetLanguage: Language;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: Language;
}

export interface TranslationResponse {
  translatedText: string;
  originalText: string;
}

export interface Stock {
  symbol: string;
  name: string;
  price?: number;
  exchange?: string;
  exchangeShortName?: string;
  type: string;
}

export interface StockData {
  timestamp: number;
  data: Stock[];
}

export interface SearchResult {
  stock: Stock;
  score: number;
  matchType: 'symbol' | 'name';
}

export interface ParsedResult {
  stocks: Stock[];
  translatedQuery: string;
  originalQuery?: string;
}

/**
 * Supported market locations for stock searches
 * global: Search across all markets
 * US: United States markets (NYSE, NASDAQ, etc.)
 * HK: Hong Kong market (HKSE)
 * CN: Chinese markets (Shanghai, Shenzhen)
 */
export type SupportedLocation = 'global' | 'US' | 'HK' | 'CN';

/**
 * Interface representing stock information used internally by the parser
 * Ensures exchangeShortName is required for internal use
 */
export interface StockInfo {
  symbol: string;
  name: string;
  exchangeShortName: string;
}

/**
 * Interface for search match results with confidence scoring
 */
export interface MatchResult {
  stock: StockInfo;
  confidence: number;
}

/**
 * Interface for cached index data with expiration and validation
 */
export interface CachedIndex {
  expiresAt: number;
  sourceHash: string;
  index: unknown;
}