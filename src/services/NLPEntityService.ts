import nlp from 'compromise';

/**
 * Extracts noun entities from the given text using the compromise library
 * @param text The input text to extract entities from
 * @returns An array of extracted nouns
 */
export const findEntities = (text: string): string[] => {
  if (!text || text.trim() === '') {
    return [];
  }
  
  try {
    // Use compromise to parse the text and extract nouns
    const doc = nlp(text);
    
    // Extract stock ticker symbols with $ prefix
    const tickerSymbolsWithPrefix = doc.match('$[A-Z]+').out('array');
    // Strip the $ from ticker symbols
    const tickerSymbols = tickerSymbolsWithPrefix.map((ticker: string) => ticker.replace('$', ''));
    
    // Extract stock ticker patterns without $ using regex for all caps words
    const tickerRegex = /\b[A-Z]{2,5}\b/g;
    const tickerMatches = text.match(tickerRegex) || [];
    
    const organizations = doc.organizations().out('array');
    const properNouns = doc.match("#ProperNoun").out('array');
    
    // Combine all entities and remove duplicates using Set
    const allEntities = [...new Set([...tickerSymbols, ...tickerMatches, ...organizations, ...properNouns])];
    
    // Clean up entities by removing commas
    const cleanedEntities = allEntities.map((entity: string) => entity.replace(/,/g, ''));
    
    return cleanedEntities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
};