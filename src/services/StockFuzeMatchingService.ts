import Fuse, { FuseResult } from "fuse.js";
import { getStockList } from "./StockDataService";
import { Stock, SupportedLanguage, SupportedLocation } from "@/types";
import { Exchange, MarketLocation } from "@/types/market";

// Define a type for the search result that includes the score
export interface StockSearchResult {
  item: Stock;
  score?: number;
}

export class StockFuzeMatchingService {
  private fuseIndices: Map<SupportedLocation, Fuse<Stock>> = new Map();
  private stockCounts: Map<SupportedLocation, number> = new Map();
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor() {
    console.debug('[StockFuzeMatchingService] Constructor called - Creating new instance');
    console.debug('[StockFuzeMatchingService] Current initialization state:', this.isInitialized);
    this.initialize();
  }

  private async initialize() {
    console.debug('[StockFuzeMatchingService] initialize() - Starting initialization');
    try {
      console.debug('[StockFuzeMatchingService] initialize() - Fetching stock list from StockDataService');
      // Store the initialization promise
      this.initializationPromise = (async () => {
        const stockList = await getStockList();
        if (!stockList || stockList.length === 0) {
          throw new Error('Stock list is empty or undefined');
        }
      console.debug(`[StockFuzeMatchingService] initialize() - Received ${stockList.length} stocks from StockDataService`);
      
      // Global index (all stocks)
      console.debug('[StockFuzeMatchingService] initialize() - Creating global Fuse index for all stocks');
      const fuzeIndexOptions = {
        keys: ["name", "symbol"],         // Search in both name and symbol
        threshold: 0.6,                   // Very high to catch severe typos like "Micorsft"
        isCaseSensitive: false,           // Case insensitive matching
        minMatchCharLength: 2,            // Lower to catch shorter matches
        ignoreLocation: true,             // Better for handling typos
        distance: 200,                    // Large distance for better fuzzy matching
        useExtendedSearch: true,          // Enable extended search for more flexibility
        includeScore: true,

      };
      this.fuseIndices.set(MarketLocation.GLOBAL, new Fuse(stockList, fuzeIndexOptions));
      this.stockCounts.set(MarketLocation.GLOBAL, stockList.length);
      
      // US stocks index (NYSE, NASDAQ, etc.)
      console.debug('[StockFuzeMatchingService] initialize() - Filtering US stocks');
      const usStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase()
        return exchange && [Exchange.NYSE, Exchange.NASDAQ, Exchange.AMEX].includes(exchange as Exchange);
      });

      console.debug(`[StockFuzeMatchingService] initialize() - Creating US Fuse index with ${usStocks.length} stocks`);
      this.fuseIndices.set(MarketLocation.US, new Fuse(usStocks, fuzeIndexOptions));
      this.stockCounts.set(MarketLocation.US, usStocks.length);
      
      // CN stocks index (SHH , SHZ)
      console.debug('[StockFuzeMatchingService] initialize() - Filtering CN stocks');
      const cnStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase();
        return exchange && [Exchange.SHH, Exchange.SHZ].includes(exchange as Exchange);
      });
      
      console.debug(`[StockFuzeMatchingService] initialize() - Creating CN Fuse index with ${cnStocks.length} stocks`);
      this.fuseIndices.set(MarketLocation.CN, new Fuse(cnStocks, fuzeIndexOptions));
      this.stockCounts.set(MarketLocation.CN, cnStocks.length);
      
