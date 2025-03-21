import { NextRequest, NextResponse } from "next/server";
import { SupportedLanguage, SupportedLocation } from "@/types";
import { ChatRequest, ParsedResult, Stock } from "@/types";
import { MarketLocation } from "@/types/market";
import {
  detectLanguage,
  processTranslation,
} from "@/services/translationService";
// import { getStockList } from '@/services/StockDataService';
// import { searchStocks } from '@/services/StockFuzeMatchingService';
import { extractTickers } from "@/services/tickerExtractorService";

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
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const languageParam = searchParams.get("language");
    // Make sure language is one of the supported values, default to 'en'
    const selectedLanguage =
      languageParam === "en" ||
      languageParam === "zh-CN" ||
      languageParam === "zh-TW"
        ? (languageParam as SupportedLanguage)
        : "en";

    // Extract location from query parameters or default to global
    const locationParam = searchParams.get("location");
    // Make sure location is one of the supported values, default to 'GLOBAL'
    const selectedLocation: SupportedLocation =
      locationParam === MarketLocation.US ||
      locationParam === MarketLocation.HK ||
      locationParam === MarketLocation.CN ||
      locationParam === MarketLocation.GLOBAL
        ? (locationParam as MarketLocation)
        : MarketLocation.GLOBAL;

    console.debug("selectedLocation: ", selectedLocation);

    const deletedLanguage = await detectLanguage(body.text);
    console.debug("deletedLanguage: ", deletedLanguage);
    let queryText: string;
    if (deletedLanguage !== "en") {
      // Create chat request with fixed target language "en"
      const chatRequest: ChatRequest = {
        text: body.text,
        targetLanguage: "en", // Always translate to English
      };
      // Process the translation
      const translationResult = await processTranslation(chatRequest);
      console.debug("translationResult: ", translationResult);
      queryText = translationResult.translatedText;
    } else {
      queryText = body.text;
    }

    // Find stock tickers in the translated text
    console.debug(`Searching for tickers in: "${queryText}"`);
    const stocks: Stock[] = await extractTickers(
      queryText,
      selectedLocation,
      selectedLanguage
    );

    // Create response with proper format
    const result: ParsedResult = {
      originalQuery: body.text,
      queryText: queryText,
      stocks: stocks,
    };

    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error("chat API error:", error);

    return NextResponse.json(
      {
        error: "Failed to chat",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
