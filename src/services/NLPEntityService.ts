import nlp from 'compromise';

/**
 * Extracts noun entities from the given text using the compromise library
 * @param text The input text to extract entities from
 * @returns A Promise that resolves to an array of extracted nouns
 */
export const findEntities = async (text: string): Promise<string[]> => {
  if (!text || text.trim() === '') {
    return [];
  }
  
  try {
    // Use compromise to parse the text and extract nouns
    const doc = nlp(text);
    
    // Extract stock ticker symbols with $ prefix (like $AAPL)
    const tickerRegexWithPrefix = /\$([A-Z]{2,5})\b/g;
    let match;
    const tickerSymbols: string[] = [];
    
    // Extract all ticker symbols with $ prefix
    while ((match = tickerRegexWithPrefix.exec(text)) !== null) {
      if (match[1]) {
        tickerSymbols.push(match[1]); // Add the ticker without the $ prefix
      }
    }
    
    // Extract stock ticker patterns without $ using regex for all caps words
    const tickerRegex = /\b[A-Z]{2,5}\b/g;
    const tickerMatches = text.match(tickerRegex) || [];
    
    // Compromise library identification for company names
    const organizations = doc.organizations().out('array');
    const properNouns = doc.match("#ProperNoun").out('array');
    
    // Get individual company name candidates (single words only)
    const words = text.split(/[\s,.;:!?]+/).filter(Boolean);
    
    // Common words to exclude
    const stopWords = [
      'stock', 'price', 'compare', 'find', 'me', 'on', 'and', 'thoughts', 'the',
      'Stock', 'Price', 'Compare', 'Find', 'Me', 'On', 'And', 'Thoughts', 'The',
      'for', 'to', 'a', 'an', 'of', 'in', 'with', 'by', 'at', 'from', 'into', 'during'
    ];
    
    // Extract potential single-word company names
    const singleWordEntities = words.filter(word => {
      // Clean the word
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
      return (
        cleanWord.length > 1 && 
        !stopWords.includes(cleanWord)
      );
    });
    
    // Get entities from phrases that might be company names (1-2 words)
    const phraseEntities: string[] = [];
    
    // Check for company name phrases in the text like "apple" in "apple stock price"
    const companyPhrasePatterns = [
      /(\w+)\s+stock/i,
      /(\w+)\s+shares/i,
      /(\w+)\s+price/i,
      /find\s+(?:me\s+)?(\w+)/i,
      /thoughts\s+on\s+(\w+)/i
    ];
    
    companyPhrasePatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match && match[1] && !stopWords.includes(match[1].toLowerCase())) {
        phraseEntities.push(match[1]);
      }
    });
    
    // Identify noun chunks that might be company names
    const nounChunks = doc.match('#Noun+').out('array');
    const companyNameCandidates = nounChunks.filter((chunk: string) => 
      !stopWords.includes(chunk.toLowerCase()) && 
      chunk.length > 1
    );
    
    // Filter entities to only include single words
    const extractedEntities = [
      ...tickerSymbols,
      ...tickerMatches,
      ...organizations,
      ...properNouns,
      ...singleWordEntities,
      ...phraseEntities,
      ...companyNameCandidates
    ];
    
    // Remove duplicates, clean up, and filter out unwanted entities
    const cleanedEntities = [...new Set(extractedEntities)]
      // Clean entities - remove commas, periods, apostrophes, and $ symbols
      .map(entity => entity.replace(/[,.'$]/g, '').trim())
      .filter(entity => 
        entity.length > 1 && 
        !stopWords.includes(entity) &&
        !/stock price/i.test(entity) &&
        !/find me/i.test(entity)
      );
    
    // Get simple single-word entities
    const simplifiedEntities = cleanedEntities.filter(entity => !entity.includes(' '));
    
    // If we have single-word entities, prioritize them and remove duplicates
    if (simplifiedEntities.length > 0) {
      return [...new Set(simplifiedEntities)];
    }
    
    return [...new Set(cleanedEntities)];
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
};