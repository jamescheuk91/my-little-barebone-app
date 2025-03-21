import { SupportedLanguage, TranslationRequest, TranslationResponse } from '@/types';
import { v2 } from '@google-cloud/translate';
import getConfig from 'next/config';

// Get server runtime config
const { serverRuntimeConfig } = getConfig();

// Initialize Google Cloud Translation client
const getTranslateClient = (): v2.Translate => {
  // Get API key from environment or server config
  const apiKey = serverRuntimeConfig?.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY not configured');
  }
  
  // Try to get credentials from JSON string
  const credentialsJSON = serverRuntimeConfig?.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJSON) {
    try {
      const credentials = JSON.parse(credentialsJSON);
      return new v2.Translate({ credentials, key: apiKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid credentials JSON: ${message}`);
    }
  }
  
  // Try to get credentials from file path
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFilename) {
    return new v2.Translate({ keyFilename, key: apiKey });
  }
  
  throw new Error('Google Cloud Translation credentials not configured');
};

/**
 * Translates text between specified languages
 * @param text Text to translate
 * @param targetLanguage Language to translate to
 * @returns Translation response with translated text
 */
export async function translateText(
  text: string,
  targetLanguage: SupportedLanguage
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

export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  try {
    const translateClient = getTranslateClient();
    const [detection] = await translateClient.detect(text);

    return detection.language as SupportedLanguage;
  }
  catch (error) {
    console.error('Language detection error:', error);
    throw new Error(`Failed to detect language: ${error instanceof Error ? error.message : String(error)}`);
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