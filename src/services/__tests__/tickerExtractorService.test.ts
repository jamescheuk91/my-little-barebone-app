import { extractTickers } from '../tickerExtractorService';
import { Stock, SupportedLanguage } from '../../types';
import { MarketLocation } from '../../types/market';

describe("TickerExtractorService", () => {

    const appleStock: Stock = {
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ Global Select",
        exchangeShortName: "NASDAQ",
        type: "stock"
    };

    const pineappleStock: Stock = {
        symbol: "PAPL",
        name: "Pineapple Financial Inc.",
        exchange: "AMEX",
        exchangeShortName: "AMEX",
        type: "stock"
    };
    const alibaba9988HKStock: Stock = {
        symbol: "9988.HK",
        name: "Alibaba Group Holding Limited",
        exchange: "Hong Kong Stock Exchange",
        exchangeShortName: "HKSE",
        type: "stock"
    };

    const hsbcUSStock: Stock = {
        symbol: "HSBC",
        name: "HSBC Holdings plc",
        exchange: "New York Stock Exchange",
        exchangeShortName: "NYSE", // This is correct as is
        type: "stock"
    };

    const hsbc0005HKStock: Stock = {
        symbol: "0005.HK",
        name: "HSBC Holdings plc",
        exchange: "Hong Kong Stock Exchange", // This exchange name is correct
        exchangeShortName: "HKSE",
        type: "stock"
    };

    const defaultLanguage: SupportedLanguage = 'en';

    it("should extract Apple stock from 'apple stock price' in US", async() => {
        const result = await extractTickers("apple stock price", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
    });

    it("should not extract Apple stock from 'apple stock price' in HK", async() => {
        const result = await extractTickers("apple stock price", MarketLocation.HK, defaultLanguage);
        expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
    });

    it("should extract 9988.HK from 'Alibaba stock price' in HK", async() => {
        const result = await extractTickers("Alibaba stock price", MarketLocation.HK, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(alibaba9988HKStock)]));
    });

    it("should extract HSBC US Stock from 'HSBC stock price' in US", async() => {
        const result = await extractTickers("HSBC stock price", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(hsbcUSStock)]));
    });

    it("should not extract 00005.HK Stock from 'HSBC stock price' in US", async() => {
        const result = await extractTickers("HSBC stock price", MarketLocation.US, defaultLanguage);
        expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining(hsbc0005HKStock)]));
    });

    it("should extract 0005.HK HK Stock from 'HSBC stock price' in HK", async() => {
        const result = await extractTickers("HSBC stock price", MarketLocation.HK, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(hsbc0005HKStock)]));
    });

    it("should not extract HSBC US Stock from 'HSBC stock price' in HK", async() => {
        const result = await extractTickers("HSBC stock price", MarketLocation.HK, defaultLanguage);
        expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining(hsbcUSStock)]));
    });

    it("should extract BABA and NVDA from 'compare BABA and NVDA', in  GLOBAL", async() => {    
        const result = await extractTickers("compare BABA and NVDA", MarketLocation.GLOBAL, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "BABA" })]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "NVDA" })]));
    });

    it ("should extract 9988.HK and NVDA from 'compare Alibaba Hong Kong stocks and NVDA' in GLOBAL", async() => {
        const result = await extractTickers("compare Alibaba Hong Kong stocks and NVDA", MarketLocation.GLOBAL, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(alibaba9988HKStock)]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "NVDA" })]));
        
    });
    
    // Test for the bug where the user specifies Hong Kong in query but location is set to US
    it("should extract Alibaba HK stock when Hong Kong is specified in query text, even when US is set as location", async() => {
        const result = await extractTickers("\"Hong Kong Stock Alibaba Upward Trend\"", MarketLocation.US, defaultLanguage);
        // Should find Hong Kong stock 9988.HK despite US location being specified
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(alibaba9988HKStock)]));
    });

    it("should extract Micosft US Stock from 'Micorsft stock' (example of typo) in US", async() => {
        const result = await extractTickers("Micorsft stock", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "MSFT" })]));
    });

    it("should extract Apple from 'Apple stock price'", async() => {
        const result = await extractTickers("Apple stock price", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
    });

    it("should extract AAPL from 'find me $AAPL stock price'", async() => {
        const result = await extractTickers("find me $AAPL stock price", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
    });

    it("should extract AAPL from 'find me Apple stock price'", async() => {
        const result = await extractTickers("find me Apple stock price", MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
    });

    it("should extract multiple stock tickers from text with company names", async() => {
        const text = "find me Apple stock and Pineapple stock";
        const result = await extractTickers(text, MarketLocation.US, defaultLanguage);
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(pineappleStock)]));
    });

    it("should extract multiple stock tickers from text with company names and stock tickers", async() => {
        const text = "GOOGL, GOOGL, GOOGL, Apple, Amazon, Teslaaa";
        const result = await extractTickers(text, MarketLocation.US, defaultLanguage);

        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "GOOGL" })]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining(appleStock)]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "AMZN" })]));
        expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: "TSLA" })]));
    });


    
});