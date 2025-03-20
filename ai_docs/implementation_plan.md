# Stock Ticker Extraction Web App: Implementation Plan

## 1. Project Structure

```
stock-ticker-extractor/
├── components/
│   ├── QueryInput.tsx
│   ├── PreferenceSelector.tsx
│   ├── TickerOutput.tsx
│   └── Layout.tsx
├── pages/
│   ├── index.tsx
│   ├── _app.tsx
│   └── api/
│       └── extract-tickers.ts
├── services/
│   ├── fmpApi.ts
│   ├── tickerExtractor.ts
│   └── translationService.ts
├── utils/
│   ├── fuzzyMatcher.ts
│   └── exchangeMapper.ts
├── types/
│   └── index.ts
├── styles/
│   └── globals.css
└── public/
```

## 2. Core Services Development

- **FMP API Service (`services/fmpApi.ts`)**
  - Implement API client for FMP
  - Create function to fetch and cache stock list on app initialization
  - Define TypeScript interfaces for API responses

- **Translation Service (`services/translationService.ts`)**
  - Implement detection and translation of non-English queries
  - Support for Simplified Chinese and Traditional Chinese to English

- **Ticker Extraction Logic (`services/tickerExtractor.ts`)**
  - Develop algorithms for direct ticker matching
  - Build company name to ticker mapping
  - Implement fuzzy matching with TypeScript for type safety

- **Exchange Mapping Service (`utils/exchangeMapper.ts`)**
  - Logic to map tickers to exchanges based on geographic preference
  - Handle dual-listed stocks (e.g., Alibaba as BABA or 9988.HK)

## 3. UI Component Development

- **Layout Component**
  - Overall structure using Tailwind CSS
  - Responsive design considerations

- **Query Input Component**
  - Text input with submission handling
  - TypeScript interfaces for props and events

- **Preferences Selector Component**
  - Dropdown for geography/market using Tailwind styling
  - Language selection with proper TypeScript typing

- **Results Display Component**
  - Show extracted tickers with appropriate styling
  - Loading and error states

## 4. API Route Implementation

- **Create API Endpoint (`pages/api/extract-tickers.ts`)**
  - Implement server-side logic for ticker extraction
  - Handle requests with proper typing and error handling

## 5. Integration and Testing

- **Component Integration**
  - Connect UI to API endpoints
  - Implement state management with React hooks

- **TypeScript Type Safety**
  - Ensure proper typing across components and services
  - Create interfaces for all data structures

- **Test Cases**
  - Test various input scenarios (direct tickers, company names, etc.)
  - Test multi-language support and geographic preferences

## 6. Deployment to Vercel

- **Vercel Configuration**
  - Set up Vercel project and connect to repository
  - Configure environment variables in Vercel dashboard
  
- **Custom Domain Setup (if needed)**
  - Configure custom domain in Vercel dashboard

## 7. Documentation and Refinement

- **Create comprehensive README.md**
  - Setup instructions
  - Usage examples
  - API documentation

- **Performance Optimization**
  - Implement debouncing for API calls
  - Optimize bundle size with Next.js features