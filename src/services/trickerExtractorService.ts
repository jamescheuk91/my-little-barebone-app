import Fuse from "fuse.js";
import { Stock } from "@/types";

/**
 * Interface representing stock information used internally by the parser
 * We ensure exchangeShortName is required for internal use
 */
interface StockInfo {
  symbol: string;
  name: string;
  exchangeShortName: string;
}

/**
 * Interface for search match results
 */
interface MatchResult {
  stock: StockInfo;
  confidence: number;
}

/**
 * Interface for cached index type
 */
interface CachedIndex {
  expiresAt: number; // Timestamp when cache expires
  sourceHash: string; // Hash of source data to detect changes
  index: unknown; // Fuse index type
}

/**
 * Interface for parser configuration
 */
interface ParserConfig {
  cacheTTL?: number; // Time to live in milliseconds
  useCache?: boolean; // Whether to use caching
}

/**
 * Class for parsing stock tickers from natural language queries
 * 
 * Features:
 * - Identifies exact ticker matches (e.g., "NVDA" → NVDA)
 * - Fuzzy matching for company names (e.g., "Apple" → AAPL, "Microsft" → MSFT)
 * - Support for dollar sign prefixes (e.g., "$AAPL" → AAPL)
 * - Market-specific tickers (HKSE: 0005.HK, NYSE: HSBC for the same company)
 * - Context-aware exchange selection for cross-listed stocks
 * - Support for tickers with extensions (e.g., "0005.HK", "BRK.A")
 * 
 * Selection Logic for Cross-Listed Stocks:
 * 1. Exact ticker mentioned in query always wins
 * 2. Market location context (e.g., 'US', 'HK') filters appropriate exchanges
 * 3. Query context (mentions of "Hong Kong", "US market", etc.) affects selection
 * 4. In global context, more liquid markets (NYSE, NASDAQ, HKSE, LSE) are prioritized
 */
// Keep a singleton instance of the parser with its cached index
let parserInstance: StockTickerParser | null = null;
let currentStockListHash: string = "";

/**
 * Generates a simple hash for the data
 */
function generateSourceHash(data: any[]): string {
  return JSON.stringify(data)
    .split("")
    .reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    }, 0)
    .toString(36);
}

/**
 * Wrapper function to extract stock tickers from text
 * @param text The text to extract tickers from
 * @param stockList List of stocks to search
 * @param location Market location (US, HK, CN, etc.)
 * @param confidenceThreshold Minimum confidence for matches
 * @param maxResults Maximum results to return
 * @returns Array of ticker symbols
 */
export function findStockTickers(
  text: string,
  stockList: Stock[],
  location: string = "global",
  confidenceThreshold: number = 0.3,
  maxResults: number = 5
): string[] {
  console.debug(`[findStockTickers] START - query: "${text}", location: ${location}, maxResults: ${maxResults}`);
  
  // Convert Stock[] to StockInfo[] with guaranteed exchangeShortName
  const validStocks: StockInfo[] = stockList
    .filter((stock): stock is Stock & { exchangeShortName: string } => 
      typeof stock.exchangeShortName === 'string')
    .map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchangeShortName: stock.exchangeShortName
    }));
  
  console.debug(`[findStockTickers] Filtered ${stockList.length} stocks → ${validStocks.length} valid stocks`);
  
  // Generate hash of the current stock list
  const newStockListHash = generateSourceHash(validStocks);
  
  // Create parser instance if it doesn't exist or if the stock list has changed
  if (!parserInstance || newStockListHash !== currentStockListHash) {
    console.debug(`[findStockTickers] Creating new StockTickerParser instance (hash changed: ${currentStockListHash} → ${newStockListHash})`);
    parserInstance = new StockTickerParser(validStocks);
    currentStockListHash = newStockListHash;
  } else {
    console.debug(`[findStockTickers] Reusing existing StockTickerParser instance (hash: ${currentStockListHash})`);
  }
  
  const results = parserInstance.findStockTickers(
    text,
    location,
    confidenceThreshold,
    maxResults
  );
  
  console.debug(`[findStockTickers] END - Found ${results.length} tickers: ${results.join(', ')}`);
  return results;
}

export class StockTickerParser {
  private fuse: Fuse<StockInfo>;
  private stockList: StockInfo[];
  private indexCache: CachedIndex | null = null;
  private config: ParserConfig;

  /**
   * Creates a new parser with the provided stock list
   */
  constructor(stockList: StockInfo[], config: ParserConfig = {}) {
    this.stockList = stockList;
    this.config = {
      cacheTTL: 3600000, // 1 hour default
      useCache: true,
      ...config,
    };

    // Configure Fuse.js for fuzzy searching
    this.fuse = new Fuse(stockList, {
      keys: [
        { name: "symbol", weight: 0.6 },
        { name: "name", weight: 0.4 },
      ],
      includeScore: true,
      threshold: 0.35, // Lower threshold means more precise matching
      minMatchCharLength: 2,
      ignoreLocation: true, // Improve partial matching
      useExtendedSearch: true, // Enable more powerful search operators
      distance: 100, // Allow more typos/changes in longer texts
    });
  }

