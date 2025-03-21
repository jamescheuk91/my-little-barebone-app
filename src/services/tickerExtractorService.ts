import { findEntities } from './NLPEntityService';
import { getStockList } from './StockDataService';
import { Stock, SupportedLocation } from '@/types';
import { searchStocks } from './StockFuzeMatchingService';

// Define mapping of exchanges by location for cleaner code
const LOCATION_EXCHANGES: Record<SupportedLocation, string[]> = {
  'GLOBAL': [],
  'US': ['NYSE', 'NASDAQ', 'AMEX', 'OTC'],
  'CN': ['SHANGHAI', 'SHENZHEN', 'SHH', 'SHZ'],
  'HK': ['HONG KONG STOCK EXCHANGE', 'HKSE', 'HKG']
};

/**
 * Service for extracting stock tickers from text
 */
export class TickerExtractorService {
  private stockInfoMap: Map<string, Stock>;
  private isInitialized = false;
  
  /**
   * Creates a new instance of TickerExtractorService
   * Loads stock data and builds the lookup map
   */
  constructor() {
    console.log('[TickerExtractorService] Constructor called - Creating new instance');
    this.stockInfoMap = new Map<string, Stock>();
    this.init();
  }
  
  /**
   * Initializes the service by loading stock data and building the lookup map
   */
  async init(): Promise<void> {
    console.log('[TickerExtractorService] init() - Starting initialization');
    try {
      // Get stock list from the StockDataService
      console.log('[TickerExtractorService] init() - Fetching stock list from StockDataService');
      const stockList = await getStockList();
      console.log(`[TickerExtractorService] init() - Received ${stockList.length} stocks from StockDataService`);
      
      // Build symbol to stock info map
      console.log('[TickerExtractorService] init() - Building symbol to stock info map');
      
      stockList.forEach(stock => {
        // Add by symbol
        this.stockInfoMap.set(stock.symbol, stock);
      });
      
      this.isInitialized = true;
      console.log(`[TickerExtractorService] init() - Initialization complete with ${stockList.length} stocks`);
    } catch (error) {
      console.error('[TickerExtractorService] init() - Error initializing:', error);
      throw error;
    }
  }
  
  /**
   * Checks if a stock belongs to the specified location
   * @param stock The stock to check
   * @param location The location to filter by
   * @returns True if the stock belongs to the location, false otherwise
   */
  private stockMatchesLocation(stock: Stock, location: SupportedLocation): boolean {
    // Global location includes all exchanges
    if (location === 'GLOBAL') {
      return true;
    }
    
    // Get the exchange from the stock
    const exchange = stock.exchangeShortName?.toUpperCase() || stock.exchange?.toUpperCase() || '';
    
    // Check if the exchange is in the list for the specified location
    return LOCATION_EXCHANGES[location].some(loc => exchange.includes(loc));
  }
  
  /**
   * Finds direct matches for entities in the stockInfoMap
   * @param entities The entities to match
   * @param location The location to filter by
   * @returns An array of stocks that match the entities
   */
  private findDirectMatches(entities: string[], location: SupportedLocation): Stock[] {
    console.log('[TickerExtractorService] findDirectMatches() - Finding direct matches');
    const directMatches: Stock[] = [];
    
    entities.forEach(entity => {
      console.log(`[TickerExtractorService] findDirectMatches() - Checking entity: "${entity}"`);
      // Check for direct match by symbol
      const stockInfo = this.stockInfoMap.get(entity.toUpperCase());
      
      if (!stockInfo) {
        console.log(`[TickerExtractorService] findDirectMatches() - No direct match found for "${entity}"`);
        return;
      }
      
      // Apply location filtering
      if (this.stockMatchesLocation(stockInfo, location)) {
        console.log(`[TickerExtractorService] findDirectMatches() - Direct match found for "${entity}" in ${location}: ${JSON.stringify(stockInfo)}`);
        directMatches.push(stockInfo);
      } else {
        console.log(`[TickerExtractorService] findDirectMatches() - Direct match found for "${entity}" but filtered out due to location: ${location}`);
      }
    });
    
    return directMatches;
  }
  
