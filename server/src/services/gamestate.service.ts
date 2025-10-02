import { EventEmitter } from 'stream';
import { calculateHex, Card, colors, createRandomColor } from '../lib/color';
import { ROUND_TIME_IN_SECONDS } from '../lib/constants';
import { GameState } from '../models/gamestate';
import { IncomingMessage, ChatIncomingMessage, StartRoundIncomingMessage, CardsPickedIncomingMessage, StartRoundOutgoingMessage, ChatOutgoingMessage, EndRoundOutgoingMessage, NewRoundIncomingMessage, NewRoundOutgoingMessage, TimerUpdateOutgoingMessage, StatusOutgoingMessage } from '../models/messages';
import { Socket, Server } from 'socket.io';
import { parse as parseCookie } from 'cookie';

/**
 * Main Game class handling game logic, state, and communication via Socket.IO.
 * Extends EventEmitter to allow event-driven architecture.
 * Events:
 * - "chat_message": Emitted when a chat message is received.
 * - "cards_picked": Emitted when a player picks cards.
 * - "new_round": Emitted when a new round is created.
 * - "start_round": Emitted when a round starts.
 * - "end_round": Emitted when a round ends.
 * - "game_over": Emitted when the game is over.
 */
export class Game extends EventEmitter {
    constructor(
        private readonly io: Server,
        private readonly clients: Map<string, Socket> = new Map<string, Socket>(),
        private readonly gameState: GameState = new GameState(),
        private chatHistory: ChatIncomingMessage[] = [],
    ) {
        super()
        this.initializeSocketListeners();
    }

