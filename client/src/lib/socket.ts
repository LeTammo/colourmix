import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Load the WebSocket URL from environment variables.
// Ensure that VITE_WS_URL is defined in your .env file.
const WS_URL = import.meta.env.VITE_WS_URL;

// This variable will hold the single instance of the socket.
// It is initialized when this module is first imported.
export const socket = io(WS_URL, {
    autoConnect: false,
    auth: {
        token: localStorage.getItem('token') || ''
        // gameId will be set dynamically
    }
});
/**
 * Set the gameId dynamically and connect the socket.
 * @param {string} gameId - The game ID to set for authentication.
 */
export function setGameIdAndConnect(gameId: string) {
    socket.auth = {
        ...socket.auth,
        gameId,
        token: localStorage.getItem('token') || ''
    };
    socket.connect();
}



/**
 * A custom hook to access the single Socket.IO instance and manage its connection status.
 * @returns {object} An object containing the socket instance and the connection status.
 */
export function useSocket() {
    const [connectionStatus, setConnectionStatus] = useState<"waiting" | "connected" | "disconnected" | "authentication_error" | "error">("waiting");

    // Clean up the socket connection when the component using this hook unmounts
    useEffect(() => {
        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        function onConnect() {
            setConnectionStatus("connected");
            console.log('Socket connected!');
        }
        function onConnectError(error: Error) {
            switch (error.message) {
                case 'Authentication error: Token required':
                case 'Authentication error: Invalid token':
                case 'Authentication error: Invalid token payload':
                case 'Authentication error: User not found':
                    setConnectionStatus("authentication_error");
                    break;
                default:
                    setConnectionStatus("error");
            }

            console.error('Socket connection error:', error);
        }
        function onDisconnect() {
            setConnectionStatus("disconnected");
            console.log('Socket disconnected!');
        }
        function onAnyOutgoing(_event: string, ...data: unknown[]) {
            console.log('Sent game message:', data);
        }
        socket.onAnyOutgoing(onAnyOutgoing);
        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', onDisconnect);
        // Do not auto-connect here; use setGameIdAndConnect instead
        return () => {
            socket.offAnyOutgoing(onAnyOutgoing);
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return { socket, connectionStatus };
}