import { extractTickers } from '../tickerExtractorService';
import { Stock } from '../../types';

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




    it("should extract Apple stock from 'apple stock price'", async() => {
        const result = await extractTickers("apple stock price", "US");
        expect.objectContaining(appleStock);
    });


    it("should not extract Apple stock from 'apple stock price'", async() => {
        const result = await extractTickers("apple stock price", "HK");
        expect.objectContaining(appleStock);
    });



    it("should extract Apple from 'Apple stock price'", async() => {
        const result = await extractTickers("Apple stock price", "US");
        expect.objectContaining(appleStock);
    });

    it("should extract AAPL from 'find me $AAPL stock price'", async() => {
        const result = await extractTickers("find me $AAPL stock price", "US");
        expect.objectContaining(appleStock);
    });

    it("should extract AAPL from 'find me Apple stock price'", async() => {
        const result = await extractTickers("find me Apple stock price", "US");
        expect.objectContaining(appleStock);
    });

    it("should extract multiple stock tickers from text with company names", async() => {
        const text = "find me Apple stock and Pineapple stock";
        const result = await extractTickers(text, "US");
        expect.objectContaining(appleStock)
        expect.objectContaining(pineappleStock)
    });

    it("should extract Alibaba stock with 'Alibaba stock price'", async() => {
        const result = await extractTickers("Alibaba stock price", "HK");
        expect.objectContaining(alibaba9988HKStock)
    });
})