    private initializeSocketListeners() {
        this.io.on("connection", (socket) => {
            console.log("Websocket client connected:", socket.id);

            const cookies = parseCookie(socket.handshake.headers.cookie || "");

            console.log("Cookies from client ("+ socket.id + "):", cookies);

            const playerId = cookies.playerId;

            if (!playerId) {
                console.error("No playerId cookie found. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
                socket.disconnect()
                return;
            }

            if (this.clients.has(playerId)) {
                console.error("Player with this ID already connected:", playerId);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are already connected from another device / tab / browser."));
                socket.disconnect()
                return;
            }

            // Add to connected clients
            this.clients.set(playerId, socket);

            // Add player to gamestate (or update socket ID if already exists)
            this.addPlayer(playerId, socket.id, `Player ${this.gameState.players.length + 1}`, this.gameState.players.length === 0);
            socket.emit("game_message", new StatusOutgoingMessage("SUCCESS", "Successfully connected to the game server."));

            console.log("Active players: ", this.gameState.players)


            socket.on("game_message", (data) => {

                if (!data || !data.type) {
                    console.error("Invalid message format:", data);
                    return;
                }

                this.handleMessage(socket, data as IncomingMessage);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
                this.clients.delete(playerId);
            });

        });
    }

    handleMessage(socket: Socket, message: IncomingMessage) {
        switch (message.type) {
            case "CHAT":
                this.handleChatMessage(socket, message as ChatIncomingMessage);
                break;
            case "CARDS_PICKED":
                this.handleCardsPickedMessage(socket, message as CardsPickedIncomingMessage);
                break;
            case "START_ROUND":
                this.handleStartRoundMessage(socket, message as StartRoundIncomingMessage);
                break;
            case "NEW_ROUND":
                this.handleNewRoundMessage(socket, message as NewRoundIncomingMessage);
                break;
            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
    }

    private handleChatMessage(socket: Socket, message: ChatIncomingMessage) {
        this.chatHistory.push(message);

        const outMessage = new ChatOutgoingMessage(
            this.getPlayerBySocketId(socket.id)?.name || "Unknown",
            message.content,
        );

        this.io.emit("game_message", outMessage);
        this.emit("chat_message", outMessage);
        // Optionally: emit event or notify listeners
    }

    private handleCardsPickedMessage(socket: Socket, message: CardsPickedIncomingMessage) {
        // Check if round has started in the gamestate
        const currentRound = this.gameState.rounds[this.gameState.round - 1]

        if (!currentRound) {
            return;
        }

        if (currentRound.state !== "playing") {
            return;
        }

        const player = this.getPlayerBySocketId(socket.id);

        if (!player) {
            throw new Error("Player not found for socket id: " + socket.id);
        }

        if (currentRound.picks[player?.id] === undefined) {
            currentRound.picks[player?.id] = message.cards;
            return;
        }

        this.emit("cards_picked", this.gameState);
    }

    private handleNewRoundMessage(socket: Socket, message: NewRoundIncomingMessage) {
        const previousRound = this.gameState.rounds[this.gameState.round - 1];

        if (previousRound === undefined) {
            if (this.gameState.round !== 0) {
                throw new Error("Previous round not found, but round number is not zero.");
            }
        } else {
            if (previousRound.state !== "finished" && this.gameState.round !== 0) {
                throw new Error("Cannot start a new round before the previous one is finished.");
            }
        }

        if (this.gameState.round >= this.gameState.maxRounds) {
            throw new Error("Maximum number of rounds reached.");
        }

        const targetCards = [...createRandomColor(colors).keys().map(c => c)];

        this.gameState.round += 1;
        this.gameState.rounds.push({
            picks: {},
            targetCards: targetCards, // Optionally: set target cards
            targetColor: calculateHex(targetCards),
            state: "waiting",
        });
        this.gameState.timer = ROUND_TIME_IN_SECONDS;
        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            throw new Error("Current round not found after starting a new round.");
        }

        const newRoundMessage = new NewRoundOutgoingMessage(
            this.gameState.timer,
            this.gameState.round,
            currentRound.targetColor
        )

        this.io.emit("game_message", newRoundMessage);
        this.emit("new_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    private handleStartRoundMessage(socket: Socket, message: StartRoundIncomingMessage) {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            throw new Error("No current round to start.");
        }

        if (currentRound.state !== "waiting") {
            throw new Error("Current round is not in a state to start playing.");
        }

        currentRound.state = "playing";

        this.io.emit("game_message", new StartRoundOutgoingMessage());

        // Start countdown timer
        const timerInterval = setInterval(() => {
            if (this.gameState.timer > 0) {
                this.gameState.timer -= 1;
                this.io.emit("game_message", new TimerUpdateOutgoingMessage(this.gameState.timer));
            } else {
                clearInterval(timerInterval);
                this.roundEnd();
            }
        }, 1000);

        this.emit("start_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    roundEnd() {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            throw new Error("No current round to end.");
        }
        currentRound.state = "finished";

        this.io.emit("game_message", new EndRoundOutgoingMessage(
            currentRound.targetCards,
            currentRound.picks
        ));

        if (this.gameState.round >= this.gameState.maxRounds) {
            this.emit("game_over", this.gameState);
            return;
        }

        this.emit("end_round", this.gameState);
        // TODO: calculate scores 
    }

    addPlayer(playerId: string, socketId: string, name: string, isHost: boolean = false) {
        if (this.gameState.players.find(p => p.id === playerId)) {

            // Update Socket ID if player already exists
            this.gameState.players = this.gameState.players.map(p => {
                if (p.id === playerId) {
                    return { ...p, socketId };
                }       
                return p;
            });
            return;

        }
        this.gameState.players.push({ id: playerId, socketId, name, score: 0, isHost});
    }

    removePlayerBySocketId(socketId: string) {
        this.gameState.players = this.gameState.players.filter(p => p.socketId !== socketId);
    }

    removePlayerById(playerId: string) {
        this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
    }

    getPlayerBySocketId(socketId: string) {
        return this.gameState.players.find(p => p.socketId === socketId);
    }

    getChatHistory(): ChatIncomingMessage[] {
        return [...this.chatHistory];
    }

    getPickedCards(playerId: string): Card[] {
        return this.gameState.rounds[this.gameState.round - 1]?.picks[playerId] || [];
    }

    isRoundPlaying(): boolean {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];
        return currentRound?.state === "playing";
    }

    isRoundFinished(): boolean {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];
        return currentRound?.state === "finished";
    }

    isRoundWaiting(): boolean {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];
        return currentRound?.state === "waiting";
    }

    getGameState(): GameState {
        return this.gameState;
    }
}