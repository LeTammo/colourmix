import { checkColorsAllowed, calculateColor, Card } from "./color";

describe("checkColorsAllowed", () => {
    // Helper to get combined CMYK for cards
    const getCombined = (cards: Card[]) => calculateColor(cards);

    it("allows valid combinations with no equal non-zero CMYK values", () => {
        const cards: Card[] = ["C10", "M30", "Y60"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    });

    it("disallows combinations where K is 1 and other channels are non-zero", () => {
        const cards: Card[] = ["K10", "K30", "K60", "C10"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(false);
    });

    it("allows combinations with equal non-zero CMYK values when allowing K mix", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards, { allowKMix: true })).toBe(true);
    });

    it("disallows combinations with equal non-zero CMYK values when disallowing K mix", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards, { allowKMix: false })).toBe(false);
    });

    it("allows combinations with zero and non-zero values", () => {
        const cards: Card[] = ["C10", "K30"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    });

    it("allows selection of C, M, Y cards with different values", () => {
        const cards: Card[] = ["C10", "M30", "Y60"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    });

    it("allows selection with only one color channel", () => {
        const cards: Card[] = ["C10"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    });

    it("allows selection where two non-zero channels are equal", () => {
        const cards: Card[] = ["C30", "M30"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    });

    it("allows selection where all non-zero channels are different", () => {
        const cards: Card[] = ["C10", "M30", "Y60", "K10"];
        const combined = getCombined(cards);
        expect(checkColorsAllowed(combined, cards)).toBe(true);
    }); 
});