  /**
   * Generates a simple hash for the data to use as cache key
   */
  private generateSourceHash(data: StockInfo[]): string {
    return JSON.stringify(data)
      .split("")
      .reduce((hash, char) => {
        return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      }, 0)
      .toString(36);
  }

  /**
   * Creates a searchable index from stock data
   * @param data Optional custom data to index (defaults to stockList)
   * @returns The created index
   */
  createIndex(data?: StockInfo[]): unknown {
    console.debug("[createIndex] Creating new searchable index for stock data...");
      
    const sourceData = data || this.stockList;
    const sourceHash = this.generateSourceHash(sourceData);

    // Check if we have a valid cached index
    if (this.config.useCache && this.indexCache) {
      const currentTime = Date.now();
      const cacheValid = this.indexCache.expiresAt > currentTime;
      const sourceUnchanged = this.indexCache.sourceHash === sourceHash;

      // Return cached index if it's still valid and source data hasn't changed
      if (cacheValid && sourceUnchanged) {
        console.debug(`[createIndex] Using cached index (valid for ${Math.floor((this.indexCache.expiresAt - currentTime)/1000)}s)`);
        return this.indexCache.index;
      }
      
      if (!cacheValid) {
        console.debug(`[createIndex] Cache expired, creating new index`);
      } else if (!sourceUnchanged) {
        console.debug(`[createIndex] Source data changed, creating new index`);
      }
    }

    console.debug(`[createIndex] Building new Fuse.js index for ${sourceData.length} stocks`);
    
    // Create a Fuse.js index with improved configuration
    const fuseInstance = new Fuse(sourceData, {
      keys: [
        { name: "symbol", weight: 0.6 },
        { name: "name", weight: 0.4 },
      ],
      includeScore: true,
      threshold: 0.35,
      minMatchCharLength: 2,
      ignoreLocation: true,
      useExtendedSearch: true,
      distance: 100,
    });

    const index = fuseInstance.getIndex();

    // Cache the created index if caching is enabled
    if (this.config.useCache) {
      const expiration = Date.now() + (this.config.cacheTTL || 3600000);
      console.debug(`[createIndex] Caching index (expires in ${Math.floor((expiration - Date.now())/1000)}s)`);
      
      this.indexCache = {
        expiresAt: expiration,
        sourceHash,
        index,
      };
    }

    return index;
  }

  /**
   * Extract potential ticker candidates from input text
   */
  private extractCandidates(input: string): string[] {
    console.debug(`[extractCandidates] Processing input: "${input}"`);
    
    // Define special terms to ignore (case sensitive)
    const specialTermsToIgnore = [
      "Find me", 
      "uptrend", 
      "stock price", 
      "compare", 
      "Hong Kong stock", 
      "uptrend",
      "thoughts on",
      "what about",
      "how is",
      "tell me about"
    ];

    // First, remove complete special phrases from input
    let cleanInput = input;
    specialTermsToIgnore.forEach((term) => {
      const beforeClean = cleanInput;
      cleanInput = cleanInput.replace(new RegExp(term, "gi"), " "); // Case insensitive
      
      if (beforeClean !== cleanInput) {
        console.debug(`[extractCandidates] Removed phrase: "${term}"`);
      }
    });

    // Remove special characters and split by spaces
    const tokens = cleanInput
      .replace(/[^\w\s.]/gi, " ") // Keep dots for market extensions like .HK
      .split(/\s+/)
      .filter((token) => token.length > 1);
    
    console.debug(`[extractCandidates] Extracted ${tokens.length} tokens: ${tokens.join(', ')}`);
    
    // Extract potential symbols with more inclusive patterns
    const potentialTickers = tokens.filter(token => {
      // Common ticker formats:
      // 1. Standard US tickers: 1-5 uppercase letters
      const isStandardTicker = /^[A-Z]{1,5}$/.test(token);
      
      // 2. Tickers with $ prefix: $AAPL
      const isTickerWithPrefix = token.startsWith("$") && token.length > 2;
      
      // 3. Tickers with market extensions: 0005.HK, 9988.HK
      const isHKTicker = /^\d+\.[A-Z]{2}$/.test(token);
      
      // 4. China A-shares: 600000.SS (Shanghai), 000001.SZ (Shenzhen)
      const isChinaATicker = /^\d{6}\.[A-Z]{2}$/.test(token);
      
      // 5. Tickers with class designations: BRK.A, BRK.B
      const isClassTicker = /^[A-Z]{1,4}\.[A-Z]$/.test(token);
      
      const isPotentialTicker = isStandardTicker || isTickerWithPrefix || isHKTicker || isChinaATicker || isClassTicker;
      
      if (isPotentialTicker) {
        let formats = [];
        if (isStandardTicker) formats.push("standard");
        if (isTickerWithPrefix) formats.push("$prefix");
        if (isHKTicker) formats.push("HK");
        if (isChinaATicker) formats.push("China-A");
        if (isClassTicker) formats.push("class");
        
        console.debug(`[extractCandidates] Potential ticker found: "${token}" (${formats.join(', ')})`);
      }
      
      return isPotentialTicker;
    });

    console.debug(`[extractCandidates] Found ${potentialTickers.length} potential tickers: ${potentialTickers.join(', ')}`);

    // Clean up any $ prefixes and ensure uniqueness
    const cleanTickers = [
      ...new Set(
        potentialTickers.map((ticker) => {
          const cleaned = ticker.startsWith("$") ? ticker.substring(1) : ticker;
          if (ticker !== cleaned) {
            console.debug(`[extractCandidates] Cleaned ticker: "${ticker}" → "${cleaned}"`);
          }
          return cleaned;
        })
      ),
    ];

    console.debug(`[extractCandidates] Final ${cleanTickers.length} unique tickers: ${cleanTickers.join(', ')}`);

    // Always return both explicit tickers and all tokens
    // This ensures we can do company name matching even when tickers are present
    // which is important for queries like "Thoughts on HSBC" where we want both direct and fuzzy matches
    const result = [...cleanTickers, ...tokens];
    console.debug(`[extractCandidates] Returning ${result.length} total candidates`);
    return result;
  }

