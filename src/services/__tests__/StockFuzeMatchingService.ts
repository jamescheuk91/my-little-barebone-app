import {
  StockFuzeMatchingService,
  StockSearchResult,
} from "../StockFuzeMatchingService";
import { Stock, SupportedLocation } from "../../types";

// Mock the getStockList function
jest.mock("../StockDataService", () => ({
  getStockList: jest.fn().mockResolvedValue([
    {
      symbol: "2788.T",
      name: "Apple International Co., Ltd.",
      exchangeShortName: "JPX",
      type: "stock",
    },
    {
      symbol: "603020.SS",
      name: "Apple Flavor & Fragrance Group Co.,Ltd.",
      price: 8.86,
      exchange: "Shanghai",
      exchangeShortName: "SHH",
      type: "stock",
    },
    {
      symbol: "APLE",
      name: "Apple Hospitality REIT, Inc.",
      price: 13.51,
      exchange: "New York Stock Exchange",
      exchangeShortName: "NYSE",
      type: "stock",
    },
    {
      symbol: "MLP",
      name: "Maui Land & Pineapple Company, Inc.",
      price: 18.15,
      exchange: "New York Stock Exchange",
      exchangeShortName: "NYSE",
      type: "stock",
    },
    {
      symbol: "PNPL",
      name: "Pineapple, Inc.",
      price: 0.135,
      exchange: "Other OTC",
      exchangeShortName: "PNK",
      type: "stock",
    },
    {
      symbol: "GAPJ",
      name: "Golden Apple Oil & Gas Inc.",
      price: 0.002,
      exchange: "Other OTC",
      exchangeShortName: "PNK",
      type: "stock",
    },
    {
      symbol: "APRU",
      name: "Apple Rush Company, Inc.",
      price: 0.0013,
      exchange: "Other OTC",
      exchangeShortName: "PNK",
      type: "stock",
    },
    {
      symbol: "AAPL.MX",
      name: "Apple Inc.",
      price: 4312.59,
      exchange: "Mexico",
      exchangeShortName: "MEX",
      type: "stock",
    },
    {
      symbol: "AAPL.NE",
      name: "Apple Inc.",
      price: 31.18,
      exchange: "CBOE CA",
      exchangeShortName: "NEO",
      type: "stock",
    },
    {
      symbol: "PAPL",
      name: "Pineapple Financial Inc.",
      price: 0.32,
      exchange: "AMEX",
      exchangeShortName: "AMEX",
      type: "stock",
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "META",
      name: "Meta Platforms Inc.",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      exchangeShortName: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "JPM",
      name: "JPMorgan Chase & Co.",
      exchangeShortName: "NYSE",
      type: "stock",
    },
    {
      symbol: "WMT",
      name: "Walmart Inc.",
      exchangeShortName: "NYSE",
      type: "stock",
    },
    {
      symbol: "BABA",
      name: "Alibaba Group Holding Limited",
      exchangeShortName: "NYSE",
      type: "stock",
    },
    {
      symbol: "0700.HK",
      name: "Tencent Holdings Limited",
      exchangeShortName: "HKEX",
      type: "stock",
    },
    {
      symbol: "9988.HK",
      name: "Alibaba Group Holding Limited",
      exchangeShortName: "HKEX",
      type: "stock",
    },
    {
      symbol: "600519.SS",
      name: "Kweichow Moutai Co., Ltd.",
      exchangeShortName: "SSE",
      type: "stock",
    },
    {
      symbol: "000858.SZ",
      name: "Wuliangye Yibin Co., Ltd.",
      exchangeShortName: "SZSE",
      type: "stock",
    },
  ]),
}));

describe("StockFuzeMatchingService", () => {
  let service: StockFuzeMatchingService;

  beforeAll(async () => {
    // Create and initialize the service
    service = new StockFuzeMatchingService();

    // Wait for the service to initialize with the mock data
    // This should be much faster than waiting for real data
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 1000); // Much shorter timeout is fine with mocks

  it("should find AAPL with 'Apple' with US", async () => {
    const entity = "Apple";
    const results = await service.search(entity, "US");

    // The search should return Apple Inc.
    expect(results.length).toBeGreaterThan(0);

    // Extract just the symbols for easier assertion
    const symbols = results.map((result) => result.item.symbol);
    expect(symbols).toContain("AAPL");

    // Check that Apple is one of the top results (with a good score)
    const appleResult = results.find((result) => result.item.symbol === "AAPL");
    expect(appleResult).toBeDefined();
    if (appleResult) {
      expect(appleResult.score).toBeLessThan(0.5);
    }
  }, 1000); // Much shorter timeout is fine with mocks
});
