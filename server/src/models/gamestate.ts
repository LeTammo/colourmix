import { Card } from "../lib/color";
import { GameStateOutgoingMessage } from "./messages";

export interface PlayerMetadata {
    id: string;
    cookie: string;
}

export interface Player {
    id: string;
    isHost: boolean;
    socketId: string;
    name: string;
    score: number;
}

export interface Picks {
    playerId: string;
    card: Card[];
}

export interface Round {
    picks: { [playerId: string]: Card[] };
    targetCards: Card[];
    targetColor: string;
    state: "waiting" | "playing" | "finished",
}

export class GameState {
    constructor(
        public players: Player[] = [],
        public timer: number = -1,
        public round: number = 0,
        public maxRounds: number = 5,
        public rounds: Round[] = []
    ) {
    }

    public toGameStateOutgoingMessage(): GameStateOutgoingMessage {
        const message = new GameStateOutgoingMessage(this);
        return message;
    }
}