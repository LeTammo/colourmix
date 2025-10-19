
import type { Card } from "./color";
import { GameStateOutgoingMessage } from "./messages";

export interface CreateGamePayload {
    gameTitle: string;
    maxPlayers: number;
    timerDuration: number;
    minCards: number;
    maxCards: number;
    maxRounds: number;
    withInviteCode: boolean;
}

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
//TODO: Exclude GameState from shared folder??
export class GameState {
    public gameId: string;
    public gameTitle: string;
    public players: Player[];
    public maxPlayers: number;
    public timer: number;
    public timerDuration: number;
    public minCards: number;
    public maxCards: number;
    public round: number;
    public rounds: Round[];
    public maxRounds: number;
    public withInviteCode: boolean;

    constructor(
        gameId: string,
        options: CreateGamePayload,
    ) {
        this.gameId = gameId;
        this.gameTitle = options.gameTitle;
        this.withInviteCode = options.withInviteCode;
        this.players = [];
        this.maxPlayers = options.maxPlayers;
        this.timerDuration = options.timerDuration;
        this.minCards = options.minCards;
        this.maxCards = options.maxCards;
        this.timer = options.timerDuration;
        this.maxRounds = options.maxRounds;
        this.round = 0; // Maybe replace it with rounds.length-1?
        this.rounds = []
    }

    public toGameStateOutgoingMessage(playerId: string): GameStateOutgoingMessage {
        const message = new GameStateOutgoingMessage(this, playerId);
        return message;
    }

    public toGameStateOutgoing(playerId: string): GameStateOutgoing {
        return {
            gameId: this.gameId,
            gameTitle: this.gameTitle,
            players: this.players.reduce((acc, p) => {
                acc[p.id] = { isHost: p.isHost, name: p.name, score: p.score };
                return acc;
            }, {} as GameStateOutgoing["players"]),
            timer: this.timer,
            timerDuration: this.timerDuration,
            minCards: this.minCards,
            maxCards: this.maxCards,
            maxPlayers: this.maxPlayers,
            withInviteCode: this.withInviteCode,
            maxRounds: this.maxRounds,
            round: this.round,
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
    gameTitle: string;
    players: {
        [id: string]: {
            isHost: boolean;
            name: string;
            score: number;
        }
    };
    timer: number;
    timerDuration: number;
    maxRounds: number;
    minCards: number;
    maxCards: number;
    maxPlayers: number;
    withInviteCode: boolean;
    round: number;
    rounds: {
        picks: { [playerId: string]: Card[] };
        targetCards: Card[] | null;
        targetCardsNumber: number | null;
        targetColor: string | null;
        state: "waiting" | "playing" | "finished";
    }[];
}

