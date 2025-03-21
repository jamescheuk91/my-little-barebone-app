import getConfig from 'next/config';
import OpenAI from 'openai';

const config = getConfig() || { serverRuntimeConfig: {} };
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.serverRuntimeConfig.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not configured');
}
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Extracts noun entities from the given text using OpenAI API
 * @param text The input text to extract entities from
 * @returns A Promise that resolves to an array of extracted nouns
 */
export const findEntities = async (text: string): Promise<string[]> => {
  if (!text || text.trim() === '') {
    return [];
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract stock tickers and company names from text. Include both explicit symbols (like $TSLA) and company names. For symbols, remove any $ prefix. For company names, keep exact case. Format as comma-separated list."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }
    
    // Parse comma-separated list into array
    const entities = content
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);
    console.debug('Extracted entities:', entities);
    return entities;
    
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
};