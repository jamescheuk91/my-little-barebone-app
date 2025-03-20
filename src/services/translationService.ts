import { Language, TranslationRequest, TranslationResponse } from '@/types';
import { v2 } from '@google-cloud/translate';
import getConfig from 'next/config';

// Get server runtime config
const { serverRuntimeConfig } = getConfig();

// Initialize Google Cloud Translation client
const getTranslateClient = () => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || serverRuntimeConfig?.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    console.error('GOOGLE_TRANSLATE_API_KEY environment variable is not set');
  }
  
  return new v2.Translate({
    key: apiKey
  });
};

/**
 * Translates text between specified languages
 * @param text Text to translate
 * @param targetLanguage Language to translate to
 * @returns Translation response with translated text
 */
export async function translateText(
  text: string,
  targetLanguage: Language
): Promise<TranslationResponse> {
  try {
    const translateClient = getTranslateClient();
    const [translation] = await translateClient.translate(text, targetLanguage);

    return {
      translatedText: translation,
      originalText: text
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Failed to translate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Processes a translation request
 * @param request The translation request object
 * @returns Translation response
 */
export async function processTranslation(request: TranslationRequest): Promise<TranslationResponse> {
  const { text, targetLanguage } = request;
  return translateText(text, targetLanguage);
}