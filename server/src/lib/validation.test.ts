import { validateCreateGame } from "./validation";

describe("validateCreateGame", () => {
    const baseValid = {
        gameTitle: "Fun Game",
        minCards: 2,
        maxCards: 4,
        timerDuration: 30,
        maxPlayers: 4,
        maxRounds: 5,
        withInviteCode: false,
    };

    test("accepts a valid payload and returns it typed", () => {
        expect(validateCreateGame({ ...baseValid })).toEqual(baseValid);
    });

    test("rejects title with leading whitespace", () => {
        const payload = { ...baseValid, gameTitle: " Leading" };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/gameTitle/);
    });

    test("rejects title with trailing whitespace", () => {
        const payload = { ...baseValid, gameTitle: "Trailing " };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/gameTitle/);
    });

    test("rejects title that is too long", () => {
        const longTitle = "a".repeat(65);
        const payload = { ...baseValid, gameTitle: longTitle };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/gameTitle/);
    });

    test("rejects minCards < 2", () => {
        const payload = { ...baseValid, minCards: 1 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/minCards/);
    });

    test("rejects maxCards > 4", () => {
        const payload = { ...baseValid, maxCards: 5 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/maxCards/);
    });

    test("rejects when minCards > maxCards", () => {
        const payload = { ...baseValid, minCards: 4, maxCards: 3 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        // AJV may report the failing combinator; ensure the payload fields are implicated
        expect(() => validateCreateGame(payload)).toThrow(/minCards|maxCards/);
    });

    test("rejects missing required field", () => {
        // Omit timerDuration
        const { timerDuration, ...partial } = baseValid;
        expect(() => validateCreateGame(partial)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(partial)).toThrow(/timerDuration/);
    });

    test("rejects additional properties", () => {
        const payload = { ...baseValid, extra: "not-allowed" } as any;
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/additional properties|extra/);
    });

    test("rejects withInviteCode wrong type", () => {
        const payload = { ...baseValid, withInviteCode: "false" } as any;
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/withInviteCode/);
    });

    test("rejects timerDuration out of range (too small)", () => {
        const payload = { ...baseValid, timerDuration: 0 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/timerDuration/);
    });

    test("rejects timerDuration out of range (too large)", () => {
        const payload = { ...baseValid, timerDuration: 61 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/timerDuration/);
    });

    test("rejects maxPlayers out of range", () => {
        const payload = { ...baseValid, maxPlayers: 11 };
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/maxPlayers/);
    });

    test("rejects non-integer numeric fields", () => {
        const payload = { ...baseValid, minCards: 2.5 } as any;
        expect(() => validateCreateGame(payload)).toThrow(/Invalid create game payload/);
        expect(() => validateCreateGame(payload)).toThrow(/minCards/);
    });
});