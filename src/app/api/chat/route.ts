import { NextRequest, NextResponse } from 'next/server';
import { SupportedLocation } from '@/types';
import { ChatRequest, ParsedResult, Stock } from '@/types';
import { processTranslation } from '@/services/translationService';
// import { getStockList } from '@/services/StockDataService';
// import { searchStocks } from '@/services/StockFuzeMatchingService';
import { extractTickers } from '@/services/tickerExtractorService';

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
    const chatRequest: ChatRequest = {
      text: body.text,
      targetLanguage: 'en' // Always translate to English
    };
    
    // Process the translation
    const translationResult = await processTranslation(chatRequest);
    console.debug("translationResult: ", translationResult);

    // Extract location from query parameters or default to global
    const { searchParams } = new URL(request.url);
    const locationParam = searchParams.get('location');
    // Make sure location is one of the supported values, default to 'global'
    const location: SupportedLocation = 
      (locationParam === 'US' || locationParam === 'HK' || locationParam === 'CN' || locationParam === 'global') 
        ? locationParam as SupportedLocation 
        : 'global';
    console.log("selectedLocation: ", location);
    // Find stock tickers in the translated text
    
    const stocks: Stock[] = await extractTickers(translationResult.translatedText, location);
    
    
    // Create response with proper format
    const result: ParsedResult = {
      originalQuery: translationResult.originalText,
      translatedQuery: translationResult.translatedText,
      stocks: stocks
    };

    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error('chat API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to chat',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}