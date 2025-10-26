import Ajv, { JSONSchemaType } from "ajv";
import { CreateGamePayload } from "../../../shared/models/gamestate";

// /workspaces/colourmix/server/src/lib/validation.ts

const schema: JSONSchemaType<CreateGamePayload> = {
    type: "object",
    properties: {
        gameTitle: {
            type: "string",
            minLength: 0,
            maxLength: 64,
            // disallow leading or trailing whitespace
            pattern: "^(?!\\s)(?!.*\\s$).{1,64}$",
        },
        minCards: { type: "integer", minimum: 2, maximum: 4 },
        maxCards: { type: "integer", minimum: 2, maximum: 4 },
        timerDuration: { type: "integer", minimum: 1, maximum: 60 },
        maxPlayers: { type: "integer", minimum: 1, maximum: 10 },
        maxRounds: { type: "integer", minimum: 1, maximum: 10 },
        inviteCode: {
            type: "string",
            nullable: true,
            minLength: 6,
            maxLength: 32,
            pattern: "^[A-Za-z0-9-]+$",
        },
    },
    required: ["gameTitle", "minCards", "maxCards", "timerDuration", "maxPlayers", "maxRounds"],
    additionalProperties: false,

    // Enforce minCards <= maxCards.
    // Since minCards and maxCards are required, use a oneOf with the allowed combinations.
    allOf: [
        {
            oneOf: [
                {
                    properties: {
                        minCards: { const: 2 },
                        maxCards: { enum: [2, 3, 4] },
                    },
                    required: ["minCards", "maxCards"],
                },
                {
                    properties: {
                        minCards: { const: 3 },
                        maxCards: { enum: [3, 4] },
                    },
                    required: ["minCards", "maxCards"],
                },
                {
                    properties: {
                        minCards: { const: 4 },
                        maxCards: { const: 4 },
                    },
                    required: ["minCards", "maxCards"],
                },
            ],
        },
    ],
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/**
 * Validate and return typed CreateGamePayload.
 * Throws Error with AJV message if invalid.
 */
export function validateCreateGame(input: unknown): CreateGamePayload {
    if (!validate(input)) {
        const errText = ajv.errorsText(validate.errors, { separator: "; " });
        throw new Error(`Invalid create game payload: ${errText}`);
    }
    return input as CreateGamePayload;
}