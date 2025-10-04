import { MIN_SELECTION_COUNT, MAX_SELECTION_COUNT } from "./constants";

// Cards with values 10, 30, 60 of C M Y K
export type Card = "C10" | "C30" | "C60" | "M10" | "M30" | "M60"
    | "Y10" | "Y30" | "Y60" | "K10" | "K30" | "K60";

type CMYKColor = [number, number, number, number];

type ColorData = {
    name: Card;
    color: CMYKColor;
};


const colorsOrigin: ColorData[] = [
    {name: "C10", color: [0.1, 0, 0, 0]},
    {name: "C30", color: [0.3, 0, 0, 0]},
    {name: "C60", color: [0.6, 0, 0, 0]},
    {name: "M10", color: [0, 0.1, 0, 0]},
    {name: "M30", color: [0, 0.3, 0, 0]},
    {name: "M60", color: [0, 0.6, 0, 0]},
    {name: "Y10", color: [0, 0, 0.1, 0]},
    {name: "Y30", color: [0, 0, 0.3, 0]},
    {name: "Y60", color: [0, 0, 0.6, 0]},
    {name: "K10", color: [0, 0, 0, 0.1]},
    {name: "K30", color: [0, 0, 0, 0.3]},
    {name: "K60", color: [0, 0, 0, 0.6]},
];

export const colors = new Map(
    colorsOrigin.map(({ name, color }) => [name, color])
);

export function createRandomColor(colors: Map<Card, CMYKColor>): Map<Card, CMYKColor> {
    const keys = [...colors.keys()];

    if (keys.length === 0) {
        throw new Error("No colors available to choose from.");
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

        const combined = calculateColor(chosen);

        // Check for oversaturation (any channel > 1)
        isAllowed = checkColorsAllowed(combined, chosen);
    }

    console.log("Chosen Cards: ", chosen);

    return new Map(chosen.map(k => [k, colors.get(k)!]));
}

export function checkColorsAllowed(combined: [number, number, number, number], chosen: Card[], { allowKMix = true } = {}) {
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
        const cCards = chosen.filter(card => card.startsWith('C'));
        const mCards = chosen.filter(card => card.startsWith('M'));
        const yCards = chosen.filter(card => card.startsWith('Y'));
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

export function calculateRgb(cmyk: Card[]): [number, number, number] {
    const [c, m, y, k] = calculateColor(cmyk);

    let r = 255 * (1 - c) * (1 - k);
    let g = 255 * (1 - m) * (1 - k);
    let b = 255 * (1 - y) * (1 - k);

    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);

    return [r, g, b];
}

export function calculateHex(cmyk: Card[]): string {
    const [r, g, b] = calculateRgb(cmyk);
    const toHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return hex.toUpperCase();
}

/**
 * Calculates the combined CMYK color values from an array of card names.
 * @param cols - Array of card names representing colors to combine.
 * @returns A tuple of four numbers representing the combined CMYK values.
 */
export function calculateColor(cols: Card[]): [number, number, number, number] {

    const combined: [number, number, number, number] = [0, 0, 0, 0];
    for (const col of cols) {
        const color = colors.get(col);

        if (color === undefined) {
            throw new Error(`Color ${col} not found in colors map.`);
        }

        combined[0] += color[0];
        combined[1] += color[1];
        combined[2] += color[2];
        combined[3] += color[3];
    }

    return combined;
}