import { SupportedLanguage } from '@/types';
import { MarketSelector } from './MarketSelector';
import { LanguageSelector } from './LanguageSelector';
import { QueryInput } from './QueryInput';
import { SubmitButton } from './SubmitButton';

interface StockExtractorFormProps {
  userQuery: string;
  location: string;
  language: SupportedLanguage;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onLocationChange: (location: string) => void;
  onLanguageChange: (language: SupportedLanguage) => void;
  onSubmit: () => void;
  className?: string;
}

export function StockExtractorForm({
  userQuery,
  location,
  language,
  isLoading,
  onQueryChange,
  onLocationChange,
  onLanguageChange,
  onSubmit,
  className = ''
}: StockExtractorFormProps) {
  return (
    <div className={`flex flex-col space-y-4 w-full p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label htmlFor="query-input" className="block text-sm font-medium text-gray-700">
            Enter your query
          </label>
          <div className="flex items-center space-x-4">
            <MarketSelector
              value={location}
              onChange={onLocationChange}
            />
            <LanguageSelector
              value={language}
              onChange={onLanguageChange}
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <QueryInput
            value={userQuery}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            disabled={isLoading}
          />
          <SubmitButton
            onClick={onSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}