import { NextRequest, NextResponse } from 'next/server';
import { processTranslation } from '@/services/translationService';
import { TranslationRequest } from '@/types';

/**
 * API handler for translation requests
 * POST /api/translate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    if (!body.text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }
    
    // Create translation request with fixed target language "en"
    const translationRequest: TranslationRequest = {
      text: body.text,
      targetLanguage: 'en' // Always translate to English
    };
    
    // Process the translation
    const result = await processTranslation(translationRequest);
    
    // Return the translation result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to translate text',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}