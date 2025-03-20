export type Language = 'en'

export interface ChatRequest {
  text: string;
  targetLanguage: Language;
}


export interface TranslateRequest {
  text: string;
  targetLanguage: Language;
}

export interface TranslationResponse {
  translatedText: string;
  originalText: string;
}