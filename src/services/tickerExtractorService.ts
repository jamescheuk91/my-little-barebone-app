import { findEntities } from './NLPEntityService';
import { getStockList } from './StockDataService';
import { SupportedLanguage, Stock, SupportedLocation } from '@/types';
import { searchStocks } from './StockFuzeMatchingService';

/**
 * Interface extending Stock with matching-related properties
 */
interface StockWithMatchInfo extends Stock {
  _directSymbolMatch?: boolean;
  _matchScore?: number;
}

// Define mapping of exchanges by location for cleaner code
const LOCATION_EXCHANGES: Record<SupportedLocation, string[]> = {
  'GLOBAL': [],
  'US': ['NYSE', 'NASDAQ', 'AMEX', 'OTC'],
  'CN': ['SHANGHAI', 'SHENZHEN', 'SHH', 'SHZ'],
  'HK': ['HONG KONG', 'HONG KONG STOCK EXCHANGE', 'HKSE', 'HKG']
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
        
        // Add metadata using our interface
        const stockWithMatchInfo = stockInfo as StockWithMatchInfo;
        stockWithMatchInfo._directSymbolMatch = true;
        stockWithMatchInfo._matchScore = 0; // Perfect score for direct matches
        
        directMatches.push(stockWithMatchInfo);
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
  private async findFuzzyMatches(entities: string[], location: SupportedLocation, selectedLanguage: SupportedLanguage, translatedQuery: string): Promise<Stock[]> {
    console.log('[TickerExtractorService] findFuzzyMatches() - Starting fuzzy matching');
    
    console.log(`[TickerExtractorService] findFuzzyMatches() - Using full text for context: "${translatedQuery}"`);
    
    // Create an array of promises for parallel processing
    const fuzzyMatchPromises = entities.map(async entity => {
      console.log(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matching entity: "${entity}"`);
      // Pass the full original query to provide context for market detection
      const matchResults = await searchStocks(entity, location, selectedLanguage, translatedQuery);
      console.log(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matches for "${entity}": ${matchResults.length}`);
      
      if (matchResults.length > 0) {
        console.log(`[TickerExtractorService] findFuzzyMatches() - Top match for "${entity}": ${JSON.stringify(matchResults[0])}`);
      }
      
      // Return stocks with fuzzy match information
      return matchResults.map(result => {
        // Add match metadata to the stock
        const stockWithMatchInfo = result.item as StockWithMatchInfo;
        stockWithMatchInfo._directSymbolMatch = false;
        stockWithMatchInfo._matchScore = result.score;
        return stockWithMatchInfo;
      });
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
   * Prioritizes stocks by exchange based on location
   * @param stocks The stocks to prioritize
   * @param location The location to determine the exchange priority
   * @returns The prioritized stocks
   */
  private prioritizeExchanges(stocks: Stock[], location: SupportedLocation): Stock[] {
    console.log(`[TickerExtractorService] prioritizeExchanges() - Prioritizing ${stocks.length} stocks for location: ${location}`);
    
    if (stocks.length <= 1) {
      return stocks; // No need to sort if there's 0 or 1 item
    }
    
    // Make a copy to avoid mutating the original array
    let prioritizedStocks = [...stocks];
    
    if (location === 'GLOBAL') {
      // For GLOBAL, prioritize direct symbol matches and stocks with higher matching scores
      console.log('[TickerExtractorService] prioritizeExchanges() - Applying GLOBAL priority: direct symbol matches and higher scores');
      
      // Sort based on direct symbol matches first, then by match score
      prioritizedStocks.sort((a, b) => {
        const stockA = a as StockWithMatchInfo;
        const stockB = b as StockWithMatchInfo;
        
        // First prioritize direct symbol matches
        const isDirectMatchA = !!stockA._directSymbolMatch;
        const isDirectMatchB = !!stockB._directSymbolMatch;
        
        if (isDirectMatchA && !isDirectMatchB) return -1;
        if (!isDirectMatchA && isDirectMatchB) return 1;
        
        // Then prioritize by match score if both are fuzzy matches
        if (!isDirectMatchA && !isDirectMatchB) {
          // Use type assertion to access the _matchScore property
          return (stockA._matchScore || 1) - (stockB._matchScore || 1);
        }
        
        return 0; // Keep original order for equal matches
      });
    } else if (location === 'US') {
      // In US, prioritize NYSE, then NASDAQ
      console.log('[TickerExtractorService] prioritizeExchanges() - Applying US exchange priority: NYSE, NASDAQ');
      prioritizedStocks.sort((a, b) => {
        const exchangeA = a.exchangeShortName?.toUpperCase() || '';
        const exchangeB = b.exchangeShortName?.toUpperCase() || '';
        
        // Prioritize NYSE first
        if (exchangeA === 'NYSE' && exchangeB !== 'NYSE') return -1;
        if (exchangeB === 'NYSE' && exchangeA !== 'NYSE') return 1;
        
        // Then prioritize NASDAQ
        if (exchangeA === 'NASDAQ' && exchangeB !== 'NASDAQ') return -1;
        if (exchangeB === 'NASDAQ' && exchangeA !== 'NASDAQ') return 1;
        
        return 0; // Keep original order for equal priority
      });
    } else if (location === 'CN') {
      // In CN, prioritize SHH, then SHZ
      console.log('[TickerExtractorService] prioritizeExchanges() - Applying CN exchange priority: SHH, SHZ');
      prioritizedStocks.sort((a, b) => {
        const exchangeA = a.exchangeShortName?.toUpperCase() || '';
        const exchangeB = b.exchangeShortName?.toUpperCase() || '';
        
        // Prioritize SHH first
        if (exchangeA === 'SHH' && exchangeB !== 'SHH') return -1;
        if (exchangeB === 'SHH' && exchangeA !== 'SHH') return 1;
        
        // Then prioritize SHZ
        if (exchangeA === 'SHZ' && exchangeB !== 'SHZ') return -1;
        if (exchangeB === 'SHZ' && exchangeA !== 'SHZ') return 1;
        
        return 0; // Keep original order for equal priority
      });
    } else if (location === 'HK') {
      // For HK, we don't need special sorting as we only have HKSE
      console.log('[TickerExtractorService] prioritizeExchanges() - No special sorting needed for HK');
    }
    
    // Log the prioritization results
    if (prioritizedStocks.length > 0) {
      console.log('[TickerExtractorService] prioritizeExchanges() - Exchange prioritization results:');
      prioritizedStocks.slice(0, Math.min(3, prioritizedStocks.length)).forEach((stock, i) => {
        console.log(`[TickerExtractorService] prioritizeExchanges() - #${i+1}: Symbol: ${stock.symbol}, Exchange: ${stock.exchangeShortName || stock.exchange}`);
      });
    }
    
    return prioritizedStocks;
  }
  
  /**
   * Extracts stock tickers from the input text
   * @param translatedQuery The input text to extract tickers from
   * @param location The location to filter by
   * @returns An array of extracted stocks
   */
  async extractTickers(translatedQuery: string, selectedLocation: SupportedLocation, selectedLanguage: SupportedLanguage): Promise<Stock[]> {
    console.debug(`[TickerExtractorService] extractTickers() - Starting with text: "${translatedQuery}", selectedLocation: ${selectedLocation}`);
    
    if (!translatedQuery || translatedQuery.trim() === '') {  
      console.log('[TickerExtractorService] extractTickers() - Empty translatedQuery provided, returning empty array');
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
      
      // Extract entities from translatedQuery
      console.log('[TickerExtractorService] extractTickers() - Calling findEntities to extract potential entities');
      const entities = await findEntities(translatedQuery);
      console.log(`[TickerExtractorService] extractTickers() - Found ${entities.length} entities: ${JSON.stringify(entities)}`);
      
      if (entities.length === 0) {
        return [];
      }
      
      // Find direct matches
      const directMatches = this.findDirectMatches(entities, selectedLocation);
      console.log(`[TickerExtractorService] extractTickers() - Direct matches: ${directMatches.length}`);
      
      // Find fuzzy matches
      const fuzzyMatches = await this.findFuzzyMatches(entities, selectedLocation, selectedLanguage, translatedQuery);
      console.log(`[TickerExtractorService] extractTickers() - Total fuzzy matches: ${fuzzyMatches.length}`);
      
      // Combine and deduplicate matches
      const allMatches = this.deduplicate([...directMatches, ...fuzzyMatches]);
      console.log(`[TickerExtractorService] extractTickers() - Total unique matches: ${allMatches.length}`);
      
      // Sort matches by exchange priority based on the selected location
      const sortedMatches = this.prioritizeExchanges(allMatches, selectedLocation);
      console.log(`[TickerExtractorService] extractTickers() - Returning sorted matches by exchange priority`);
      
      return sortedMatches;
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
export const extractTickers = async (text: string, selectedlocation: SupportedLocation, selectedLanguage: SupportedLanguage): Promise<Stock[]> => {
  console.log(`[extractTickers] Wrapper function called with text: "${text}", selectedlocation: ${selectedlocation}, selectedLanguage: ${selectedLanguage}`);
  const result = await tickerExtractorService.extractTickers(text, selectedlocation, selectedLanguage);
  console.log(`[extractTickers] Wrapper function returning ${result.length} results`);
  return result;
};