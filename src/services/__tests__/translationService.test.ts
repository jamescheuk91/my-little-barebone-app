// Mock next/config to provide server runtime config
jest.mock("next/config", () => {
  return jest.fn().mockReturnValue({
    serverRuntimeConfig: {
      GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
    },
  });
});

const { translateText, processTranslation } = require("../translationService");

describe("Translation Service", () => {
  it("should translate Traditional Chinese text to English", async () => {
    const text = "港股阿里巴巴上升趨勢";
    const result = await translateText(text, "en");

    expect(result.originalText).toBe(text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe("Hong Kong stocks Alibaba uptrend");
  }, 15000);

  it("should translate Simplified Chinese text to English", async () => {
    const text = "港股阿里巴巴上升趨勢";
    const result = await translateText(text, "en");

    expect(result.originalText).toBe(text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);

    expect(result.translatedText).toBe("Hong Kong stocks Alibaba uptrend");
  }, 15000);

  it("should process Japanese text to English", async () => {
    const request = {
      text: "香港株アリババ上昇傾向",
      targetLanguage: "en",
    };

    const result = await processTranslation(request);
    expect(result.originalText).toBe(request.text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe("Hong Kong stock Alibaba on the rise");
  }, 15000);

  it("should process mix language text to English", async () => {
    const request = {
      text: "compare Alibaba 港股 and NVDA",
      targetLanguage: "en",
    };

    const result = await processTranslation(request);
    expect(result.originalText).toBe(request.text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe(
      "compare Alibaba Hong Kong stocks and NVDA"
    );
  }, 15000);

  it("should translate 茅台股票 text to English", async () => {
    const request = {
      text: "茅台股票",
      targetLanguage: "en",
    };

    const result = await processTranslation(request);
    expect(result.originalText).toBe(request.text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe("Moutai Stock");
  }, 15000);

  it("should not translate English text", async () => {
    const request = {
      text: "Find me Apple stock price",
      targetLanguage: "en",
    };
    const result = await processTranslation(request);
    expect(result.originalText).toBe(request.text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe(request.text);
  }, 15000);

  it("should not translate random text", async () => {
    const request = {
      text: "fsjafljsalrtj34.2",
      targetLanguage: "en",
    };

    const result = await processTranslation(request);
    expect(result.originalText).toBe(request.text);
    expect(typeof result.translatedText).toBe("string");
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText).toBe(request.text);
  }, 15000);
});
