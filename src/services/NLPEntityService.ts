import nlp from 'compromise';
import { trimQuotes } from '@/utils/stringUtils';

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
      'for', 'to', 'a', 'an', 'of', 'in', 'with', 'by', 'at', 'from', 'into', 'during',
      'hong', 'kong', 'stocks', 'hong kong', 'hong kong stocks', 'us', 'chinese', 'china',
      'uptrend', 'downtrend', 'trend', 'performance', 'looking'
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
    
    // Detect and exclude market-related terms
    const marketTerms = [
      'hong kong', 'hong kong stocks', 'hk stock', 'hkse', 'hong', 'kong',
      'shanghai', 'shenzhen', 'china stock', 'chinese stock', 'a-share', 'a share',
      'us stock', 'american stock', 'nasdaq', 'nyse', 'wall street'
    ];
    
    // Process and clean each entity, handling quotes and other characters
    const cleanedEntities = [...new Set(extractedEntities)]
      .map(entity => {
        // First trim the entity and remove quotes
        let cleaned = trimQuotes(entity);
        // Then remove other unnecessary characters
        cleaned = cleaned.replace(/[,.'$"]/g, '').trim();
        return cleaned;
      })
      .filter(entity => 
        entity.length > 1 && 
        !stopWords.includes(entity.toLowerCase()) &&
        !marketTerms.includes(entity.toLowerCase()) &&
        !/stock price/i.test(entity) &&
        !/find me/i.test(entity) &&
        !/upward/i.test(entity) &&
        !/trend/i.test(entity)
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