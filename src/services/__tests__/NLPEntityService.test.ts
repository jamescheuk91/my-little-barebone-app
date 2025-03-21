import { findEntities } from "../NLPEntityService";

describe("NLPEntityService", () => {

    it("should find apple in 'apple'", async() => {
        const result = await findEntities("apple");
        expect(result).toEqual(["apple"]);
    })


    it("should find apple in 'apple stock price'", async() => {
        const result = await findEntities("apple stock price");
        expect(result).toEqual(["apple"]);
    })


    it("should find apple in 'Apple stock price'", async() => {
        const result = await findEntities("Apple stock price");
        expect(result).toEqual(["Apple"]);
    })

    it("should find Alibaba in 'Alibaba stock price'", async() => {
        const result = await findEntities("Alibaba stock price");
        expect(result).toEqual(["Alibaba"]);
    })

    it("should find apple in 'find me Apple stock price'", async() => {
        const result = await findEntities("find me Apple stock price");
        expect(result).toEqual(["Apple"])
    })

    it("should find apple in 'find me apple stock price'", async() => {
        const result = await findEntities("find me apple stock price");
        expect(result).toEqual(["apple"])
    })

    it("should find $AAPL in 'find me $AAPL stock price'", async() => {
        const result = await findEntities("find me $AAPL stock price");
        expect(result).toEqual(["AAPL"]);
        
    })

    it("should find google in 'find me google stock price'", async() => {
        const result = await findEntities("find me google stock price");
        expect(result).toEqual(["google"]);
    })

    it("should find Alibaba in 'find me Alibaba stock price'", async() => {
        const result = await findEntities("find me Alibaba stock price");
        expect(result).toEqual(["Alibaba"]);
    })




    it("should find HSBC in 'Thoughts on HSBC'", async() => {
        const result = await findEntities("Thoughts on HSBC");
        expect(result).toEqual(["HSBC"]);
    })

    it("should find 'BABA' and 'NVDA' in 'compare BABA and NVDA'", async() => {
        const result = await findEntities("compare BABA and NVDA");
        expect(result).toEqual(["BABA", "NVDA"]);
    })

    it("should find 'BABA' and 'NVDA' in 'compare BABA Apple google and NVDA'", async() => {
        const result = await findEntities("compare BABA Apple google and NVDA");
        expect(result).toContain("BABA");
        expect(result).toContain("Apple");
        expect(result).toContain("google");
        expect(result).toContain("NVDA");
    })

    it("should find 'BABA' and 'NVDA' in 'compare BABA Apple, google, and NVDA'", async() => {
        const result = await findEntities("compare BABA Apple, google, and NVDA");
        expect(result).toContain("BABA");
        expect(result).toContain("Apple");
        expect(result).toContain("google");
        expect(result).toContain("NVDA");
    })

    it("should find entites in longer text", async() => {
        const text = "Analysts at H.C. Wainwright underscore the potential for FemaSeed to generate additional revenue streams from 2025 onward as Femasys continues to increase the product’s presence and consumer awareness.";
        const result = await findEntities(text);
        expect(result).toContain("Wainwright");
        expect(result).toContain("FemaSeed");
        expect(result).toContain("Femasys");
        
    });
})