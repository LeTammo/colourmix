import { type Card, type ColorData } from "../models/color";

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

export function calculateRgb(cards: Card[]): [number, number, number] {
    const [c, m, y, k] = combineColors(cards);

    let r = 255 * (1 - c) * (1 - k);
    let g = 255 * (1 - m) * (1 - k);
    let b = 255 * (1 - y) * (1 - k);

    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);

    return [r, g, b];
}

export function calculateHex(cards: Card[]): string {
    const [r, g, b] = calculateRgb(cards);
    const toHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return hex.toUpperCase();
}


export function combineColors(cards: Card[]): [number, number, number, number] {
    const combined: [number, number, number, number] = [0, 0, 0, 0];
    for (const card of cards) {
        const color = colors.get(card);

        if (color === undefined) {
            throw new Error(`Color ${card} not found in colors map.`);
        }

        combined[0] += color[0];
        combined[1] += color[1];
        combined[2] += color[2];
        combined[3] += color[3];
    }

    return combined;
}