import { Card } from "../lib/color";
import { GameState } from "./gamestate";

export interface IncomingMessage {
    type: "CHAT" | "CARDS_PICKED" | "START_ROUND" | "NEW_ROUND";
}

export interface ChatIncomingMessage extends IncomingMessage {
    type: "CHAT";
    content: string;
}

export interface NewRoundIncomingMessage extends IncomingMessage {
    type: "NEW_ROUND";
}

export interface StartRoundIncomingMessage extends IncomingMessage {
    type: "START_ROUND";
}

export interface CardsPickedIncomingMessage extends IncomingMessage {
    type: "CARDS_PICKED";
    cards: Card[];
}

//-------------------------------------------------------------

export interface GameStateOutgoing {
    players: { id: string; name: string; score: number }[];
    timer: number;
    round: number;
    maxRounds: number;
    rounds: {
        picks: { [playerId: string]: Card[] };
        targetCards: Card[] | null;
        targetColor: string;
        state: "waiting" | "playing" | "finished";
    }[];
}

export abstract class OutgoingMessage {
    id: string;
    type: "CHAT" | "TIMER_UPDATE" | "START_ROUND" | "ROUND_END" | "GAME_STATE" | "ERROR" | "SUCCESS";
    timestamp: number;
    constructor(type: OutgoingMessage["type"]) {
        this.id = crypto.randomUUID()
        this.type = type;
        this.timestamp = Date.now();
    }
}

export class GameStateOutgoingMessage extends OutgoingMessage {
    gameState: GameStateOutgoing;
    constructor(gameState: GameState) {
        super("GAME_STATE");
        this.gameState = {
            players: gameState.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
            timer: gameState.timer,
            round: gameState.round,
            maxRounds: gameState.maxRounds,
            rounds: gameState.rounds.map(r => ({
                picks: r.picks,
                targetCards: r.state === "finished" ? r.targetCards : null,
                targetColor: r.targetColor,
                state: r.state
            }))
        }
    }
}

export class ChatOutgoingMessage extends OutgoingMessage {
    username: string;
    content: string;
    constructor(username: string, content: string) {
        super("CHAT");
        this.username = username;
        this.content = content;
    }
}

export class TimerUpdateOutgoingMessage extends OutgoingMessage {
    timer: number;
    constructor(timer: number) {
        super("TIMER_UPDATE");
        this.timer = timer;
    }
}

export class NewRoundOutgoingMessage extends OutgoingMessage {
    timer: number;
    round: number;
    targetColor: string;

    constructor(timer: number, round: number, targetColor: string) {
        super("START_ROUND");
        this.timer = timer;
        this.round = round;
        this.targetColor = targetColor;
    }
}

export class StartRoundOutgoingMessage extends OutgoingMessage {
    constructor() {
        super("START_ROUND");
    }
}

export class EndRoundOutgoingMessage extends OutgoingMessage {
    targetCards: Card[]; // or color?
    picks: { [playerId: string]: Card[] };
    constructor(targetCards: Card[], picks: { [playerId: string]: Card[] }) {
        super("ROUND_END");
        this.targetCards = targetCards; 
        this.picks = picks;
    }
}

export class StatusOutgoingMessage extends OutgoingMessage {
    content: string;
    constructor(type: "SUCCESS" | "ERROR", message: string) {
        super(type);
        this.content = message;
    }
}


