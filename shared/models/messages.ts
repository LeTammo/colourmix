import type { Card } from "./color";
import { GameState, type GameStateOutgoing } from "./gamestate";

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



export abstract class OutgoingMessage {
    id: string;
    type: "CHAT" | "TIMER_UPDATE" | "START_ROUND" | "NEW_ROUND" | "END_ROUND" | "GAME_STATE" | "ERROR" | "SUCCESS" | "INFO" | "WARNING";
    timestamp: number;
    constructor(type: OutgoingMessage["type"]) {
        this.id = crypto.randomUUID()
        this.type = type;
        this.timestamp = Date.now();
    }
}

export class GameStateOutgoingMessage extends OutgoingMessage {
    gameState: GameStateOutgoing;
    playerId: string;
    constructor(gameState: GameState, playerId: string) {
        super("GAME_STATE");
        this.playerId = playerId;
        this.gameState = gameState.toGameStateOutgoing(playerId);
    }
}

// TODO: PlayerJoinedOutgoingMessage, PlayerLeftOutgoingMessage, etc.

export type ChatSegment = { text: string; kind?: "correct" | "wrong" };

export class ChatOutgoingMessage extends OutgoingMessage {
    username: string;
    // Either plain text content or structured segments
    content?: string;
    segments?: ChatSegment[];
    constructor(username: string, content?: string, segments?: ChatSegment[]) {
        super("CHAT");
        this.username = username;
        if (content !== undefined) {
            this.content = content;
        }
        if (segments !== undefined) {
            this.segments = segments;
        }
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

    constructor(timer: number, round: number) {
        super("NEW_ROUND");
        this.timer = timer;
        this.round = round;
    }
}

export class StartRoundOutgoingMessage extends OutgoingMessage {
    targetColor: string;
    targetCardsNumber: number;
    constructor(targetColor: string, targetCardsNumber: number) {
        super("START_ROUND");
        this.targetColor = targetColor;
        this.targetCardsNumber = targetCardsNumber;
    }
}

export class EndRoundOutgoingMessage extends OutgoingMessage {
    targetCards: Card[]; // or color?
    picks: { [playerId: string]: Card[] };
    scores: { [playerId: string]: number };
    constructor(targetCards: Card[], picks: { [playerId: string]: Card[] }, scores: { [playerId: string]: number }) {
        super("END_ROUND");
        this.targetCards = targetCards;
        this.picks = picks;
        this.scores = scores;
    }
}

export class StatusOutgoingMessage extends OutgoingMessage {
    content: string;
    constructor(type: "SUCCESS" | "INFO" | "WARNING" | "ERROR", message: string) {
        super(type);
        this.content = message;
    }
}

export type OutgoingMessages =
    GameStateOutgoingMessage |
    TimerUpdateOutgoingMessage |
    StartRoundOutgoingMessage |
    EndRoundOutgoingMessage |
    NewRoundOutgoingMessage |
    StatusOutgoingMessage


