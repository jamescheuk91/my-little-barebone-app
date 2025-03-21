import { findEntities } from './NLPEntityService';
import { getStockList } from './StockDataService';
import { Stock, SupportedLocation } from '@/types';
import { searchStocks } from './StockFuzeMatchingService';

/**
 * Service for extracting stock tickers from text
 */
export class TickerExtractorService {
  private stockInfoMap: Map<string, Stock>;
  
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
        // Add by symbol (uppercase for case-insensitive matching)
        this.stockInfoMap.set(stock.symbol, stock);
      });
      
      console.log(`[TickerExtractorService] init() - Initialization complete with ${stockList.length} stocks`);
    } catch (error) {
      console.error('[TickerExtractorService] init() - Error initializing:', error);
      throw error;
    }
  }
  
  /**
   * Extracts stock tickers from the input text
   * @param text The input text to extract tickers from
   * @returns An array of extracted ticker symbols
   */
  async extractTickers(text: string, location: SupportedLocation): Promise<Stock[]> {
    console.log(`[TickerExtractorService] extractTickers() - Starting with text: "${text}", location: ${location}`);
    
    if (!text || text.trim() === '') {
      console.log('[TickerExtractorService] extractTickers() - Empty text provided, returning empty array');
      return [];
    }
    
    try {
      // Ensure the service is initialized
      if (this.stockInfoMap.size === 0) {
        console.log('[TickerExtractorService] extractTickers() - StockInfoMap is empty, initializing');
        await this.init();
      } else {
        console.log(`[TickerExtractorService] extractTickers() - StockInfoMap already contains ${this.stockInfoMap.size} entries`);
      }
      
      // Use findEntities to extract potential entities from the text
      console.log('[TickerExtractorService] extractTickers() - Calling findEntities to extract potential entities');
      const entities = await findEntities(text);
      console.log(`[TickerExtractorService] extractTickers() - Found ${entities.length} entities: ${JSON.stringify(entities)}`);
      
      // Match entities to stock symbols
      console.log('[TickerExtractorService] extractTickers() - Matching entities to stock symbols');
      const directMatches: Stock[] = [];
      
      entities.forEach(entity => {
        console.log(`[TickerExtractorService] extractTickers() - Checking entity: "${entity}"`);
        // Check for direct match by symbol
        const stockInfo = this.stockInfoMap.get(entity.toUpperCase());
        if (stockInfo) {
          // If global, ignore location filtering
          if (location === 'global') {
            console.log(`[TickerExtractorService] extractTickers() - Direct match found for "${entity}": ${JSON.stringify(stockInfo)}`);
            directMatches.push(stockInfo);
          } else {
            // Apply location filtering
            const exchange = stockInfo.exchangeShortName?.toUpperCase() || stockInfo.exchange?.toUpperCase() || '';
            let matchesLocation = false;
            
            // Location-specific filtering
            if (location === 'US' && ["NYSE", "NASDAQ", "AMEX", "OTC"].includes(exchange)) {
              matchesLocation = true;
            } else if (location === 'CN' && ["SHANGHAI", "SHENZHEN", "SHH", "SHZ"].includes(exchange)) {
              matchesLocation = true;
            } else if (location === 'HK' && ["HONG KONG STOCK EXCHANGE", "HKSE", "HKG"].includes(exchange)) {
              matchesLocation = true;
            }
            
            if (matchesLocation) {
              console.log(`[TickerExtractorService] extractTickers() - Direct match found for "${entity}" in ${location}: ${JSON.stringify(stockInfo)}`);
              directMatches.push(stockInfo);
            } else {
              console.log(`[TickerExtractorService] extractTickers() - Direct match found for "${entity}" but filtered out due to location: ${location}`);
            }
          }
        } else {
          console.log(`[TickerExtractorService] extractTickers() - No direct match found for "${entity}"`);
        }
      });

      console.log(`[TickerExtractorService] extractTickers() - Direct matches: ${directMatches.length}`);
      
      // use StockFuzeMatchingService to find stocks
      console.log('[TickerExtractorService] extractTickers() - Starting fuzzy matching with StockFuzeMatchingService');
      const fuzzyMatches: Stock[] = [];
      
      // Create an array of promises for parallel processing
      const fuzzyMatchPromises = entities.map(async entity => {
        console.log(`[TickerExtractorService] extractTickers() - Fuzzy matching entity: "${entity}"`);
        const fuzzyMatcheStockInfoList = await searchStocks(entity, location);
        console.log(`[TickerExtractorService] extractTickers() - Fuzzy matches for "${entity}": ${fuzzyMatcheStockInfoList.length}`);
        
        if (fuzzyMatcheStockInfoList.length > 0) {
          console.log(`[TickerExtractorService] extractTickers() - Top match for "${entity}": ${JSON.stringify(fuzzyMatcheStockInfoList[0])}`);
        }
        
        return fuzzyMatcheStockInfoList.map(result => result.item);
      });
      
      // Wait for all fuzzy match operations to complete
      const fuzzyMatchResults = await Promise.all(fuzzyMatchPromises);
      
      // Flatten the results and add to fuzzyMatches array
      fuzzyMatchResults.forEach(matches => {
        fuzzyMatches.push(...matches);
      });
      
      console.log(`[TickerExtractorService] extractTickers() - Total fuzzy matches: ${fuzzyMatches.length}`);
      
      // Use a Set with symbol-based identity to avoid duplicates
      const uniqueSymbols = new Set<string>();
      const allMatches: Stock[] = [];
      
      // Process all matches and only add unique symbols
      [...directMatches, ...fuzzyMatches].forEach(stock => {
        if (!uniqueSymbols.has(stock.symbol)) {
          uniqueSymbols.add(stock.symbol);
          allMatches.push(stock);
        }
      });
      
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

// Export the extractTickers function for backward compatibility
export const extractTickers = async (text: string, location: SupportedLocation): Promise<Stock[]> => {
  console.log(`[extractTickers] Wrapper function called with text: "${text}", location: ${location}`);
  const result = await tickerExtractorService.extractTickers(text, location);
  console.log(`[extractTickers] Wrapper function returning ${result.length} results`);
  return result;
};