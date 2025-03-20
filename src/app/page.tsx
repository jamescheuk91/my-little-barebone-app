'use client';

import Image from "next/image";
import { useState } from 'react';

export default function Home() {
  const [userQuery, setUserQuery] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [extractedTickersResult, setextractedTickersResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserQuery(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  

  const handleSubmit = async () => {
    if (!userQuery.trim()) {
      setError('Please enter some text to procssing');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call the API endpoint
      const response = await fetch('/api/chat', {
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
        throw new Error(errorData.message || 'Failed to chat');
      }
      
      const result = await response.json();
      setOriginalText(result.originalText);
      setextractedTickersResult(result.translatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-5xl">
        
        <div className="flex flex-col space-y-4 w-full p-4 border border-gray-200 rounded-lg">
          
          <div className="space-y-4">
            <label htmlFor="query-input" className="block text-sm font-medium text-gray-700">
              Enter your query
            </label>
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
                ) : 'Submit'}
              </button>
            </div>
          </div>
          
          {extractedTickersResult && (
            <div className="p-3 bg-gray-100 rounded space-y-3">
              <div>
                <h3 className="font-medium text-gray-500">Original Text:</h3>
                <p className="mt-1">{originalText}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Extracted Trackers Result:</h3>
                <p className="mt-1">{extractedTickersResult}</p>
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