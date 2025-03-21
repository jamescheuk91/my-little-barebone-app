'use client';

import { useState } from 'react';
import { ParsedResult, Stock } from '@/types';

export default function Home() {
  const [userQuery, setUserQuery] = useState('');
  const [parsedResult, setparsedResult] = useState<ParsedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('global');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserQuery(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocation(e.target.value);
  };

  const handleSubmit = async () => {
    if (!userQuery.trim()) {
      setError('Please enter some text to process');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setparsedResult(null);
    
    try {
      // Call the API endpoint with location parameter
      const response = await fetch(`/api/chat?location=${location}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userQuery
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process query');
      }
      
      const result = await response.json();
      setparsedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render stock information
  const renderStockInfo = (stock: Stock) => {
    return (
      <div key={stock.symbol} className="p-3 border border-gray-200 rounded-md bg-white">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">{stock.symbol}</span>
          <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">{stock.exchangeShortName}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{stock.name}</p>
      </div>
    );
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-5xl">
        <h1 className="text-2xl font-bold">Stock Ticker Extractor</h1>
        
        <div className="flex flex-col space-y-4 w-full p-4 border border-gray-200 rounded-lg">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label htmlFor="query-input" className="block text-sm font-medium text-gray-700">
                Enter your query
              </label>
              <div className="flex items-center space-x-2">
                <label htmlFor="location-select" className="text-sm text-gray-600">
                  Market:
                </label>
                <select
                  id="location-select"
                  value={location}
                  onChange={handleLocationChange}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="global">Global</option>
                  <option value="US">US</option>
                  <option value="HK">Hong Kong</option>
                  <option value="CN">China</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <textarea
                id="query-input"
                value={userQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Example: compare Alibaba 港股 and NVDA"
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="self-start rounded-md border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Extract Tickers'}
              </button>
            </div>
          </div>
          
          {parsedResult && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              {parsedResult.originalQuery && (
                <div>
                  <h3 className="font-medium text-gray-500">Original Text:</h3>
                  <p className="mt-1 p-2 bg-white border border-gray-200 rounded">{parsedResult.originalQuery}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-700">Processed Query:</h3>
                <p className="mt-1 p-2 bg-white border border-gray-200 rounded">{parsedResult.translatedQuery}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">
                  Extracted Stocks ({parsedResult.stocks.length}):
                </h3>
                {parsedResult.stocks.length > 0 ? (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsedResult.stocks.map(renderStockInfo)}
                  </div>
                ) : (
                  <p className="mt-1 italic text-gray-500">No stocks found in the query.</p>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded">
              <h3 className="font-medium">Error:</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}