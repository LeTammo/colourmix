
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
    public gameId: string;
    public players: Player[];
    public timerDuration: number;
    public timer: number;
    public round: number;
    public maxRounds: number;
    public rounds: Round[];

    constructor(
        gameId: string,
        players: Player[] = [],
        round: number = 0,
        timerDuration: number = 20,
        maxRounds: number = 5,
        rounds: Round[] = []
    ) {
        this.gameId = gameId;
        this.players = players;
        this.timerDuration = timerDuration;
        this.timer = timerDuration;
        this.round = round;
        this.maxRounds = maxRounds;
        this.rounds = rounds;
    }

    public toGameStateOutgoingMessage(playerId: string): GameStateOutgoingMessage {
        const message = new GameStateOutgoingMessage(this, playerId);
        return message;
    }

    public toGameStateOutgoing(playerId: string): GameStateOutgoing {
        return {
            gameId: this.gameId,
            players: this.players.reduce((acc, p) => {
                acc[p.id] = { isHost: p.isHost, name: p.name, score: p.score };
                return acc;
            }, {} as GameStateOutgoing["players"]),
            timer: this.timer,
            timerDuration: this.timerDuration,
            round: this.round,
            maxRounds: this.maxRounds,
            rounds: this.rounds.map(r => ({
                // Only include player picks by playerId
                picks: r.state === "finished" ? r.picks : (r.picks[playerId] ? { [playerId]: r.picks[playerId] } : {}),
                targetCards: r.state === "finished" ? r.targetCards : null,
                targetColor: r.state === "waiting" ? null : r.targetColor,
                state: r.state,
                targetCardsNumber: r.state !== "waiting" ? r.targetCards.length : null
            }))
        };
    }
}

export interface GameStateOutgoing {
    gameId: string;
    players: {
        [id: string]: {
            isHost: boolean;
            name: string;
            score: number;
        }
    };
    timer: number;
    timerDuration: number;
    round: number;
    maxRounds: number;
    rounds: {
        picks: { [playerId: string]: Card[] };
        targetCards: Card[] | null;
        targetCardsNumber: number | null;
        targetColor: string | null;
        state: "waiting" | "playing" | "finished";
    }[];
}