      // HK stocks index (Hong Kong)
      console.debug('[StockFuzeMatchingService] initialize() create - Filtering HK stocks');
      const hkStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase();
        return exchange === Exchange.HKSE;
      });
      
      console.debug(`[StockFuzeMatchingService] initialize() - Creating HK Fuse index with ${hkStocks.length} stocks`);
      this.fuseIndices.set(MarketLocation.HK, new Fuse(hkStocks, fuzeIndexOptions));
      this.stockCounts.set(MarketLocation.HK, hkStocks.length);

      this.isInitialized = true;
      console.debug(`[StockFuzeMatchingService] initialize() - Initialization complete with indices for: ${Array.from(this.fuseIndices.keys()).join(', ')}`);
      
      // Log stock count per index for debugging
      for (const [location, count] of this.stockCounts.entries()) {
        console.debug(`[StockFuzeMatchingService] initialize() - Index "${location}" contains ${count} stocks`);
      }
      })();
      await this.initializationPromise;
    } catch (error) {
      console.error('[StockFuzeMatchingService] initialize() - Failed to initialize:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search(query: string, location: SupportedLocation, selectedLanguage: SupportedLanguage): Promise<StockSearchResult | null> {
    console.debug(`[StockFuzeMatchingService] search() - Starting with query: "${query}", location: "${location}"`);
    
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        if (this.initializationPromise) {
          console.debug('[StockFuzeMatchingService] search() - Waiting for initialization to complete...');
          this.initializationPromise
            .then(() => this.search(query, location, selectedLanguage))
            .then(resolve)
            .catch(reject);
          return;
        }
        console.error('[StockFuzeMatchingService] search() - Error: Fuse indices are not initialized yet');
        reject("Fuse indices are not initialized yet");
        return;
      }
      
      const fuseIndex = this.fuseIndices.get(location);
      if (!fuseIndex) {
        console.error(`[StockFuzeMatchingService] search() - Error: No index available for location: ${location}`);
        reject(`No index available for location: ${location}`);
        return;
      }
      
      const stockCount = this.stockCounts.get(location) || 0;
      console.debug(`[StockFuzeMatchingService] search() - Searching for '${query}' in location '${location}' with index size: ${stockCount}`);
      
      try {
        const fuzzyStockList: FuseResult<Stock>[] = fuseIndex.search(query, { limit: 3 });
        console.debug(`[StockFuzeMatchingService] search() - Found ${fuzzyStockList.length} matches for '${query}'`);
        
        // Log top matches for debugging
        if (fuzzyStockList.length > 0) {
          const topResults = fuzzyStockList.slice(0, Math.min(3, fuzzyStockList.length));
          console.debug('[StockFuzeMatchingService] search() - Top matches:');
          topResults.forEach((r, i) => {
            console.debug(`[StockFuzeMatchingService] search() - Match #${i+1}: Symbol: ${r.item.symbol}, Name: ${r.item.name}, Score: ${r.score}`);
          });
          const topMatch = fuzzyStockList.sort((a, b) => (a.score as number) - (b.score as number))[0]; 
          resolve(topMatch);
        } else {
          console.debug(`[StockFuzeMatchingService] search() - No matches found for '${query}'`);
          resolve(null);
        }
        
      } catch (searchError) {
        console.error(`[StockFuzeMatchingService] search() - Error searching for '${query}':`, searchError);
        reject(searchError);
      }
    });
  }
}

export const stockFuzeMatchingService = new StockFuzeMatchingService();

/**
 * Determines if there are market-specific keywords in the query
 * @param queryText The query to check
 * @returns The detected market location or null if none found
 */
const detectMarketFocus = (queryText: string): SupportedLocation | null => {
  const normalizedQuery = queryText.toLowerCase();
  
  // Keywords that indicate Hong Kong market focus
  // Added 'hong kong stocks' to better detect combined mentions like "Alibaba Hong Kong stocks"
  const hkKeywords = ['hong kong', 'hk stock', 'hong kong stock', 'hong kong stocks', '港股', 'hkse', 'hkex'];
  
  // Special case for "company name + Hong Kong" pattern that often indicates HK stocks
  if (normalizedQuery.includes('hong kong')) {
    console.debug(`[detectMarketFocus] Hong Kong market focus detected in: "${queryText}"`);
    return MarketLocation.HK;
  }
  
  if (hkKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.debug(`[detectMarketFocus] Hong Kong market focus detected in: "${queryText}"`);
    return MarketLocation.HK;
  }
  
  // Keywords that indicate China market focus
  const cnKeywords = ['shanghai', 'shenzhen', 'a-share', 'a share', 'china stock', 'china stocks', 'chinese stock', 'chinese stocks', '中国股', '中国股票', 'a股'];
  if (cnKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.debug(`[detectMarketFocus] China market focus detected in: "${queryText}"`);
    return MarketLocation.CN;
  }
  
  // Keywords that indicate US market focus
  const usKeywords = ['nasdaq', 'nyse', 'us stock', 'us stocks', 'american stock', 'american stocks', 'wall street', 'us share', 'us shares'];
  if (usKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.debug(`[detectMarketFocus] US market focus detected in: "${queryText}"`);
    return MarketLocation.US;
  }
  
  return null;
};

