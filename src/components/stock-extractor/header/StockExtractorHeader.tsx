interface StockExtractorHeaderProps {
  title: string;
  className?: string;
}

export function StockExtractorHeader({ title, className = '' }: StockExtractorHeaderProps) {
  return (
    <h1 className={`text-2xl font-bold ${className}`}>
      {title}
    </h1>
  );
}