import { Stock } from '@/types';
import { StockCard } from './StockCard';

interface StockListProps {
  stocks: Stock[];
  className?: string;
}

export function StockList({ stocks, className = '' }: StockListProps) {
  if (stocks.length === 0) {
    return (
      <p className="mt-1 italic text-gray-500">
        No stocks found in the query.
      </p>
    );
  }

  return (
    <div className={className}>
      <h3 className="font-medium text-gray-700">
        Extracted Stocks ({stocks.length}):
      </h3>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {stocks.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}
      </div>
    </div>
  );
}