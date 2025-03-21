import Fuse, { FuseResult } from "fuse.js";
import { getStockList } from "./StockDataService";
import { Stock, SupportedLanguage, SupportedLocation } from "@/types";

// Define a type for the search result that includes the score
export interface StockSearchResult {
  item: Stock;
  score?: number;
}

export class StockFuzeMatchingService {
  private fuseIndices: Map<SupportedLocation, Fuse<Stock>> = new Map();
  private stockCounts: Map<SupportedLocation, number> = new Map();
  private isInitialized = false;

  constructor() {
    console.log('[StockFuzeMatchingService] Constructor called - Creating new instance');
    this.initialize();
  }

  private async initialize() {
    console.log('[StockFuzeMatchingService] initialize() - Starting initialization');
    try {
      console.log('[StockFuzeMatchingService] initialize() - Fetching stock list from StockDataService');
      const stockList = await getStockList();
      console.log(`[StockFuzeMatchingService] initialize() - Received ${stockList.length} stocks from StockDataService`);
      
      // Global index (all stocks)
      console.log('[StockFuzeMatchingService] initialize() - Creating global Fuse index for all stocks');
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
      this.fuseIndices.set("GLOBAL", new Fuse(stockList, fuzeIndexOptions));
      this.stockCounts.set("GLOBAL", stockList.length);
      
      // US stocks index (NYSE, NASDAQ, etc.)
      console.log('[StockFuzeMatchingService] initialize() - Filtering US stocks');
      const usStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase()
        return exchange && ["NYSE", "NASDAQ", "AMEX", "OTC"].includes(exchange);
      });

      console.log(`[StockFuzeMatchingService] initialize() - Creating US Fuse index with ${usStocks.length} stocks`);
      this.fuseIndices.set("US", new Fuse(usStocks, fuzeIndexOptions));
      this.stockCounts.set("US", usStocks.length);
      
