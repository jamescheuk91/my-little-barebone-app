interface ErrorDisplayProps {
  error: string;
  className?: string;
}

export function ErrorDisplay({ error, className = '' }: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  return (
    <div className={`p-3 bg-red-100 text-red-800 rounded ${className}`}>
      <h3 className="font-medium">Error:</h3>
      <p>{error}</p>
    </div>
  );
}