import { ExchangeShortName } from './market';

/**
 * Supported languages for translation and chat functionality
 * en: English
 * zh-CN: Simplified Chinese
 * zh-TW: Traditional Chinese
 */
export type SupportedLanguage = 'en' | 'zh-CN' | 'zh-TW'

export interface ChatRequest {
  text: string;
  targetLanguage: SupportedLanguage;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: SupportedLanguage;
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
  exchangeShortName?: ExchangeShortName;
  type: string;
  _directSymbolMatch?: boolean;
  _matchScore?: number;
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
  queryText: string;
  originalQuery?: string;
}

export type { MarketLocation as SupportedLocation } from './market';

/**
 * Interface representing stock information used internally by the parser
 * Ensures exchangeShortName is required for internal use
 */
export interface StockInfo {
  symbol: string;
  name: string;
  exchangeShortName: ExchangeShortName;
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