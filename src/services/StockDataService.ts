import fs from 'fs';
import path from 'path';
import getConfig from 'next/config';
import { Stock, StockData as CachedStockData } from '@/types';

// Get server runtime config safely (handles test environment)
const config = getConfig() || { serverRuntimeConfig: {} };
const { serverRuntimeConfig = {} } = config;

// Cache configuration - use /tmp for serverless environments
const CACHE_DIR = process.env.VERCEL 
  ? path.join('/tmp', 'cache') 
  : path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'stock_list.json');
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const API_KEY = process.env.FMP_API_KEY || serverRuntimeConfig.FMP_API_KEY || '';
const FMP_LIST_STOCK_API_ENDPOINT = 'https://financialmodelingprep.com/api/v3/stock/list';

// Log warning if API key is not set
console.debug('[StockDataService] Initializing with cache dir:', CACHE_DIR);
if (!API_KEY) {
  console.error('[StockDataService] FMP_API_KEY is not set in environment variables or server runtime config');
}

/**
 * Fetches the list of stocks from Financial Modeling Prep API
 */
async function fetchStockList(): Promise<Stock[]> {
  try {
    console.debug('[StockDataService] Fetching stock list from API...');
    const response = await fetch(
      `${FMP_LIST_STOCK_API_ENDPOINT}?apikey=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    const filteredData = data.filter((stock: Stock) => stock.type === 'stock');
    console.debug(`[StockDataService] Fetched ${filteredData.length} stocks from API`);
    return filteredData;
  } catch (error) {
    console.error('[StockDataService] Error fetching stock list:', error);
    throw new Error(`Failed to fetch stock list: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ensures the cache directory exists
 */
function ensureCacheDirectory() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      console.debug(`[StockDataService] Creating cache directory: ${CACHE_DIR}`);
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (error) {
    console.error(`[StockDataService] Error creating cache directory: ${error}`);
    throw error;
  }
}

/**
 * Saves stock data to the cache file
 */
export async function cacheStockData(data: Stock[]): Promise<void> {
  ensureCacheDirectory();
  
  const cacheData: CachedStockData = {
    timestamp: Date.now(),
    data
  };
  
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  console.debug(`[StockDataService] Cache updated with ${data.length} stocks at ${new Date().toISOString()}`);
}

/**
 * Checks if the cache is valid (exists and not expired)
 */
function isCacheValid(): boolean {
  if (!fs.existsSync(CACHE_FILE)) {
    console.debug('[StockDataService] Cache file does not exist');
    return false;
  }
  
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(cacheContent);
    const now = Date.now();
    
    const isValid = cache.timestamp && (now - cache.timestamp) < CACHE_EXPIRY;
    if (!isValid) {
      console.debug('[StockDataService] Cache is expired');
    }
    return isValid;
    
  } catch (error) {
    console.error('[StockDataService] Error reading cache:', error);
    return false;
  }
}

/**
 * Gets stock data from cache
 */
function getStockDataFromCache(): Stock[] {
  try {
    console.debug('[StockDataService] Reading stock data from cache');
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(cacheContent) as CachedStockData;
    return cache.data;
  } catch (error) {
    console.error('[StockDataService] Error reading from cache:', error);
    return [];
  }
}

/**
 * Gets stock list, either from cache if valid or from API
 */
export async function getStockList(): Promise<Stock[]> {
  console.debug('[StockDataService] Getting stock list');
  if (isCacheValid()) {
    console.debug('[StockDataService] Using cached data');
    return getStockDataFromCache();
  }
  
  // Cache is invalid, fetch new data
  console.debug('[StockDataService] Cache invalid or expired, fetching fresh data');
  const data = await fetchStockList(); 
  await cacheStockData(data);
  return data;
}

/**
 * Force updates the cache by fetching fresh data
 */
export async function updateStockCache(): Promise<void> {
  try {
    console.debug('[StockDataService] Force updating stock cache');
    const data = await fetchStockList();
    await cacheStockData(data);
  } catch (error) {
    console.error('[StockDataService] Failed to update stock cache:', error);
    throw error;
  }
}