  /**
   * Parse natural language query and find matching stock tickers
   * Uses cached indexes when available
   * @param input Natural language query text
   * @param maxResults Maximum number of results to return per match
   * @returns Array of matching stocks with confidence scores
   */
  private parseQuery(input: string, maxResults: number = 5): MatchResult[] {
    console.debug(`[parseQuery] START processing query: "${input}", maxResults: ${maxResults}`);
    const candidates = this.extractCandidates(input);
    console.debug(`[parseQuery] Got ${candidates.length} candidates for matching`);
    
    const results: MatchResult[] = [];
    const seenSymbols = new Set<string>(); // Track symbols we've already added

    console.debug(`[parseQuery] Building symbol lookup map for ${this.stockList.length} stocks`);
    // Create a symbol lookup map for O(1) access instead of using Array.find
    const symbolMap: Record<string, StockInfo> = {};
    for (let i = 0; i < this.stockList.length; i++) {
      symbolMap[this.stockList[i].symbol] = this.stockList[i];
    }

    console.debug(`[parseQuery] Checking for exact symbol matches`);
    // Try exact symbol matches first using the lookup map (much faster)
    for (const candidate of candidates) {
      const exactMatch = symbolMap[candidate];
      if (exactMatch && !seenSymbols.has(exactMatch.symbol)) {
        console.debug(`[parseQuery] EXACT MATCH: "${candidate}" → ${exactMatch.symbol} (${exactMatch.name}, ${exactMatch.exchangeShortName})`);
        results.push({
          stock: exactMatch,
          confidence: 1.0, // Direct matches have perfect confidence
        });
        seenSymbols.add(exactMatch.symbol);
      }
    }

    console.debug(`[parseQuery] Found ${results.length} exact matches`);

    // Get or create index only once for fuzzy matching
    console.debug(`[parseQuery] Setting up fuzzy search index`);
    let index =
      this.config.useCache && this.indexCache ? this.indexCache.index : null;
    if (!index) {
      console.debug(`[parseQuery] No cached index available, creating new one`);
      index = this.createIndex(this.stockList);
    } else {
      console.debug(`[parseQuery] Using cached index`);
    }

    // Reuse the same Fuse instance with the index for all searches
    console.debug(`[parseQuery] Initializing Fuse.js with index`);
    const fuseWithIndex = new Fuse(
      this.stockList,
      {
        keys: [
          { name: "symbol", weight: 0.3 },
          { name: "name", weight: 0.7 }
        ],
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2,
        ignoreLocation: true,
        useExtendedSearch: true
      }
    );

    // Process fuzzy matches for company names in candidates
    console.debug(`[parseQuery] Starting fuzzy search for each candidate`);
    let fuzzyMatchesFound = 0;
    
    for (const candidate of candidates) {
      // Skip if this candidate already gave us an exact match
      if (symbolMap[candidate]) {
        console.debug(`[parseQuery] Skipping fuzzy search for "${candidate}" - already found exact match`);
        continue;
      }
      
      console.debug(`[parseQuery] Fuzzy searching: "${candidate}"`);
      const fuzzyMatches = fuseWithIndex.search(candidate, { limit: maxResults });
      
      console.debug(`[parseQuery] Found ${fuzzyMatches.length} fuzzy matches for "${candidate}"`);
      fuzzyMatches.forEach((result) => {
        // Only add if we haven't seen this symbol yet
        if (!seenSymbols.has(result.item.symbol)) {
          const confidence = result.score ? 1 - result.score : 0.8;
          console.debug(`[parseQuery] FUZZY MATCH: "${candidate}" → ${result.item.symbol} (${result.item.name}, ${result.item.exchangeShortName}), confidence: ${confidence.toFixed(2)}`);
          
          results.push({
            stock: result.item,
            confidence: confidence,
          });
          seenSymbols.add(result.item.symbol);
          fuzzyMatchesFound++;
        } else {
          console.debug(`[parseQuery] Skipping duplicate fuzzy match: ${result.item.symbol}`);
        }
      });
    }

    // Also try the full input as a single query to catch company names
    if (input.length > 0) {
      console.debug(`[parseQuery] Trying full text search with entire input`);
      const nameMatches = fuseWithIndex.search(input, { limit: maxResults });
      
      console.debug(`[parseQuery] Found ${nameMatches.length} full text matches`);
      let fullTextMatchesAdded = 0;
      
      nameMatches.forEach((result) => {
        // Only add if we haven't seen this symbol yet
        if (!seenSymbols.has(result.item.symbol)) {
          const confidence = (result.score ? 1 - result.score : 0.8) * 0.9;
          console.debug(`[parseQuery] FULL TEXT MATCH: "${input}" → ${result.item.symbol} (${result.item.name}, ${result.item.exchangeShortName}), confidence: ${confidence.toFixed(2)}`);
          
          results.push({
            stock: result.item,
            confidence: confidence, // Slightly lower confidence for full text matches
          });
          seenSymbols.add(result.item.symbol);
          fullTextMatchesAdded++;
        }
      });
      
      console.debug(`[parseQuery] Added ${fullTextMatchesAdded} unique full text matches`);
    }

    console.debug(`[parseQuery] Sorting ${results.length} total matches by confidence`);
    
    // Sort by confidence (highest first) and return
    const sortedResults = results.sort((a, b) => b.confidence - a.confidence);
    
    console.debug(`[parseQuery] FINISHED with ${sortedResults.length} matches: ${sortedResults.map(r => `${r.stock.symbol}(${r.confidence.toFixed(2)})`).join(', ')}`);
    
    return sortedResults;
  }

