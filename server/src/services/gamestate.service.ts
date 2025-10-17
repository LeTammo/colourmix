import { EventEmitter } from 'stream';
import { createRandomColor } from '../lib/color';
import { ROUND_TIME_IN_SECONDS } from '../lib/constants';
import { GameState, Player } from "../../../shared/models/gamestate";
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
        public readonly gameState: GameState = new GameState(),
        private chatHistory: ChatIncomingMessage[] = [],
    ) {
        super()
        this.createNewRound();
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
            this.getPlayerById(socket.user?.id)?.name || "Unknown",
            message.content,
        );

        if (!socket.gameId) {
            console.error("Socket has no gameId. Cannot broadcast chat message.");
            return;
        }

        this.io.to(socket.gameId).emit("game_message", outMessage);
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

        const player = this.getPlayerById(socket.user?.id);

        if (!player) {
            throw new Error("Player not found for socket id: " + socket.id);
        }

        currentRound.picks[player?.id] = message.cards;

        this.emit("cards_picked", this.gameState);
    }

    private handleNewRoundMessage(socket: Socket, message: NewRoundIncomingMessage) {
        const player = this.getPlayerById(socket.user?.id);

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

        if (!socket.gameId) {
            console.error("Socket has no gameId. Cannot broadcast new round message.");
            return;
        }

        this.io.to(socket.gameId).emit("game_message", newRoundMessage);
        this.emit("new_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    private handleStartRoundMessage(socket: Socket, message: StartRoundIncomingMessage) {
        const player = this.getPlayerById(socket.user?.id);

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
        
        
        // Start countdown timer
        const timerInterval = setInterval(() => {
            if (this.gameState.timer > 1) {
                this.gameState.timer -= 1;
                if (!socket.gameId) {
                    console.error("Socket has no gameId. Cannot broadcast timer update.");
                    return;
                }

                this.io.to(socket.gameId).emit("game_message", new TimerUpdateOutgoingMessage(this.gameState.timer));
            } else {
                this.gameState.timer = 0;
                this.roundEnd(socket);
                clearInterval(timerInterval);
            }
        }, 1000);
        
        if (!socket.gameId) {
            console.error("Socket has no gameId. Cannot broadcast start round message.");
            return;
        }

        this.io.to(socket.gameId).emit("game_message", new StartRoundOutgoingMessage(currentRound.targetColor, currentRound.targetCards.length));
        this.emit("start_round", this.gameState);
        // Optionally: reset state, emit event, etc.
    }

    roundEnd(socket: Socket) {
        const currentRound = this.gameState.rounds[this.gameState.round - 1];

        if (!currentRound) {
            console.warn("No current round to end.");
            return;
        }
        currentRound.state = "finished";

        this.calculateScores(currentRound.picks, currentRound.targetCards);

        this.emit("end_round", this.gameState);
        
        if (!socket.gameId) {
            console.error("Socket has no gameId. Cannot broadcast end round message.");
            return;
        }

        this.io.to(socket.gameId).emit("game_message", new EndRoundOutgoingMessage(
            currentRound.targetCards,
            currentRound.picks,
            // Emit scores as a map of playerId to score
            this.gameState.players.reduce((acc, p) => {
                acc[p.id] = p.score;
                return acc;
            }, {} as { [playerId: string]: number }
        )));

        if (this.gameState.round >= this.gameState.maxRounds) {
            this.emit("game_over", this.gameState);
        }

    }

    calculateScores(cardsPicked: { [playerId: string]: Card[] }, targetCards: Card[]) {
        const targetSet = new Set(targetCards.map(c => c));

        for (const playerId in cardsPicked) {
            const pickedCards = cardsPicked[playerId];
            if (!pickedCards) continue;

            const correctPicks = pickedCards.filter(card => targetSet.has(card)).length;
            const wrongPicks = pickedCards.length - correctPicks;
            const player = this.getPlayerById(playerId);

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

    addPlayerIfNotExist(playerId: string, name: string, isHost: boolean = false) {
        if (this.getPlayerById(playerId)) {
            // Player already exists, no need to add
            return;
        }
        this.gameState.players.push({ id: playerId, name, score: 0, isHost});
    }

    removePlayerById(playerId: string) {
        this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
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

    getPlayerById(playerId: string): Player | undefined {
        return this.gameState.players.find(p => p.id === playerId);
    }
}