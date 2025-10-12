import { Card } from "../../../shared/models/color";
import { checkColorsAllowed } from "./color";

describe("checkColorsAllowed", () => {
    it("allows valid combinations with no equal non-zero CMYK values", () => {
        const cards: Card[] = ["C10", "M30", "Y60"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows combinations with zero and non-zero values", () => {
        const cards: Card[] = ["C10", "K30"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows selection of C, M, Y cards with different values", () => {
        const cards: Card[] = ["C10", "M30", "Y60"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows selection with only one color channel", () => {
        const cards: Card[] = ["C10"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows selection where two non-zero channels are equal", () => {
        const cards: Card[] = ["C30", "M30"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows selection where all non-zero channels are different", () => {
        const cards: Card[] = ["C10", "M30", "Y60", "K10"];
        expect(checkColorsAllowed(cards)).toBe(true);
    });

    it("allows combinations with equal non-zero CMYK values when allowing K mix", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        expect(checkColorsAllowed(cards, true)).toBe(true);
    });

    it("disallows combinations with equal non-zero CMYK values when disallowing K mix", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        expect(checkColorsAllowed(cards, false)).toBe(false);
    });

    it("disallows combinations where K is 1 and other channels are non-zero", () => {
        const cards: Card[] = ["K10", "K30", "K60", "C10"];
        expect(checkColorsAllowed(cards)).toBe(false);
    });

    it("disallows combinations where all C, M, Y channels are equal and non-zero with K mix disallowed", () => {
        const cards: Card[] = ["C10", "M10", "Y10"];
        expect(checkColorsAllowed(cards, false)).toBe(false);
    });

    it("disallows combinations with equal non-zero CMY values when disallowing K mix", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "Y30"];
        expect(checkColorsAllowed(cards, false)).toBe(false);
    });
    
    it("disallows combinations where all C, M, Y channels are equal and non-zero with K mix allowed", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        expect(checkColorsAllowed(cards, true)).toBe(true);
    });

    it("disallows combinations where all C, M, Y channels are equal and non-zero with K mix disallowed", () => {
        const cards: Card[] = ["C10", "M10", "Y10", "K10"];
        expect(checkColorsAllowed(cards, false)).toBe(false);
    });
});