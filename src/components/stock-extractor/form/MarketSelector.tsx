interface MarketSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MarketSelector({ value, onChange, className = '' }: MarketSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="location-select" className="text-sm text-gray-600">
        Market:
      </label>
      <select
        id="location-select"
        value={value}
        onChange={handleChange}
        className={`text-sm border border-gray-300 rounded px-2 py-1 ${className}`}
      >
        <option value="GLOBAL">Global</option>
        <option value="US">US</option>
        <option value="HK">Hong Kong</option>
        <option value="CN">China</option>
      </select>
    </div>
  );
}