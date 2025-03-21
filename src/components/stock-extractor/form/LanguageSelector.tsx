import { SupportedLanguage } from '@/types';

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  className?: string;
}

export function LanguageSelector({ value, onChange, className = '' }: LanguageSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as SupportedLanguage);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="language-select" className="text-sm text-gray-600">
        Language:
      </label>
      <select
        id="language-select"
        value={value}
        onChange={handleChange}
        className={`text-sm border border-gray-300 rounded px-2 py-1 ${className}`}
      >
        <option value="en">English</option>
        <option value="zh-CN">简体中文</option>
        <option value="zh-TW">繁體中文</option>
      </select>
    </div>
  );
}