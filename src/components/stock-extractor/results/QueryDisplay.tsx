interface QueryDisplayProps {
  title: string;
  text: string;
  className?: string;
}

export function QueryDisplay({ title, text, className = '' }: QueryDisplayProps) {
  return (
    <div className={className}>
      <h3 className="font-medium text-gray-700">{title}:</h3>
      <p className="mt-1 p-2 bg-white border border-gray-200 rounded">{text}</p>
    </div>
  );
}

// Specialized components using QueryDisplay
export function OriginalQuery({ text, className }: Omit<QueryDisplayProps, 'title'>) {
  return (
    <QueryDisplay
      title="Original Text"
      text={text}
      className={className}
    />
  );
}

export function ProcessedQuery({ text, className }: Omit<QueryDisplayProps, 'title'>) {
  return (
    <QueryDisplay
      title="Processed Query"
      text={text}
      className={className}
    />
  );
}