import { MIN_SELECTION_COUNT, MAX_SELECTION_COUNT } from "./constants";


type ColorData = {
    name: string;
    color: number[];
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

export function createRandomColor(colors: Map<string, number[]>): Map<string, number[]> {
    const keys = Array.from(colors.keys());

    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }

    // Random number between MIN_SELECTION_COUNT and MAX_SELECTION_COUNT
    const numColors = MIN_SELECTION_COUNT + Math.floor(Math.random() * (MAX_SELECTION_COUNT - MIN_SELECTION_COUNT + 1));

    const chosen = keys.slice(0, numColors);
    console.log(chosen);

    return new Map(chosen.map(k => [k, colors.get(k)!]));
}

export function calculateHex(cmyk: Map<string, number[]>): string {
    const [c, m, y, k] = calculateColor(cmyk);

    let r = 255 * (1 - c) * (1 - k);
    let g = 255 * (1 - m) * (1 - k);
    let b = 255 * (1 - y) * (1 - k);

    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);

    const toHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return hex.toUpperCase();
}

export function calculateColor(colors: Map<string, number[]>): number[] {
    const combined = [0, 0, 0, 0];
    for (const color of colors.values()) {
        combined[0] += color[0];
        combined[1] += color[1];
        combined[2] += color[2];
        combined[3] += color[3];
    }
    return combined;
}