import Fuse, { FuseResult } from "fuse.js";
import { getStockList } from "./StockDataService";
import { Stock, SupportedLocation } from "@/types";

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
      this.fuseIndices.set("global", new Fuse(stockList, {
        keys: ["name"],
        threshold: 0.3,
        minMatchCharLength: 2,
        includeScore: true
      }));
      this.stockCounts.set("global", stockList.length);
      
      // US stocks index (NYSE, NASDAQ, etc.)
      console.log('[StockFuzeMatchingService] initialize() - Filtering US stocks');
      const usStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase() || stock.exchange?.toUpperCase();
        return exchange && ["NYSE", "NASDAQ", "AMEX", "OTC"].includes(exchange);
      });
      console.log(`[StockFuzeMatchingService] initialize() - Creating US Fuse index with ${usStocks.length} stocks`);
      this.fuseIndices.set("US", new Fuse(usStocks, {
        keys: ["name"],
        threshold: 0.1,
        isCaseSensitive: false,
        minMatchCharLength: 4,
        ignoreLocation: false,
        includeScore: true
      }));
      this.stockCounts.set("US", usStocks.length);
      
      // CN stocks index (Shanghai, Shenzhen)
      console.log('[StockFuzeMatchingService] initialize() - Filtering CN stocks');
      const cnStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase() || stock.exchange?.toUpperCase();
        return exchange && ["SHANGHAI", "SHENZHEN", "SHH", "SHZ"].includes(exchange);
      });
      console.log(`[StockFuzeMatchingService] initialize() - Creating CN Fuse index with ${cnStocks.length} stocks`);
      this.fuseIndices.set("CN", new Fuse(cnStocks, {
        keys: ["name"],
        threshold: 0.35,
        minMatchCharLength: 2,
        // useExtendedSearch: true,
        includeScore: true
      }));
      this.stockCounts.set("CN", cnStocks.length);
      
      // HK stocks index (Hong Kong)
      console.log('[StockFuzeMatchingService] initialize() - Filtering HK stocks');
      const hkStocks = stockList.filter(stock => {
        const exchange = stock.exchangeShortName?.toUpperCase() || stock.exchange?.toUpperCase();
        return exchange && ["HONG KONG STOCK EXCHANGE", "HKSE", "HKG"].includes(exchange);
      });
      console.log(`[StockFuzeMatchingService] initialize() - Creating HK Fuse index with ${hkStocks.length} stocks`);
      this.fuseIndices.set("HK", new Fuse(hkStocks, {
        keys: ["name"],
        threshold: 0.35,
        minMatchCharLength: 2,
        // useExtendedSearch: true,
        includeScore: true
      }));
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

  search(query: string, location: SupportedLocation = "global"): Promise<StockSearchResult | null> {
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

export const searchStocks = async (query: string, location: SupportedLocation = "global"): Promise<StockSearchResult[]> => {
  console.log(`[searchStocks] Wrapper function called with query: "${query}", location: "${location}"`);
  try {
    const result = await stockFuzeMatchingService.search(query, location);
    console.log(`[searchStocks] Wrapper function returning ${result ? 'one result' : 'no results'}`);
    return result ? [result] : [];
  } catch (error) {
    console.error(`[searchStocks] Wrapper function error for query "${query}":`, error);
    return [];
  }
};
