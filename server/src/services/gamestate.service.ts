import { EventEmitter } from 'stream';
import { createRandomColor } from '../lib/color';
import { ROUND_TIME_IN_SECONDS } from '../lib/constants';
import { GameState } from "../../../shared/models/gamestate";
import { IncomingMessage, ChatIncomingMessage, StartRoundIncomingMessage, CardsPickedIncomingMessage, StartRoundOutgoingMessage, ChatOutgoingMessage, EndRoundOutgoingMessage, NewRoundIncomingMessage, NewRoundOutgoingMessage, TimerUpdateOutgoingMessage, StatusOutgoingMessage } from '../../../shared/models/messages';
import { Socket, Server } from 'socket.io';
import { UserWithoutPassword } from '../../../shared/models/user';
import { Card } from '../../../shared/models/color';
import { calculateHex, colors } from '../../../shared/lib/color';

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
        private readonly users: UserWithoutPassword[],
        private readonly clients: Map<string, Socket> = new Map<string, Socket>(),
        private readonly gameState: GameState = new GameState(),
        private chatHistory: ChatIncomingMessage[] = [],
    ) {
        super()
        this.initializeSocketListeners();
        this.createNewRound();
    }

    private initializeSocketListeners() {
        this.io.on("connection", (socket) => {
            console.log("Websocket client connected:", socket.id);

            const user = socket.user;

            if (!this.users || this.users.length === 0) {
                console.error("No users available. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "No users available on the server. Please contact the administrator."));
                socket.disconnect()
                return;
            }

            if (!user) {
                console.error("No user info found in socket. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
                socket.disconnect()
                return;
            }

            const playerId = user.playerId

            if (!playerId) {
                console.error("No playerId found. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
                socket.disconnect()
                return;
            }

            if (!this.users.find(u => u.id === playerId)) {
                console.error("Player ID not recognized. Connection rejected:", playerId);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Your user account is not recognized. Please contact the administrator."));
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
            this.addPlayer(playerId, socket.id, user.username, this.gameState.players.length === 0);
            socket.emit("game_message", new StatusOutgoingMessage("SUCCESS", "Successfully connected to the game server."));

            //console.log("Active players: ", this.gameState.players)

            socket.emit("game_message", this.gameState.toGameStateOutgoingMessage(playerId));

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
        console.log("Received message from", socket.id, ":", message);

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

        currentRound.picks[player?.id] = message.cards;

        this.emit("cards_picked", this.gameState);
    }

    private handleNewRoundMessage(socket: Socket, message: NewRoundIncomingMessage) {
        const player = this.getPlayerBySocketId(socket.id);

        if (!player) {
            console.error("Player not found for socket id: " + socket.id);
            return;
        }

        if (!player?.isHost) {
            console.warn("Only the host can start a new round.");
            return;
        }

        const previousRound = this.gameState.rounds[this.gameState.round - 1];

        if (previousRound === undefined) {
            if (this.gameState.round !== 0) {
                console.error("Previous round not found, but round number is not zero.");
                return
            }
        } else {
            if (previousRound.state !== "finished" && this.gameState.round !== 0) {
                console.warn("Cannot start a new round before the previous one is finished.");
                return
            }
        }

        if (this.gameState.round >= this.gameState.maxRounds) {
            console.warn("Maximum number of rounds reached.");
            return;
        }

        const newRound = this.createNewRound();

        if (!newRound) {
            console.error("Current round not found after starting a new round.");
            return
        }

        const newRoundMessage = new NewRoundOutgoingMessage(
            this.gameState.timer,
            this.gameState.round,
        )

        this.io.emit("game_message", newRoundMessage);
        this.emit("new_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    private handleStartRoundMessage(socket: Socket, message: StartRoundIncomingMessage) {
        const player = this.getPlayerBySocketId(socket.id);

        if (!player) {
            console.error("Player not found for socket id: " + socket.id);
            return;
        }

        if (!player?.isHost) {
            console.warn("Only the host can start the round.");
            return;
        }

        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            console.warn("No current round to start.");
            return
        }

        if (currentRound.state !== "waiting") {
            console.warn("Current round is not in a state to start playing.");
            return
        }

        currentRound.state = "playing";

        this.io.emit("game_message", new StartRoundOutgoingMessage(currentRound.targetColor, currentRound.targetCards.length));

        // Start countdown timer
        const timerInterval = setInterval(() => {
            if (this.gameState.timer > 1) {
                this.gameState.timer -= 1;
                this.io.emit("game_message", new TimerUpdateOutgoingMessage(this.gameState.timer));
            } else {
                this.gameState.timer = 0;
                this.roundEnd();
                clearInterval(timerInterval);
            }
        }, 1000);

        this.emit("start_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    roundEnd() {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            console.warn("No current round to end.");
            return;
        }
        currentRound.state = "finished";

        this.calculateScores(currentRound.picks, currentRound.targetCards);

        this.io.emit("game_message", new EndRoundOutgoingMessage(
            currentRound.targetCards,
            currentRound.picks,
            this.gameState.players.reduce((acc, p) => {
                acc[p.id] = p.score;
                return acc;
            }, {} as { [playerId: string]: number }
        )));

        if (this.gameState.round >= this.gameState.maxRounds) {
            this.emit("game_over", this.gameState);
            return;
        }

        this.emit("end_round", this.gameState);
    }

    calculateScores(cardsPicked: { [playerId: string]: Card[] }, targetCards: Card[]) {
        const targetSet = new Set(targetCards.map(c => c));

        for (const playerId in cardsPicked) {
            const pickedCards = cardsPicked[playerId];
            if (!pickedCards) continue;

            const correctPicks = pickedCards.filter(card => targetSet.has(card)).length;
            const wrongPicks = pickedCards.length - correctPicks;
            const player = this.gameState.players.find(p => p.id === playerId);

            if (player) {
                player.score += correctPicks - wrongPicks;
            }
        }
    }

    createNewRound() {
        const targetCards = [...createRandomColor(colors).keys().map(c => c)];

        this.gameState.round += 1;
        this.gameState.rounds.push({
            picks: {},
            targetCards: targetCards, // Optionally: set target cards
            targetColor: calculateHex(targetCards),
            state: "waiting",
        });
        this.gameState.timer = ROUND_TIME_IN_SECONDS;

        return this.gameState.rounds[this.gameState.round - 1];
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