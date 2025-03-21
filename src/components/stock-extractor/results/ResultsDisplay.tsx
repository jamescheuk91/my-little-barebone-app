import { ParsedResult } from '@/types';
import { OriginalQuery, ProcessedQuery } from './QueryDisplay';
import { StockList } from './StockList';
import { ErrorDisplay } from './ErrorDisplay';

interface ResultsDisplayProps {
  parsedResult: ParsedResult | null;
  error: string;
  className?: string;
}

export function ResultsDisplay({
  parsedResult,
  error,
  className = ''
}: ResultsDisplayProps) {
  if (!parsedResult && !error) {
    return null;
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {parsedResult && (
        <div className="w-full p-4 bg-gray-50 rounded-lg space-y-4">
          {parsedResult.originalQuery && (
            <OriginalQuery text={parsedResult.originalQuery} />
          )}
          
          <ProcessedQuery text={parsedResult.queryText} />
          
          <StockList stocks={parsedResult.stocks} />
        </div>
      )}
      
      <ErrorDisplay error={error} />
    </div>
  );
}