  /**
   * Finds fuzzy matches for entities using StockFuzeMatchingService
   * @param entities The entities to match
   * @param location The location to filter by
   * @returns An array of stocks that fuzzy match the entities
   */
  private async findFuzzyMatches(entities: string[], location: SupportedLocation): Promise<Stock[]> {
    console.log('[TickerExtractorService] findFuzzyMatches() - Starting fuzzy matching');
    
    // Create an array of promises for parallel processing
    const fuzzyMatchPromises = entities.map(async entity => {
      console.log(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matching entity: "${entity}"`);
      const matchResults = await searchStocks(entity, location);
      console.log(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matches for "${entity}": ${matchResults.length}`);
      
      if (matchResults.length > 0) {
        console.log(`[TickerExtractorService] findFuzzyMatches() - Top match for "${entity}": ${JSON.stringify(matchResults[0])}`);
      }
      
      return matchResults.map(result => result.item);
    });
    
    // Wait for all fuzzy match operations to complete
    const fuzzyMatchResults = await Promise.all(fuzzyMatchPromises);
    
    // Flatten the results
    return fuzzyMatchResults.flat();
  }
  
  /**
   * Removes duplicate stocks from an array based on stock symbol
   * @param stocks The array of stocks to deduplicate
   * @returns An array with duplicate stocks removed
   */
  private deduplicate(stocks: Stock[]): Stock[] {
    const uniqueSymbols = new Set<string>();
    const uniqueStocks: Stock[] = [];
    
    stocks.forEach(stock => {
      if (!uniqueSymbols.has(stock.symbol)) {
        uniqueSymbols.add(stock.symbol);
        uniqueStocks.push(stock);
      }
    });
    
    return uniqueStocks;
  }
  
  /**
   * Extracts stock tickers from the input text
   * @param text The input text to extract tickers from
   * @param location The location to filter by
   * @returns An array of extracted stocks
   */
  async extractTickers(text: string, location: SupportedLocation): Promise<Stock[]> {
    console.log(`[TickerExtractorService] extractTickers() - Starting with text: "${text}", location: ${location}`);
    
    if (!text || text.trim() === '') {
      console.log('[TickerExtractorService] extractTickers() - Empty text provided, returning empty array');
      return [];
    }
    
    try {
      // Ensure the service is initialized
      if (!this.isInitialized || this.stockInfoMap.size === 0) {
        console.log('[TickerExtractorService] extractTickers() - StockInfoMap is empty, initializing');
        await this.init();
      } else {
        console.log(`[TickerExtractorService] extractTickers() - StockInfoMap already contains ${this.stockInfoMap.size} entries`);
      }
      
      // Extract entities from text
      console.log('[TickerExtractorService] extractTickers() - Calling findEntities to extract potential entities');
      const entities = await findEntities(text);
      console.log(`[TickerExtractorService] extractTickers() - Found ${entities.length} entities: ${JSON.stringify(entities)}`);
      
      if (entities.length === 0) {
        return [];
      }
      
      // Find direct matches
      const directMatches = this.findDirectMatches(entities, location);
      console.log(`[TickerExtractorService] extractTickers() - Direct matches: ${directMatches.length}`);
      
      // Find fuzzy matches
      const fuzzyMatches = await this.findFuzzyMatches(entities, location);
      console.log(`[TickerExtractorService] extractTickers() - Total fuzzy matches: ${fuzzyMatches.length}`);
      
      // Combine and deduplicate matches
      const allMatches = this.deduplicate([...directMatches, ...fuzzyMatches]);
      console.log(`[TickerExtractorService] extractTickers() - Total unique matches: ${allMatches.length}`);
      
      return allMatches;
    } catch (error) {
      console.error('[TickerExtractorService] extractTickers() - Error:', error);
      return [];
    }
  }
}

// Create a singleton instance for easy import and use
const tickerExtractorService = new TickerExtractorService();

/**
 * Extracts stock tickers from the input text
 * @param text The input text to extract tickers from
 * @param location The location to filter by
 * @returns An array of extracted stocks
 */
export const extractTickers = async (text: string, location: SupportedLocation): Promise<Stock[]> => {
  console.log(`[extractTickers] Wrapper function called with text: "${text}", location: ${location}`);
  const result = await tickerExtractorService.extractTickers(text, location);
  console.log(`[extractTickers] Wrapper function returning ${result.length} results`);
  return result;
};