
import type { Card } from "./color";
import { GameStateOutgoingMessage } from "./messages";

export interface Player {
    id: string;
    isHost: boolean;
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
    public players: Player[];
    public timer: number;
    public round: number;
    public maxRounds: number;
    public rounds: Round[];

    constructor(
        players: Player[] = [],
        timer: number = -1,
        round: number = 0,
        maxRounds: number = 5,
        rounds: Round[] = []
    ) {
        this.players = players;
        this.timer = timer;
        this.round = round;
        this.maxRounds = maxRounds;
        this.rounds = rounds;
    }

    public toGameStateOutgoingMessage(playerId: string): GameStateOutgoingMessage {
        const message = new GameStateOutgoingMessage(this, playerId);
        return message;
    }
}