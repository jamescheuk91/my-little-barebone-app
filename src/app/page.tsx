'use client';

import { useState, useEffect } from 'react';
import { ParsedResult, SupportedLanguage } from '@/types';
import { StockExtractorHeader } from '@/components/stock-extractor/header/StockExtractorHeader';
import { StockExtractorForm } from '@/components/stock-extractor/form/StockExtractorForm';
import { ResultsDisplay } from '@/components/stock-extractor/results/ResultsDisplay';

export default function Home() {
  const [userQuery, setUserQuery] = useState('');
  const [parsedResult, setparsedResult] = useState<ParsedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState("GLOBAL");
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const savedLocation = localStorage.getItem('marketLocation');
    if (savedLocation) {
      setLocation(savedLocation);
    }
    
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh-CN' || savedLanguage === 'zh-TW')) {
      setLanguage(savedLanguage as SupportedLanguage);
    }
  }, []);

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    localStorage.setItem('marketLocation', newLocation);
  };

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
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
      const response = await fetch(`/api/chat?location=${location}&language=${language}`, {
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

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-5xl">
        <StockExtractorHeader title="Stock Ticker Extractor" />
        
        <StockExtractorForm
          userQuery={userQuery}
          location={location}
          language={language}
          isLoading={isLoading}
          onQueryChange={setUserQuery}
          onLocationChange={handleLocationChange}
          onLanguageChange={handleLanguageChange}
          onSubmit={handleSubmit}
        />
        
        <ResultsDisplay
          parsedResult={parsedResult}
          error={error}
        />
      </main>
    </div>
  );
}