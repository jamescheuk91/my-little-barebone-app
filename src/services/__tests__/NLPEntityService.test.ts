import { findEntities } from "../NLPEntityService";

describe("NLPEntityService", () => {
    it("should preserve case in 'apple stock price'", async() => {
        const result = await findEntities("apple stock price");
        expect(result).toEqual(["Apple"]);
    })

    it("should preserve case in 'Apple stock price'", async() => {
        const result = await findEntities("Apple stock price");
        expect(result).toEqual(["Apple"]);
    })

    it("should find only company name in 'Hong Kong stocks Alibaba uptrend'", async() => {
        const result = await findEntities("Hong Kong stocks Alibaba uptrend");
        expect(result).toContain("Alibaba");
        expect(result).not.toContain("Hong");
        expect(result).not.toContain("stocks");
        expect(result).toHaveLength(1);
    })

    it("should find Alibaba in 'Alibaba stock price'", async() => {
        const result = await findEntities("Alibaba stock price");
        expect(result).toEqual(["Alibaba"]);
    })

    it("should find apple in 'find me apple stock price'", async() => {
        const result = await findEntities("find me apple stock price");
        expect(result).toContain("Apple")
    })

    it("should find AAPL without $ symbol", async() => {
        const result = await findEntities("find me $AAPL stock price");
        expect(result).toEqual(["AAPL"]);
        expect(result).toHaveLength(1);
    })

    it("should find google in 'find me google stock price'", async() => {
        const result = await findEntities("find me google stock price");
        expect(result).toEqual(["GOOG", "Google"]);
    })

    it("should find HSBC in 'Thoughts on HSBC'", async() => {
        const result = await findEntities("Thoughts on HSBC");
        expect(result).toEqual(["HSBC"]);
        expect(result).toHaveLength(1);
    })

    it("should find 'BABA' and 'NVDA' in 'compare BABA and NVDA'", async() => {
        const result = await findEntities("compare BABA and NVDA");
        expect(result).toEqual(["BABA", "NVDA"]);
        expect(result).toHaveLength(2);
    });

    it("should find multiple companies in 'compare BABA Apple google and NVDA'", async() => {
        const result = await findEntities("compare BABA Apple google and NVDA");
        expect(result).toEqual(["BABA", "Apple", "Google", "NVDA"]);
        expect(result).toHaveLength(4);
    })

    it("should find entites in longer text", async() => {
        const text = "Analysts at H.C. Wainwright underscore the potential for FemaSeed to generate additional revenue streams from 2025 onward as Femasys continues to increase the product's presence and consumer awareness.";
        const result = await findEntities(text);
        expect(result).toEqual(["FemaSeed", "Femasys"]);
        expect(result).toHaveLength(2

        );
    });

    it("should only find Alibaba and NVDA in 'compare Alibaba Hong Kong stocks and NVDA'", async() => {
        const result = await findEntities("compare Alibaba Hong Kong stocks and NVDA");
        expect(result).toContain("Alibaba");
        expect(result).toContain("NVDA");
        expect(result).not.toContain("Hong");
        expect(result).not.toContain("stocks");
        expect(result).toHaveLength(2);
    });

    it("should properly handle quoted entities", async() => {
        const result = await findEntities("\"Hong Alibaba Upward Trend\"");
        expect(result).toContain("Alibaba");
        expect(result).toHaveLength(1);
    });

    it("should extract entity from quoted text", async() => {
        const testCases = [
            { 
                input: '"Apple" stock price', 
                expected: ["Apple"]
            },
            {
                input: '"BABA" performance',
                expected: ["BABA"]
            }
        ];

        for (const { input, expected } of testCases) {
            const entities = await findEntities(input);
            expect(entities.sort()).toEqual(expected.sort());
        }
    });
    
    it("should extract Alibaba from quoted complex text", async() => {
        const result = await findEntities("Looking for \"Hong Alibaba Upward Trend\"");
        expect(result).toContain("Alibaba");
        expect(result).toHaveLength(1);
    });
    
    it("should extract only ticker from quoted 'AAPL performance'", async() => {
        const result = await findEntities("'AAPL' performance");
        expect(result).toContain("AAPL");
        expect(result).toHaveLength(1);
    });

    it("should parse all small cap stock company names", async() => {
        const result = await findEntities("Looking for Chinney, Rego Interactive Co, Kalyani");
        expect(result).toContain("Chinney");
        expect(result).toContain("Rego Interactive Co");
        expect(result).toContain("Kalyani");
        expect(result).toHaveLength(3);
    });
});