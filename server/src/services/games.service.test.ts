import { GamesService } from "./games.service";
import { UserWithoutPassword } from "../../../shared/models/user";
import { StatusOutgoingMessage } from "../../../shared/models/messages";

type MockSocketHandler = (socket: any) => void;

class MockServer {
    handlers: { [event: string]: MockSocketHandler[] } = {};
    on(event: string, handler: MockSocketHandler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    // helper to simulate a connection
    simulateConnection(socket: any) {
        const handlers = this.handlers['connection'] || [];
        handlers.forEach(h => h(socket));
    }
}

function makeMockSocket(overrides: any = {}) {
    const socket: any = {
        id: overrides.id || 'socket-1',
        handshake: overrides.handshake || { auth: {} },
        user: overrides.user,
        gameId: overrides.gameId,
        emit: jest.fn(),
        join: jest.fn(),
        disconnect: jest.fn(),
        handlers: {} as { [event: string]: Function },
        on(event: string, handler: Function) {
            this.handlers[event] = handler;
        },
        trigger(event: string, ...args: any[]) {
            if (this.handlers[event]) this.handlers[event](...args);
        },
    };
    return socket;
}

describe('GamesService socket initialization', () => {
    it('rejects connection when no users available', () => {
        const mockServer: any = new MockServer();
        const service = new GamesService(mockServer, []);

        const socket = makeMockSocket({ user: { id: 'p1', username: 'u1' }, handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(socket);

        expect(socket.emit).toHaveBeenCalled();
        expect(socket.disconnect).toHaveBeenCalled();
        const firstCallArg = (socket.emit as jest.Mock).mock.calls[0][1];
        expect(firstCallArg).toBeInstanceOf(StatusOutgoingMessage);
    });

    it('rejects connection when socket.user is missing', () => {
        const users = [new UserWithoutPassword('p1', 'u1')];
        const mockServer: any = new MockServer();
        const service = new GamesService(mockServer, users);

        const socket = makeMockSocket({ handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(socket);

        expect(socket.emit).toHaveBeenCalled();
        expect(socket.disconnect).toHaveBeenCalled();
        const firstCallArg = (socket.emit as jest.Mock).mock.calls[0][1];
        expect(firstCallArg).toBeInstanceOf(StatusOutgoingMessage);
    });

    it('rejects connection when playerId is invalid', () => {
        const users = [new UserWithoutPassword('p1', 'u1')];
        const mockServer: any = new MockServer();
        const service = new GamesService(mockServer, users);

        const socket = makeMockSocket({ user: { id: '', username: 'u1' }, handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(socket);

        expect(socket.emit).toHaveBeenCalled();
        expect(socket.disconnect).toHaveBeenCalled();
        const firstCallArg = (socket.emit as jest.Mock).mock.calls[0][1];
        expect(firstCallArg).toBeInstanceOf(StatusOutgoingMessage);
    });

    it('accepts connection for valid user and existing game', () => {
        const users = [new UserWithoutPassword('p1', 'u1')];
        const mockServer: any = new MockServer();
        const service = new GamesService(mockServer, users);

        const user = users[0];

        if (!user) {
            throw new Error("User not found");
        }


        // create game so it exists
        service.createGame('first-game', user.id, {
            gameTitle: "Test Game",
            minCards: 2,
            maxCards: 4,
            timerDuration: 15,
            maxPlayers: 4,
            maxRounds: 2,
        });

        const socket = makeMockSocket({ user: { id: 'p1', username: 'u1' }, handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(socket);

        // should have joined and received two success messages
        expect(socket.join).toHaveBeenCalledWith('first-game');
        expect(socket.emit).toHaveBeenCalled();
        // last emit should be GameStateOutgoingMessage, but we just check not error
        expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('tracks connections in gameConnections and replaces previous socket on re-login', () => {
        const users = [new UserWithoutPassword('p1', 'u1')];
        const mockServer: any = new MockServer();
        const service = new GamesService(mockServer, users);

        const user = users[0];

        if (!user) {
            throw new Error("User not found");
        }

        service.createGame('first-game', user.id, {
            gameTitle: "Test Game",
            minCards: 2,
            maxCards: 4,
            timerDuration: 15,
            maxPlayers: 4,
            maxRounds: 2,
        });

        const firstSocket = makeMockSocket({ id: 's1', user: { id: 'p1', username: 'u1' }, handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(firstSocket);

        const mapBefore = (service as any).gameConnections.get('first-game');
        expect(mapBefore).toBeDefined();
        expect(mapBefore.get('p1')).toBe(firstSocket);

        // simulate a second connection for same player
        const secondSocket = makeMockSocket({ id: 's2', user: { id: 'p1', username: 'u1' }, handshake: { auth: { gameId: 'first-game' } } });
        mockServer.simulateConnection(secondSocket);

        // previous socket should have been disconnected
        expect(firstSocket.emit).toHaveBeenCalled();
        expect(firstSocket.disconnect).toHaveBeenCalled();

        const mapAfter = (service as any).gameConnections.get('first-game');
        expect(mapAfter.get('p1')).toBe(secondSocket);

        // simulate disconnect of second socket
        secondSocket.trigger('disconnect');
        const mapFinal = (service as any).gameConnections.get('first-game');
        expect(mapFinal.has('p1')).toBe(false);
    });

    
});

