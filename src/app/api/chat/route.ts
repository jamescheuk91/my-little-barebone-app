import { NextRequest, NextResponse } from 'next/server';
import { processTranslation } from '@/services/translationService';
import { getStockList } from '@/services/stockDataService';
import { ChatRequest } from '@/types';

/**
 * API handler for chat requests
 * POST /api/chat
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
    
    // Create chat request with fixed target language "en"
    const ChatRequest: ChatRequest = {
      text: body.text,
      targetLanguage: 'en' // Always translate to English
    };
    
    // Process the translation
    const result = await processTranslation(ChatRequest);
    const list = await getStockList()
    console.log(list.length)



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