export const searchStocks = async (query: string, userSelectedLocation: SupportedLocation, selectedLanguage: SupportedLanguage, queryText?: string): Promise<StockSearchResult[]> => {
  console.debug(`[searchStocks] Wrapper function called with query: "${query}", userSelectedLocation: "${userSelectedLocation}", language: "${selectedLanguage}"`);
  
  // Determine the optimal search location based on various factors
  let focusedMarketLocation = userSelectedLocation;
  const results: StockSearchResult[] = [];
  
  // Step 1: Check for market-specific keywords in the queryText
  if (queryText) {
    const detectedMarket = detectMarketFocus(queryText);
    if (detectedMarket) {
      // Always use the detected market regardless of user selection
      // This ensures that when a user mentions "Hong Kong" in a query, we search in HK
      focusedMarketLocation = detectedMarket;
      console.debug(`[searchStocks] Market focus detected in query ("${detectedMarket}"). ${userSelectedLocation !== detectedMarket ? `Overriding user selection (${userSelectedLocation}).` : ''} Switching to ${focusedMarketLocation} location for search.`);
    }
  }
  
  // Step 2: For non-English languages with global location, select a specific market location
  if (focusedMarketLocation === 'GLOBAL' && selectedLanguage !== 'en') {
    if (selectedLanguage === 'zh-CN') {
      focusedMarketLocation = MarketLocation.CN;
      console.debug(`[searchStocks] Non-English language with global location detected. Switching to CN location for search.`);
    } else if (selectedLanguage === 'zh-TW') {
      focusedMarketLocation = MarketLocation.HK;
      console.debug(`[searchStocks] Non-English language with global location detected. Switching to HK location for search.`);
    }
  }
  
  try {
    // If we've detected a specific market from the query and it wasn't explicitly selected by the user
    if (focusedMarketLocation !== userSelectedLocation) {
      console.debug(`[searchStocks] First searching in detected market: ${focusedMarketLocation}`);
      // Try market-specific search first
      const marketSpecificResult = await stockFuzeMatchingService.search(query, focusedMarketLocation, selectedLanguage);
      if (marketSpecificResult) {
        results.push(marketSpecificResult);
        console.debug(`[searchStocks] Found result in detected market ${focusedMarketLocation} for "${query}": ${marketSpecificResult.item.symbol}`);
      }
      
      // If we didn't find anything in the detected market, fallback to global search
      if (results.length === 0) {
        console.debug(`[searchStocks] No results in detected market. Falling back to user selected location: ${userSelectedLocation}`);
        const globalResult = await stockFuzeMatchingService.search(query, userSelectedLocation, selectedLanguage);
        if (globalResult) {
          results.push(globalResult);
          console.debug(`[searchStocks] Found fallback result for "${query}": ${globalResult.item.symbol}`);
        }
      }
    } else {
      // Use the user's selected location directly
      const result = await stockFuzeMatchingService.search(query, focusedMarketLocation, selectedLanguage);
      if (result) {
        results.push(result);
        console.debug(`[searchStocks] Found result in ${focusedMarketLocation} for "${query}": ${result.item.symbol}`);
      }
    }
    
    console.debug(`[searchStocks] Wrapper function returning ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`[searchStocks] Wrapper function error for query "${query}":`, error);
    return [];
  }
};
