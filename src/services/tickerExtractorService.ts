import { findEntities } from './NLPEntityServiceV2';
import { getStockList } from './StockDataService';
import { SupportedLanguage, Stock, SupportedLocation } from '@/types';
import { Exchange, MarketLocation } from '@/types/market';
import { searchStocks } from './StockFuzeMatchingService';

/**
 * Interface extending Stock with matching-related properties
 */
interface StockWithMatchInfo extends Stock {
  _directSymbolMatch?: boolean;
  _matchScore?: number;
}

// Define mapping of exchanges by location for cleaner code
const LOCATION_EXCHANGES = {
  [MarketLocation.GLOBAL]: [],
  [MarketLocation.US]: [Exchange.NYSE, Exchange.NASDAQ, 'AMEX', 'OTC'],
  [MarketLocation.CN]: ['SHANGHAI', 'SHENZHEN', Exchange.SHH, Exchange.SHZ],
  [MarketLocation.HK]: ['HONG KONG', 'HONG KONG STOCK EXCHANGE', Exchange.HKSE, 'HKG']
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
    console.debug('[TickerExtractorService] Constructor called - Creating new instance');
    this.stockInfoMap = new Map<string, Stock>();
    this.init();
  }
  
  /**
   * Initializes the service by loading stock data and building the lookup map
   */
  async init(): Promise<void> {
    console.debug('[TickerExtractorService] init() - Starting initialization');
    try {
      // Get stock list from the StockDataService
      console.debug('[TickerExtractorService] init() - Fetching stock list from StockDataService');
      const stockList = await getStockList();
      console.debug(`[TickerExtractorService] init() - Received ${stockList.length} stocks from StockDataService`);
      
      // Build symbol to stock info map
      console.debug('[TickerExtractorService] init() - Building symbol to stock info map');
      
      stockList.forEach(stock => {
        // Add by symbol
        this.stockInfoMap.set(stock.symbol, stock);
      });
      
      this.isInitialized = true;
      console.debug(`[TickerExtractorService] init() - Initialization complete with ${stockList.length} stocks`);
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
    if (location === MarketLocation.GLOBAL) {
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
    console.debug('[TickerExtractorService] findDirectMatches() - Finding direct matches');
    const directMatches: Stock[] = [];
    
    entities.forEach(entity => {
      console.debug(`[TickerExtractorService] findDirectMatches() - Checking entity: "${entity}"`);
      // Check for direct match by symbol
      const stockInfo = this.stockInfoMap.get(entity.toUpperCase());
      
      if (!stockInfo) {
        console.debug(`[TickerExtractorService] findDirectMatches() - No direct match found for "${entity}"`);
        return;
      }
      
      // Apply location filtering
      if (this.stockMatchesLocation(stockInfo, location)) {
        console.debug(`[TickerExtractorService] findDirectMatches() - Direct match found for "${entity}" in ${location}: ${JSON.stringify(stockInfo)}`);
        
        // Add metadata using our interface
        const stockWithMatchInfo = stockInfo as StockWithMatchInfo;
        stockWithMatchInfo._directSymbolMatch = true;
        stockWithMatchInfo._matchScore = 0; // Perfect score for direct matches
        
        directMatches.push(stockWithMatchInfo);
      } else {
        console.debug(`[TickerExtractorService] findDirectMatches() - Direct match found for "${entity}" but filtered out due to location: ${location}`);
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
  private async findFuzzyMatches(entities: string[], location: SupportedLocation, selectedLanguage: SupportedLanguage, queryText: string): Promise<Stock[]> {
    console.debug('[TickerExtractorService] findFuzzyMatches() - Starting fuzzy matching');
    
    console.debug(`[TickerExtractorService] findFuzzyMatches() - Using full text for context: "${queryText}"`);
    
    // Filter out entities that have direct matches
    const entitiesToFuzzyMatch = entities.filter(entity => {
        const stockInfo = this.stockInfoMap.get(entity.toUpperCase());
        const hasDirectMatch = stockInfo && this.stockMatchesLocation(stockInfo, location);
        console.debug(`[TickerExtractorService] findFuzzyMatches() - Entity "${entity}" ${hasDirectMatch ? 'has direct match, skipping fuzzy' : 'needs fuzzy matching'}`);
        return !hasDirectMatch;
    });

    const fuzzyMatchPromises = entitiesToFuzzyMatch.map(async entity => {
      console.debug(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matching entity: "${entity}"`);
      // Pass the full original query to provide context for market detection
      const matchResults = await searchStocks(entity, location, selectedLanguage, queryText);
      console.debug(`[TickerExtractorService] findFuzzyMatches() - Fuzzy matches for "${entity}": ${matchResults.length}`);
      
      if (matchResults.length > 0) {
        console.debug(`[TickerExtractorService] findFuzzyMatches() - Top match for "${entity}": ${JSON.stringify(matchResults[0])}`);
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
    console.debug(`[TickerExtractorService] prioritizeExchanges() - Prioritizing ${stocks.length} stocks for location: ${location}`);
    
    if (stocks.length <= 1) {
      return stocks; // No need to sort if there's 0 or 1 item
    }
    
    // Make a copy to avoid mutating the original array
    const prioritizedStocks = [...stocks];
    
    if (location === MarketLocation.GLOBAL) {
      // For GLOBAL, prioritize direct symbol matches and stocks with higher matching scores
      console.debug('[TickerExtractorService] prioritizeExchanges() - Applying GLOBAL priority: direct symbol matches and higher scores');
      
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
    } else if (location === MarketLocation.US) {
      // In US, prioritize NYSE, then NASDAQ
      console.debug('[TickerExtractorService] prioritizeExchanges() - Applying US exchange priority: NYSE, NASDAQ');
      prioritizedStocks.sort((a, b) => {
        const exchangeA = a.exchangeShortName?.toUpperCase() || '';
        const exchangeB = b.exchangeShortName?.toUpperCase() || '';
        
        // Prioritize NYSE first
        if (exchangeA === Exchange.NYSE && exchangeB !== Exchange.NYSE) return -1;
        if (exchangeB === Exchange.NYSE && exchangeA !== Exchange.NYSE) return 1;
        
        // Then prioritize NASDAQ
        if (exchangeA === Exchange.NASDAQ && exchangeB !== Exchange.NASDAQ) return -1;
        if (exchangeB === Exchange.NASDAQ && exchangeA !== Exchange.NASDAQ) return 1;
        
        return 0; // Keep original order for equal priority
      });
    } else if (location === MarketLocation.CN) {
      // In CN, prioritize SHH, then SHZ
      console.debug('[TickerExtractorService] prioritizeExchanges() - Applying CN exchange priority: SHH, SHZ');
      prioritizedStocks.sort((a, b) => {
        const exchangeA = a.exchangeShortName?.toUpperCase() || '';
        const exchangeB = b.exchangeShortName?.toUpperCase() || '';
        
        // Prioritize SHH first
        if (exchangeA === Exchange.SHH && exchangeB !== Exchange.SHH) return -1;
        if (exchangeB === Exchange.SHH && exchangeA !== Exchange.SHH) return 1;
        
        // Then prioritize SHZ
        if (exchangeA === Exchange.SHZ && exchangeB !== Exchange.SHZ) return -1;
        if (exchangeB === Exchange.SHZ && exchangeA !== Exchange.SHZ) return 1;
        
        return 0; // Keep original order for equal priority
      });
    } else if (location === MarketLocation.HK) {
      // For HK, we don't need special sorting as we only have HKSE
      console.debug('[TickerExtractorService] prioritizeExchanges() - No special sorting needed for HK');
    }
    
    // Log the prioritization results
    if (prioritizedStocks.length > 0) {
      console.debug('[TickerExtractorService] prioritizeExchanges() - Exchange prioritization results:');
      prioritizedStocks.slice(0, Math.min(3, prioritizedStocks.length)).forEach((stock, i) => {
        console.debug(`[TickerExtractorService] prioritizeExchanges() - #${i+1}: Symbol: ${stock.symbol}, Exchange: ${stock.exchangeShortName || stock.exchange}`);
      });
    }
    
    return prioritizedStocks;
  }
  
  /**
   * Extracts stock tickers from the input text
   * @param queryText The input text to extract tickers from
   * @param location The location to filter by
   * @returns An array of extracted stocks
   */
  async extractTickers(queryText: string, selectedLocation: SupportedLocation, selectedLanguage: SupportedLanguage): Promise<Stock[]> {
    console.debug(`[TickerExtractorService] extractTickers() - Starting with text: "${queryText}", selectedLocation: ${selectedLocation}`);
    
    if (!queryText || queryText.trim() === '') {  
      console.debug('[TickerExtractorService] extractTickers() - Empty queryText provided, returning empty array');
      return [];
    }
    
    try {
      // Ensure the service is initialized
      if (!this.isInitialized || this.stockInfoMap.size === 0) {
        console.debug('[TickerExtractorService] extractTickers() - StockInfoMap is empty, initializing');
        await this.init();
      } else {
        console.debug(`[TickerExtractorService] extractTickers() - StockInfoMap already contains ${this.stockInfoMap.size} entries`);
      }
      
      // Extract entities from queryText
      console.debug('[TickerExtractorService] extractTickers() - Calling findEntities to extract potential entities');
      const entities = await findEntities(queryText);
      console.debug(`[TickerExtractorService] extractTickers() - Found ${entities.length} entities: ${JSON.stringify(entities)}`);
      
      if (entities.length === 0) {
        return [];
      }
      
      // Find direct matches
      const directMatches = this.findDirectMatches(entities, selectedLocation);
      console.debug(`[TickerExtractorService] extractTickers() - Direct matches: ${directMatches.length}`);
      
      // Find fuzzy matches
      const fuzzyMatches = await this.findFuzzyMatches(entities, selectedLocation, selectedLanguage, queryText);
      console.debug(`[TickerExtractorService] extractTickers() - Total fuzzy matches: ${fuzzyMatches.length}`);
      
      // Combine and deduplicate matches
      const allMatches = this.deduplicate([...directMatches, ...fuzzyMatches]);
      console.debug(`[TickerExtractorService] extractTickers() - Total unique matches: ${allMatches.length}`);
      
      // Sort matches by exchange priority based on the selected location
      const sortedMatches = this.prioritizeExchanges(allMatches, selectedLocation);
      console.debug(`[TickerExtractorService] extractTickers() - Returning sorted matches by exchange priority`);
      
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
  console.debug(`[extractTickers] Wrapper function called with text: "${text}", selectedlocation: ${selectedlocation}, selectedLanguage: ${selectedLanguage}`);
  const result = await tickerExtractorService.extractTickers(text, selectedlocation, selectedLanguage);
  console.debug(`[extractTickers] Wrapper function returning ${result.length} results`);
  return result;
};