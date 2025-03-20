export type Language = 'en'

export interface TranslationRequest {
  text: string;
  targetLanguage: Language;
}

export interface TranslationResponse {
  translatedText: string;
  originalText: string;
}