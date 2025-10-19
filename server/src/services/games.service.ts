import { DefaultEventsMap, Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { UserWithoutPassword } from "../../../shared/models/user";
import { IncomingMessage, StatusOutgoingMessage } from "../../../shared/models/messages";
import { CreateGamePayload, Player } from "../../../shared/models/gamestate";

export class GamesService {

    private games: Map<string, GameService>;
    private io: Server;
    private users: UserWithoutPassword[];
    private gameConnections: Map<string, Map<string, Socket>> = new Map();


    constructor(socketServer: Server, users: UserWithoutPassword[]) {
        this.io = socketServer;
        this.users = users;
        this.games = new Map<string, GameService>();
        this.initializeSocketHandlers();
    }

    private initializeSocketHandlers() {
        this.io.on('connection', (socket) => {
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

            const playerId = user.id;

            // Ensure playerId is a non-empty string (match handleMessage validation)
            if (typeof playerId !== 'string' || playerId.trim() === '') {
                console.error("Invalid playerId found. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
                socket.disconnect();
                return;
            }

            if (!this.users.find(u => u.id === playerId)) {
                console.error("Player ID not recognized. Connection rejected:", playerId);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Your user account is not recognized. Please contact the administrator."));
                socket.disconnect()
                return;
            }


            if (!socket.handshake || !socket.handshake.auth) {
                console.error("No handshake auth data found. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Authentication data missing. Please try again later."));
                socket.disconnect();
                return;
            }

            const auth = socket.handshake.auth;

            const gameId = auth?.gameId;

            if (!gameId) {
                console.error("No gameId provided in socket. Connection rejected.");
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "No game ID provided. Please try again later."));
                socket.disconnect();
                return;
            }

            if (typeof gameId !== 'string' || gameId.trim() === '') {
                console.error("Invalid gameId provided in socket. Connection rejected:", gameId);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Invalid game ID provided. Please try again later."));
                socket.disconnect();
                return;
            }

            socket.gameId = gameId;

            const game = this.games.get(socket.gameId);

            if (!game) {
                console.error("Game not found:", socket.gameId);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Game not found. Please try again later."));
                socket.disconnect();
                return;
            }



            // Check if the player is already in the game before possibly adding them below.
            // This is intentional: we want to block joining if the game has started and the player is not yet present.
            const player = game.getPlayerById(playerId);

            // Check if the game is full only if the player is not already in the game
            if (!player && game.getGameState().players.length >= game.getGameState().maxPlayers) {
                console.error("Game is full. Connection rejected for player:", playerId);
                socket.emit("game_message", new StatusOutgoingMessage("WARNING", "Game is full. You cannot join this game."));
                socket.disconnect();
                return;
            }

            // Accessing the first round's state; safe even if rounds is empty due to optional chaining.
            const firstRoundState = game.getGameState().rounds[0]?.state
            if (!player && firstRoundState && firstRoundState !== "waiting") {
                console.error("Game already started. Connection rejected for player:", playerId);
                socket.emit("game_message", new StatusOutgoingMessage("WARNING", "Game already started. You cannot join now."));
                socket.disconnect();
                return;
            }

            if (this.gameConnections.has(gameId) && this.gameConnections.get(gameId)?.has(playerId)) {
                // Disconnect previous socket
                const existingSocket = this.gameConnections.get(gameId)?.get(playerId);
                if (existingSocket) {
                    console.log(`Player ${playerId} is already connected to game ${gameId}. Disconnecting previous connection.`);
                    existingSocket.emit("game_message", new StatusOutgoingMessage("WARNING", "You have been disconnected because you logged in from another device."));
                    existingSocket.disconnect();
                }
                this.gameConnections.get(gameId)?.delete(playerId);
            }

            // Create storage for game connections for a specific game if it doesn't exist
            if (!this.gameConnections.has(gameId)) {
                this.gameConnections.set(gameId, new Map());
            }
            // Store the new socket connection
            this.gameConnections.get(gameId)?.set(playerId, socket);

            // Add player to gamestate
            // Make first player the host
            try {
                game.addPlayerIfNotExist(playerId, user.username, game.getGameState().players.length === 0);
            } catch (error) {
                console.error("Error adding player to game:", error);
                socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Could not add you to the game. Please try again later."));
                socket.disconnect();
                return;
            }


            socket.join(socket.gameId);
            console.log(`Player ${user.username} joined game ${socket.gameId}`);

            socket.emit("game_message", new StatusOutgoingMessage("SUCCESS", "Successfully connected to the game server."));

            socket.emit("game_message", game.getGameState().toGameStateOutgoingMessage(playerId));


            socket.on("game_message", (data) => {
                // TODO: Validate message format
                if (!data || !data.type) {
                    console.error("Invalid message format:", data);
                    return;
                }

                this.handleMessage(socket, data as IncomingMessage);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
                if (socket.gameId && this.gameConnections.has(socket.gameId)) {
                    this.gameConnections.get(socket.gameId)?.delete(playerId);
                }
            });
        });
    }

    handleMessage(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, message: IncomingMessage) {
        const user = socket.user;

        // Validate message format
        // TODO: Add more detailed validation based on message types
        if (!message || !message.type) {
            console.error("Invalid message format:", message);
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Invalid Message format detected."));
            return;
        }

        // Validate user info
        if (!user) {
            console.error("No user info found in socket. Cannot handle message.");
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
            socket.disconnect()
            return;
        }

        const playerId = user.id;

        // Validate playerId
        if (typeof playerId !== 'string' || playerId.trim() === '') {
            console.error("Invalid playerId found. Cannot handle message.");
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "You are not logged in. Please log in to join the game."));
            socket.disconnect()
            return;
        }

        // Check if playerId exists in users
        if (!this.users.find(u => u.id === playerId)) {
            console.error("Player ID not recognized. Cannot handle message:", playerId);
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Your user account is not recognized. Please contact the administrator."));
            socket.disconnect()
            return;
        }

        const gameId = socket.gameId;

        if (typeof gameId !== 'string' || gameId.trim() === '') {
            console.error("Invalid gameId provided in socket. Cannot handle message:", gameId);
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Invalid game ID provided. Please try again later."));
            socket.disconnect();
            return;
        }

        const game = this.games.get(gameId);

        if (!game) {
            console.error("Game not found:", gameId);
            socket.emit("game_message", new StatusOutgoingMessage("ERROR", "Game not found. Please try again later."));
            socket.disconnect();
            return;
        }

        game.handleMessage(socket, message);
    }

    createGame(gameId: string, playerId: string, options: CreateGamePayload): GameService {
        if (this.games.has(gameId)) {
            throw new Error("Game with this ID already exists: " + gameId);
        }

        const newGame = new GameService(this.io, gameId, options);

        const hostUser = this.users.find(u => u.id === playerId);

        let player: Player | undefined;

        if (hostUser) {
            player = newGame.addPlayerIfNotExist(hostUser.id, hostUser.username, true);
        }

        if (player) {
            console.log("Added host player to the game (" + gameId + "):", player);
        }

        this.games.set(newGame.getGameState().gameId, newGame);
        this.gameConnections.set(newGame.getGameState().gameId, new Map());
        console.log("Created new game with ID:", newGame.getGameState().gameId);

        return newGame;
    }

    getGamesByPlayerId(playerId: string): GameService[] {
        const games: GameService[] = [];
        for (const game of this.games.values()) {
            if (game.getPlayerById(playerId)) {
                games.push(game);
            }
        }
        return games;
    }

    getGame(gameId: string): GameService | undefined {
        return this.games.get(gameId);
    }
}