      // CN stocks index (SHH , SHZ)
      console.log('[StockFuzeMatchingService] initialize() - Filtering CN stocks');
      const cnStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase();
        return exchange && ["SHH", "SHZ"].includes(exchange);
      });
      
      console.log(`[StockFuzeMatchingService] initialize() - Creating CN Fuse index with ${cnStocks.length} stocks`);
      this.fuseIndices.set("CN", new Fuse(cnStocks, fuzeIndexOptions));
      this.stockCounts.set("CN", cnStocks.length);
      
      // HK stocks index (Hong Kong)
      console.log('[StockFuzeMatchingService] initialize() - Filtering HK stocks');
      const hkStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase();
        return exchange === "HKSE";
      });
      
      console.log(`[StockFuzeMatchingService] initialize() - Creating HK Fuse index with ${hkStocks.length} stocks`);
      this.fuseIndices.set("HK", new Fuse(hkStocks, fuzeIndexOptions));
      this.stockCounts.set("HK", hkStocks.length);

      this.isInitialized = true;
      console.log(`[StockFuzeMatchingService] initialize() - Initialization complete with indices for: ${Array.from(this.fuseIndices.keys()).join(', ')}`);
      
      // Log stock count per index for debugging
      for (const [location, count] of this.stockCounts.entries()) {
        console.log(`[StockFuzeMatchingService] initialize() - Index "${location}" contains ${count} stocks`);
      }
    } catch (error) {
      console.error('[StockFuzeMatchingService] initialize() - Failed to initialize:', error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search(query: string, location: SupportedLocation, selectedLanguage: SupportedLanguage): Promise<StockSearchResult | null> {
    console.log(`[StockFuzeMatchingService] search() - Starting with query: "${query}", location: "${location}"`);
    
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
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
      console.log(`[StockFuzeMatchingService] search() - Searching for '${query}' in location '${location}' with index size: ${stockCount}`);
      
      try {
        const fuzzyStockList: FuseResult<Stock>[] = fuseIndex.search(query);
        console.log(`[StockFuzeMatchingService] search() - Found ${fuzzyStockList.length} matches for '${query}'`);
        
        // Log top matches for debugging
        if (fuzzyStockList.length > 0) {
          const topResults = fuzzyStockList.slice(0, Math.min(3, fuzzyStockList.length));
          console.log('[StockFuzeMatchingService] search() - Top matches:');
          topResults.forEach((r, i) => {
            console.log(`[StockFuzeMatchingService] search() - Match #${i+1}: Symbol: ${r.item.symbol}, Name: ${r.item.name}, Score: ${r.score}`);
          });
          const topMatch = fuzzyStockList.sort((a, b) => (a.score as number) - (b.score as number))[0]; 
          resolve(topMatch);
        } else {
          console.log(`[StockFuzeMatchingService] search() - No matches found for '${query}'`);
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
    console.log(`[detectMarketFocus] Hong Kong market focus detected in: "${queryText}"`);
    return 'HK';
  }
  
  if (hkKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.log(`[detectMarketFocus] Hong Kong market focus detected in: "${queryText}"`);
    return 'HK';
  }
  
  // Keywords that indicate China market focus
  const cnKeywords = ['shanghai', 'shenzhen', 'a-share', 'a share', 'china stock', 'china stocks', 'chinese stock', 'chinese stocks', '中国股', '中国股票', 'a股'];
  if (cnKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.log(`[detectMarketFocus] China market focus detected in: "${queryText}"`);
    return 'CN';
  }
  
  // Keywords that indicate US market focus
  const usKeywords = ['nasdaq', 'nyse', 'us stock', 'us stocks', 'american stock', 'american stocks', 'wall street', 'us share', 'us shares'];
  if (usKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    console.log(`[detectMarketFocus] US market focus detected in: "${queryText}"`);
    return 'US';
  }
  
  return null;
};

export const searchStocks = async (query: string, userSelectedLocation: SupportedLocation, selectedLanguage: SupportedLanguage, queryText?: string): Promise<StockSearchResult[]> => {
  console.log(`[searchStocks] Wrapper function called with query: "${query}", userSelectedLocation: "${userSelectedLocation}", language: "${selectedLanguage}"`);
  
  // Determine the optimal search location based on various factors
  let focusedMarketLocation = userSelectedLocation;
  const results: StockSearchResult[] = [];
  
  // Step 1: Check for market-specific keywords in the queryText
  if (queryText && userSelectedLocation === 'GLOBAL') {
    const detectedMarket = detectMarketFocus(queryText);
    if (detectedMarket) {
      focusedMarketLocation = detectedMarket;
      console.log(`[searchStocks] Market focus detected in query. Switching to ${focusedMarketLocation} location for search.`);
    }
  }
  
  // Step 2: For non-English languages with global location, select a specific market location
  if (focusedMarketLocation === 'GLOBAL' && selectedLanguage !== 'en') {
    if (selectedLanguage === 'zh-CN') {
      focusedMarketLocation = 'CN';
      console.log(`[searchStocks] Non-English language with global location detected. Switching to CN location for search.`);
    } else if (selectedLanguage === 'zh-TW') {
      focusedMarketLocation = 'HK';
      console.log(`[searchStocks] Non-English language with global location detected. Switching to HK location for search.`);
    }
  }
  
  try {
    // If we've detected a specific market from the query and it wasn't explicitly selected by the user
    if (focusedMarketLocation !== userSelectedLocation) {
      console.log(`[searchStocks] First searching in detected market: ${focusedMarketLocation}`);
      // Try market-specific search first
      const marketSpecificResult = await stockFuzeMatchingService.search(query, focusedMarketLocation, selectedLanguage);
      if (marketSpecificResult) {
        results.push(marketSpecificResult);
        console.log(`[searchStocks] Found result in detected market ${focusedMarketLocation} for "${query}": ${marketSpecificResult.item.symbol}`);
      }
      
      // If we didn't find anything in the detected market, fallback to global search
      if (results.length === 0) {
        console.log(`[searchStocks] No results in detected market. Falling back to user selected location: ${userSelectedLocation}`);
        const globalResult = await stockFuzeMatchingService.search(query, userSelectedLocation, selectedLanguage);
        if (globalResult) {
          results.push(globalResult);
          console.log(`[searchStocks] Found fallback result for "${query}": ${globalResult.item.symbol}`);
        }
      }
    } else {
      // Use the user's selected location directly
      const result = await stockFuzeMatchingService.search(query, focusedMarketLocation, selectedLanguage);
      if (result) {
        results.push(result);
        console.log(`[searchStocks] Found result in ${focusedMarketLocation} for "${query}": ${result.item.symbol}`);
      }
    }
    
    console.log(`[searchStocks] Wrapper function returning ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`[searchStocks] Wrapper function error for query "${query}":`, error);
    return [];
  }
};
