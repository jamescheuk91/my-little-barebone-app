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
  query: string;
  originalQuery?: string;
}