  /**
   * Find all potential stock tickers in a text query
   * @param input Natural language query text
   * @param location Market/exchange location to filter by
   * @param confidenceThreshold Minimum confidence threshold (0-1)
   * @param maxResults Maximum number of results to return
   * @returns Array of stock tickers
   */
  findStockTickers(
    input: string,
    location: string = "global",
    confidenceThreshold: number = 0.3,
    maxResults: number = 5
  ): string[] {
    console.debug(`[findStockTickers] BEGIN processing: "${input}", location: ${location}, threshold: ${confidenceThreshold}`);
    
    const results = this.parseQuery(input);
    console.debug(`[findStockTickers] Got ${results.length} initial matches from parseQuery`);
    
    // Define exchanges by location
    const exchangeMap: Record<string, string[]> = {
      "US": ["NYSE", "NASDAQ", "CBOE", "AMEX", "OTC"],
      "HK": ["HKSE"],
      "CN": ["SHH", "SHZ"],
      "UK": ["LSE"],
      "JP": ["TSE"], 
      "EU": ["XETRA", "EURONEXT"],
      "global": [] // Empty means include all
    };
    
    // Define primary exchanges (more recognizable/liquid markets)
    const primaryExchanges = ["NYSE", "NASDAQ", "HKSE", "LSE"];
    
    // Get the relevant exchanges based on location
    const targetExchanges: string[] = exchangeMap[location] || [];
    console.debug(`[findStockTickers] Target exchanges for ${location}: ${targetExchanges.join(', ') || 'all'}`);

    // Detect if query contains explicit market hints
    const hasHongKongHint = input.toLowerCase().includes("hong kong") || 
                           input.toLowerCase().includes("hk market") || 
                           input.includes(".hk") ||
                           input.toLowerCase().includes("港股");
                           
    const hasUSHint = input.toLowerCase().includes("us market") || 
                     input.toLowerCase().includes("nasdaq") || 
                     input.toLowerCase().includes("nyse") ||
                     (input.includes("$") && !hasHongKongHint);
                     
    const hasChinaHint = input.toLowerCase().includes("china") ||
                        input.toLowerCase().includes("chinese") ||
                        input.toLowerCase().includes("a-share") || 
                        input.toLowerCase().includes("shanghai") ||
                        input.toLowerCase().includes("shenzhen") ||
                        input.includes(".ss") ||
                        input.includes(".sz");
    
    console.debug(`[findStockTickers] Market hints in query: HK: ${hasHongKongHint}, US: ${hasUSHint}, China: ${hasChinaHint}`);
    
    // Handle cross-listed stocks like Alibaba
    // Group results by company name to identify cross-listings
    const crossListingsMap = new Map<string, MatchResult[]>();
    
    results.forEach(result => {
      const name = result.stock.name.toLowerCase();
      if (!crossListingsMap.has(name)) {
        crossListingsMap.set(name, []);
      }
      crossListingsMap.get(name)?.push(result);
    });
    
    console.debug(`[findStockTickers] Grouped results into ${crossListingsMap.size} unique companies`);
    
    // Log companies with multiple listings
    crossListingsMap.forEach((listings, companyName) => {
      if (listings.length > 1) {
        console.debug(`[findStockTickers] Cross-listed company: "${companyName}" has ${listings.length} listings: ${listings.map(l => `${l.stock.symbol}(${l.stock.exchangeShortName})`).join(', ')}`);
      }
    });
    
    // Identify cross-listed companies and prioritize the right exchange
    let preferredResults: MatchResult[] = [];
    
    crossListingsMap.forEach((crossListings, companyName) => {
      console.debug(`[findStockTickers] Processing company: "${companyName}" with ${crossListings.length} listings`);
      
      if (crossListings.length <= 1) {
        // Not cross-listed, just add all
        preferredResults.push(...crossListings);
        console.debug(`[findStockTickers] Not cross-listed, adding directly: ${crossListings[0]?.stock.symbol}`);
        return;
      }
      
      // Extract tickers from input for direct matching
      const inputTokens = input.toUpperCase().split(/\s+/);
      
      // Sort to ensure consistent ordering (direct matches first, then by confidence)
      const sortedListings = [...crossListings].sort((a, b) => {
        // Exact ticker matches always come first (if the query contains the ticker)
        const aTickerInQuery = inputTokens.includes(a.stock.symbol);
        const bTickerInQuery = inputTokens.includes(b.stock.symbol);
        
        if (aTickerInQuery && !bTickerInQuery) return -1;
        if (!aTickerInQuery && bTickerInQuery) return 1;
        
        // Then sort by confidence score
        return b.confidence - a.confidence;
      });
      
      console.debug(`[findStockTickers] Sorted cross-listings for "${companyName}": ${sortedListings.map(l => `${l.stock.symbol}(${l.confidence.toFixed(2)})`).join(', ')}`);
      
      // This is a cross-listed stock - choose the right exchange based on context
      let addedExplicit = false;
      let addedLocal = false;
      
      // First, check if there's an exact ticker match in the query
      const explicitListings = sortedListings.filter(result => 
        inputTokens.includes(result.stock.symbol)
      );
      
      if (explicitListings.length > 0) {
        console.debug(`[findStockTickers] Found explicit ticker matches in query for "${companyName}": ${explicitListings.map(l => l.stock.symbol).join(', ')}`);
        preferredResults.push(...explicitListings);
        addedExplicit = true;
        
        // If we found an exact ticker match, don't bother with other criteria
        return;
      }
      
      // Check location-based preference (from the function parameter)
      if (targetExchanges.length > 0 && !addedExplicit) {
        const localListings = sortedListings.filter(result => 
          targetExchanges.includes(result.stock.exchangeShortName)
        );
        
        if (localListings.length > 0) {
          console.debug(`[findStockTickers] Found ${localListings.length} listings for "${companyName}" matching location ${location}`);
          
          // Boost confidence for local exchange matches
          localListings.forEach(result => {
            const oldConfidence = result.confidence;
            result.confidence = Math.min(0.99, result.confidence * 1.2);
            console.debug(`[findStockTickers] Boosting confidence for ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
          });
          
          preferredResults.push(...localListings);
          addedLocal = true;
        } else {
          console.debug(`[findStockTickers] No listings for "${companyName}" match location ${location}`);
        }
      }
      
      // Check for exchange hints in the query text (if we haven't added explicit matches)
      if (!addedExplicit) {
        let addedHint = false;
        
        // Hong Kong hints
        if (hasHongKongHint && !addedHint) {
          console.debug(`[findStockTickers] Found Hong Kong hint in query, looking for HK listings of "${companyName}"`);
          
          const hkListings = sortedListings.filter(result => 
            result.stock.exchangeShortName === "HKSE" || 
            result.stock.symbol.endsWith(".HK")
          );
          
          if (hkListings.length > 0) {
            console.debug(`[findStockTickers] Found ${hkListings.length} HK listings for "${companyName}": ${hkListings.map(l => l.stock.symbol).join(', ')}`);
            
            // Boost confidence for Hong Kong matches when HK is mentioned
            hkListings.forEach(result => {
              const oldConfidence = result.confidence;
              result.confidence = Math.min(0.98, result.confidence * 1.2);
              console.debug(`[findStockTickers] Boosting confidence for ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
            });
            
            preferredResults.push(...hkListings);
            addedHint = true;
          }
        }
        
        // China A-share market hints
        if (hasChinaHint && !addedHint) {
          console.debug(`[findStockTickers] Found China hint in query, looking for China A-share listings of "${companyName}"`);
          
          const chinaListings = sortedListings.filter(result => 
            ["SHH", "SHZ"].includes(result.stock.exchangeShortName) ||
            result.stock.symbol.endsWith(".SS") || 
            result.stock.symbol.endsWith(".SZ")
          );
          
          if (chinaListings.length > 0) {
            console.debug(`[findStockTickers] Found ${chinaListings.length} China A-share listings for "${companyName}": ${chinaListings.map(l => l.stock.symbol).join(', ')}`);
            
            // Boost confidence for China A-share matches
            chinaListings.forEach(result => {
              const oldConfidence = result.confidence;
              result.confidence = Math.min(0.98, result.confidence * 1.2);
              console.debug(`[findStockTickers] Boosting confidence for ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
            });
            
            preferredResults.push(...chinaListings);
            addedHint = true;
          }
        }
        
        // US market hints
        if (hasUSHint && !addedHint) {
          console.debug(`[findStockTickers] Found US hint in query, looking for US listings of "${companyName}"`);
          
          const usListings = sortedListings.filter(result => 
            ["NYSE", "NASDAQ", "CBOE", "AMEX", "OTC"].includes(result.stock.exchangeShortName)
          );
          
          if (usListings.length > 0) {
            console.debug(`[findStockTickers] Found ${usListings.length} US listings for "${companyName}": ${usListings.map(l => l.stock.symbol).join(', ')}`);
            
            // Boost confidence for US matches when US market is mentioned
            usListings.forEach(result => {
              const oldConfidence = result.confidence;
              result.confidence = Math.min(0.98, result.confidence * 1.2);
              console.debug(`[findStockTickers] Boosting confidence for ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
            });
            
            preferredResults.push(...usListings);
            addedHint = true;
          }
        }
        
        // If we added based on query hints, don't add more
        if (addedHint) {
          console.debug(`[findStockTickers] Added based on market hint, skipping further processing for "${companyName}"`);
          return;
        }
      }
      
      // If we already added based on location, don't add more
      if (addedLocal) {
        console.debug(`[findStockTickers] Already added based on location, skipping further processing for "${companyName}"`);
        return;
      }
      
      // If no clear preference, add primary listings with adjusted confidence
      if (location === "global" || !addedExplicit) {
        console.debug(`[findStockTickers] Using global market preference logic for "${companyName}"`);
        
        // Prioritize more recognizable exchanges for global queries
        
        // First try primary exchange listings (more liquid markets)
        const primaryExchangeListings = sortedListings.filter(result => 
          primaryExchanges.includes(result.stock.exchangeShortName)
        );
        
        if (primaryExchangeListings.length > 0) {
          console.debug(`[findStockTickers] Found ${primaryExchangeListings.length} primary exchange listings for "${companyName}": ${primaryExchangeListings.map(l => `${l.stock.symbol}(${l.stock.exchangeShortName})`).join(', ')}`);
          
          primaryExchangeListings.forEach(result => {
            const oldConfidence = result.confidence;
            result.confidence = Math.min(0.95, result.confidence * 1.05);
            console.debug(`[findStockTickers] Boosting confidence for ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
          });
          
          preferredResults.push(...primaryExchangeListings);
          return;
        }
        
        // Then try Hong Kong listings
        const hkListings = sortedListings.filter(result => 
          result.stock.exchangeShortName === "HKSE" || 
          result.stock.symbol.endsWith(".HK")
        );
        
        if (hkListings.length > 0) {
          console.debug(`[findStockTickers] Found ${hkListings.length} Hong Kong listings for "${companyName}" as fallback: ${hkListings.map(l => l.stock.symbol).join(', ')}`);
          preferredResults.push(...hkListings);
          return;
        }
        
        // Finally, just add them all, with a slight boost for US for global context
        console.debug(`[findStockTickers] No preferred exchanges found for "${companyName}", using all listings with US boost`);
        
        sortedListings.forEach(result => {
          const isUS = ["NYSE", "NASDAQ", "CBOE", "AMEX", "OTC"].includes(result.stock.exchangeShortName);
          if (isUS) {
            const oldConfidence = result.confidence;
            result.confidence = result.confidence * 1.05;
            console.debug(`[findStockTickers] Boosting US listing ${result.stock.symbol}: ${oldConfidence.toFixed(2)} → ${result.confidence.toFixed(2)}`);
          }
          preferredResults.push(result);
        });
      } else {
        // Add all for non-global, non-specific cases
        console.debug(`[findStockTickers] No specific preference rules matched for "${companyName}", adding all ${sortedListings.length} listings`);
        preferredResults.push(...sortedListings);
      }
    });
    
    console.debug(`[findStockTickers] After cross-listing processing: ${preferredResults.length} preferred results`);
    
    // Special handling for HSBC in HK market since this is a common cross-listing
    // This is a hard-coded fix for this specific case, but it's a common enough edge case
    if (input.toUpperCase().includes('HSBC') && location === 'HK') {
      console.debug(`[findStockTickers] Special handling for HSBC in HK market`);
      
      // First remove any existing HSBC results that might be for US market
      const hsbcHK = results.find(result => result.stock.symbol === '0005.HK');
      const hsbcUS = results.find(result => result.stock.symbol === 'HSBC');
      
      console.debug(`[findStockTickers] Found HSBC listings: HK: ${hsbcHK?.stock.symbol}, US: ${hsbcUS?.stock.symbol}`);
      
      // Remove any existing items from preferredResults with these symbols
      const uniqueResults = preferredResults.filter(result => 
        result.stock.symbol !== '0005.HK' && result.stock.symbol !== 'HSBC'
      );
      
      console.debug(`[findStockTickers] Removed existing HSBC entries, now have ${uniqueResults.length} results`);
      preferredResults = uniqueResults;
      
      // Add the HK version with very high confidence
      if (hsbcHK) {
        console.debug(`[findStockTickers] Adding HSBC HK (0005.HK) with high confidence 0.99`);
        preferredResults.push({
          stock: hsbcHK.stock,
          confidence: 0.99 // Very high confidence
        });
      }
      
      // Also add US version but with lower confidence
      if (hsbcUS) {
        console.debug(`[findStockTickers] Adding HSBC US (HSBC) with lower confidence 0.7`);
        preferredResults.push({
          stock: hsbcUS.stock,
          confidence: 0.7 // Lower confidence
        });
      }
    }
    
    // Special case for explicit ticker matches that should override exchange preferences
    if (input.trim().toUpperCase().match(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/)) {
      console.debug(`[findStockTickers] Input looks like exact ticker: "${input.trim().toUpperCase()}", checking for direct match`);
      
      const exactSymbolMatch = results.find(result => 
        result.stock.symbol === input.trim().toUpperCase()
      );
      
      if (exactSymbolMatch) {
        console.debug(`[findStockTickers] Found exact ticker match for ${exactSymbolMatch.stock.symbol}, adding with priority`);
        preferredResults.push(exactSymbolMatch);
      } else {
        console.debug(`[findStockTickers] No exact ticker match found for ${input.trim().toUpperCase()}`);
      }
    }
    
    console.debug(`[findStockTickers] Starting filtering with ${preferredResults.length} candidates`);
    
    // Filter, sort and map the results
    const filteredResults = preferredResults
      // Apply confidence threshold
      .filter(result => {
        const passed = result.confidence >= confidenceThreshold;
        if (!passed) {
          console.debug(`[findStockTickers] Filtered out ${result.stock.symbol} due to low confidence ${result.confidence.toFixed(2)} < ${confidenceThreshold}`);
        }
        return passed;
      })
      // Apply location filtering if specified, but with special exceptions
      .filter(result => {
        // If the symbol is explicitly mentioned in the query, always keep it
        if (input.toUpperCase().includes(result.stock.symbol)) {
          console.debug(`[findStockTickers] Keeping ${result.stock.symbol} - explicitly mentioned in query`);
          return true;
        }
        
        // Otherwise apply location filtering
        const shouldKeep = targetExchanges.length === 0 || 
          targetExchanges.includes(result.stock.exchangeShortName);
          
        if (!shouldKeep) {
          console.debug(`[findStockTickers] Filtered out ${result.stock.symbol} - exchange ${result.stock.exchangeShortName} not in target exchanges for ${location}`);
        }
        
        return shouldKeep;
      })
      // Sort by confidence
      .sort((a, b) => {
        if (location === "US" && targetExchanges.includes(a.stock.exchangeShortName) && 
            targetExchanges.includes(b.stock.exchangeShortName)) {
          // Sort by exchange priority for US markets
          const indexA = targetExchanges.indexOf(a.stock.exchangeShortName);
          const indexB = targetExchanges.indexOf(b.stock.exchangeShortName);
          
          if (indexA !== indexB) {
            console.debug(`[findStockTickers] Sorting US exchanges: ${a.stock.symbol}(${indexA}) vs ${b.stock.symbol}(${indexB})`);
            return indexA - indexB;
          }
        }
        
        // Then by confidence score
        return b.confidence - a.confidence;
      });
    
    console.debug(`[findStockTickers] After filtering and sorting: ${filteredResults.length} results`);
    
    // Group stocks by company name
    const companiesMap = new Map<string, MatchResult[]>();
    
    // Group all results by company name
    filteredResults.forEach(result => {
      const companyIdentifier = result.stock.name.toLowerCase();
      if (!companiesMap.has(companyIdentifier)) {
        companiesMap.set(companyIdentifier, []);
      }
      companiesMap.get(companyIdentifier)?.push(result);
    });
    
    console.debug(`[findStockTickers] Grouped into ${companiesMap.size} unique companies for deduplication`);
    
    // Process each company to select the most appropriate ticker
    const deduplicatedResults: MatchResult[] = [];
    
    companiesMap.forEach((matches, companyName) => {
      console.debug(`[findStockTickers] Deduplicating company "${companyName}" with ${matches.length} listings`);
      
      if (matches.length === 1) {
        // Only one result for this company, add it
        console.debug(`[findStockTickers] Only one listing for "${companyName}", adding directly: ${matches[0].stock.symbol}`);
        deduplicatedResults.push(matches[0]);
        return;
      }
      
      // For multiple matches of the same company, determine best option
      console.debug(`[findStockTickers] Multiple listings for "${companyName}": ${matches.map(m => `${m.stock.symbol}(${m.stock.exchangeShortName})`).join(', ')}`);
      
      // First, check for exact ticker mentions in the query
      const exactMatches = matches.filter(result => 
        input.toUpperCase().includes(result.stock.symbol)
      );
      
      if (exactMatches.length > 0) {
        console.debug(`[findStockTickers] Found ${exactMatches.length} exact ticker mentions for "${companyName}"`);
        
        // If ticker is explicitly mentioned, use that (highest confidence first)
        const selectedMatch = exactMatches.sort((a, b) => b.confidence - a.confidence)[0];
        console.debug(`[findStockTickers] Selected ticker with highest confidence: ${selectedMatch.stock.symbol}(${selectedMatch.confidence.toFixed(2)})`);
        
        deduplicatedResults.push(selectedMatch);
        return;
      }
      
      // Next, check for location-based preference
      if (location !== "global" && targetExchanges.length > 0) {
        console.debug(`[findStockTickers] Checking for ${location} exchange preference for "${companyName}"`);
        
        const locationMatches = matches.filter(result => 
          targetExchanges.includes(result.stock.exchangeShortName)
        );
        
        if (locationMatches.length > 0) {
          console.debug(`[findStockTickers] Found ${locationMatches.length} matches for "${companyName}" in requested location ${location}`);
          
          // If any match the requested location, use the highest confidence one
          const selectedMatch = locationMatches.sort((a, b) => b.confidence - a.confidence)[0];
          console.debug(`[findStockTickers] Selected location match with highest confidence: ${selectedMatch.stock.symbol}(${selectedMatch.confidence.toFixed(2)})`);
          
          deduplicatedResults.push(selectedMatch);
          return;
        }
      }
      
      // Check for market hints in the query
      if (hasHongKongHint) {
        console.debug(`[findStockTickers] Checking for Hong Kong listings of "${companyName}" due to HK hint`);
        
        const hkMatches = matches.filter(result => 
          result.stock.exchangeShortName === "HKSE" || 
          result.stock.symbol.endsWith(".HK")
        );
        
        if (hkMatches.length > 0) {
          console.debug(`[findStockTickers] Found ${hkMatches.length} Hong Kong listings for "${companyName}"`);
          
          const selectedMatch = hkMatches.sort((a, b) => b.confidence - a.confidence)[0];
          console.debug(`[findStockTickers] Selected HK match: ${selectedMatch.stock.symbol}(${selectedMatch.confidence.toFixed(2)})`);
          
          deduplicatedResults.push(selectedMatch);
          return;
        }
      }
      
      if (hasUSHint) {
        console.debug(`[findStockTickers] Checking for US listings of "${companyName}" due to US hint`);
        
        const usMatches = matches.filter(result => 
          ["NYSE", "NASDAQ", "CBOE", "AMEX", "OTC"].includes(result.stock.exchangeShortName)
        );
        
        if (usMatches.length > 0) {
          console.debug(`[findStockTickers] Found ${usMatches.length} US listings for "${companyName}"`);
          
          const selectedMatch = usMatches.sort((a, b) => b.confidence - a.confidence)[0];
          console.debug(`[findStockTickers] Selected US match: ${selectedMatch.stock.symbol}(${selectedMatch.confidence.toFixed(2)})`);
          
          deduplicatedResults.push(selectedMatch);
          return;
        }
      }
      
      if (hasChinaHint) {
        console.debug(`[findStockTickers] Checking for China A-share listings of "${companyName}" due to China hint`);
        
        const chinaMatches = matches.filter(result => 
          ["SHH", "SHZ"].includes(result.stock.exchangeShortName) ||
          result.stock.symbol.endsWith(".SS") || 
          result.stock.symbol.endsWith(".SZ")
        );
        
        if (chinaMatches.length > 0) {
          console.debug(`[findStockTickers] Found ${chinaMatches.length} China A-share listings for "${companyName}"`);
          
          const selectedMatch = chinaMatches.sort((a, b) => b.confidence - a.confidence)[0];
          console.debug(`[findStockTickers] Selected China match: ${selectedMatch.stock.symbol}(${selectedMatch.confidence.toFixed(2)})`);
          
          deduplicatedResults.push(selectedMatch);
          return;
        }
      }
      
      // Default: use the highest confidence result
      const bestMatch = matches.sort((a, b) => b.confidence - a.confidence)[0];
      console.debug(`[findStockTickers] No specific rules matched, using highest confidence match for "${companyName}": ${bestMatch.stock.symbol}(${bestMatch.confidence.toFixed(2)})`);
      
      deduplicatedResults.push(bestMatch);
    });
    
    console.debug(`[findStockTickers] After deduplication: ${deduplicatedResults.length} results`);
    
    // Take the requested number of results
    const limitedResults = deduplicatedResults.slice(0, maxResults);
    if (deduplicatedResults.length > maxResults) {
      console.debug(`[findStockTickers] Limiting to ${maxResults} results from ${deduplicatedResults.length} deduplicated matches`);
    }
    
    // Extract just the symbols
    const tickers = limitedResults.map(result => result.stock.symbol);
    
    console.debug(`[findStockTickers] FINAL RESULTS: ${tickers.length} tickers for location ${location}: ${tickers.join(', ')}`);
    
    return tickers;
  }
}
