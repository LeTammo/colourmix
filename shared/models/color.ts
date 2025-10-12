// Cards with values 10, 30, 60 of C M Y K
export type Card = "C10" | "C30" | "C60" | "M10" | "M30" | "M60"
    | "Y10" | "Y30" | "Y60" | "K10" | "K30" | "K60";

export type CMYKColor = [number, number, number, number];

export type ColorData = {
    name: Card;
    color: CMYKColor;
};
