import { Stock } from '@/types';

export interface StockCardProps {
  stock: Stock;
}

export function StockCard({ stock }: StockCardProps) {
  return (
    <div className="p-3 border border-gray-200 rounded-md bg-white">
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">{stock.symbol}</span>
        <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
          {stock.exchangeShortName}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{stock.name}</p>
    </div>
  );
}