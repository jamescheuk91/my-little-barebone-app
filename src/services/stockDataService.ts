import fs from 'fs';
import path from 'path';
import getConfig from 'next/config';

// Get server runtime config safely (handles test environment)
const config = getConfig() || { serverRuntimeConfig: {} };
const { serverRuntimeConfig = {} } = config;

// Define interface for stock data
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
  exchangeShortName: string;
  type: string;
}

// Cache configuration - use /tmp for serverless environments
const CACHE_DIR = process.env.VERCEL 
  ? path.join('/tmp', 'cache') 
  : path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'stock_list.json');
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const API_KEY = process.env.FMP_API_KEY || serverRuntimeConfig.FMP_API_KEY || '';
const FMP_LIST_STOCK_API_ENDPOINT = 'https://financialmodelingprep.com/api/v3/stock/list';

// Log warning if API key is not set
if (!API_KEY) {
  console.warn('FMP_API_KEY is not set in environment variables or server runtime config');
}

/**
 * Fetches the list of stocks from Financial Modeling Prep API
 */
async function fetchStockList(): Promise<StockData[]> {
  try {
    const response = await fetch(
      `${FMP_LIST_STOCK_API_ENDPOINT}?apikey=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    return data as StockData[];
  } catch (error) {
    console.error('Error fetching stock list:', error);
    throw new Error(`Failed to fetch stock list: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ensures the cache directory exists
 */
function ensureCacheDirectory() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Saves stock data to the cache file
 */
export async function cacheStockData(data: StockData[]): Promise<void> {
  ensureCacheDirectory();
  
  const cacheData = {
    timestamp: Date.now(),
    data
  };
  
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  console.log(`Cache updated with ${data.length} stocks at ${new Date().toISOString()}`);
}

/**
 * Checks if the cache is valid (exists and not expired)
 */
function isCacheValid(): boolean {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }
  
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(cacheContent);
    const now = Date.now();
    
    return cache.timestamp && (now - cache.timestamp) < CACHE_EXPIRY;
  } catch (error) {
    console.error('Error reading cache:', error);
    return false;
  }
}

/**
 * Gets stock data from cache
 */
function getStockDataFromCache(): StockData[] {
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(cacheContent);
    return cache.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return [];
  }
}

/**
 * Gets stock list, either from cache if valid or from API
 */
export async function getStockList(): Promise<StockData[]> {
  if (isCacheValid()) {
    return getStockDataFromCache();
  }
  
  // Cache is invalid, fetch new data
  const data = await fetchStockList();
  await cacheStockData(data);
  return data;
}

/**
 * Force updates the cache by fetching fresh data
 */
export async function updateStockCache(): Promise<void> {
  try {
    const data = await fetchStockList();
    await cacheStockData(data);
  } catch (error) {
    console.error('Failed to update stock cache:', error);
    throw error;
  }
}