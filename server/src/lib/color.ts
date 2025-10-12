import { combineColors } from "../../../shared/lib/color";
import { Card, CMYKColor, ColorData } from "../../../shared/models/color";
import { MIN_SELECTION_COUNT, MAX_SELECTION_COUNT } from "./constants";


export function createRandomColor(colors: Map<Card, CMYKColor>): Map<Card, CMYKColor> {
    const keys = [...colors.keys()];

    if (keys.length === 0) {
        console.error("No colors available to choose from.");
        return new Map();
    }   

    // randomize order of keys by using sort 
    const numColors = MIN_SELECTION_COUNT + Math.floor(Math.random() * (MAX_SELECTION_COUNT - MIN_SELECTION_COUNT + 1));

    let chosen: Card[] = [];

    /**
     * Only allow combinations where there are no equal non-zero CMYK amounts.
     * For example, (C10, M10, Y10) is not allowed because all channels have 0.1.
     */
    let isAllowed = false;
    while (!isAllowed) {
        // Shuffle keys
        keys.sort(() => Math.random() - 0.5);

        // Pick random number of cards
        chosen = keys.slice(0, numColors);

        isAllowed = checkColorsAllowed(chosen);
    }

    console.log("Chosen Cards: ", chosen);

    return new Map(chosen.map(k => [k, colors.get(k)!]));
}

export function checkColorsAllowed(cards: Card[], allowKMix = true) {
    const combined = combineColors(cards);
    let isAllowed = combined.every(val => val <= 1);

    // Disallow combinations where K is 1 and any other channel is non-zero
    if (isAllowed) {
        const [c, m, y, k] = combined;
        if (k === 1 && (c > 0 || m > 0 || y > 0)) {
            isAllowed = false;
        }
    }  

    // Prevent selection of only C, M, Y cards with same value (e.g., C10 M10 Y10)
    if (!allowKMix && isAllowed) {
        const cCards = cards.filter(card => card.startsWith('C'));
        const mCards = cards.filter(card => card.startsWith('M'));
        const yCards = cards.filter(card => card.startsWith('Y'));
        if (cCards.length > 0 && mCards.length > 0 && yCards.length > 0) {
            // Get all values for C, M, Y
            const cVals = cCards.map(card => card.slice(1));
            const mVals = mCards.map(card => card.slice(1));
            const yVals = yCards.map(card => card.slice(1));
            // If there is any value present in all three, block
            for (const val of cVals) {
                if (mVals.includes(val) && yVals.includes(val)) {
                    isAllowed = false;
                    break;
                }
            }
        }
    }
    return isAllowed;
}

