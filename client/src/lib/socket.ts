import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// The URL should point to your Socket.IO server
const SERVER_URL = 'http://localhost:3000'; // Replace with your actual server URL

// This variable will hold the single instance of the socket.
// It is initialized when this module is first imported.
export const socket = io(SERVER_URL, {
    // Optional: Add configuration options here
    autoConnect: false, // Set to false if you want to connect manually later
    withCredentials: true, // Include credentials if needed
});



/**
 * A custom hook to access the single Socket.IO instance and manage its connection status.
 * @returns {object} An object containing the socket instance and the connection status.
 */
export function useSocket() {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        // Event listeners to update the connection state
        function onConnect() {
            setIsConnected(true);
            console.log('Socket connected!');
        }

        function onDisconnect() {
            setIsConnected(false);
            console.log('Socket disconnected!');
        }

        function onAnyOutgoing(_event: string, ...data: unknown[]) {
            console.log('Sent game message:', data);
        }

        // Attach listeners to the single socket instance
        socket.onAnyOutgoing(onAnyOutgoing);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // If the socket is set to autoConnect: false, you'll need to call connect() here
        if (!socket.connected) {
            socket.connect();
        }

        // CLEANUP FUNCTION: IMPORTANT!
        // The listeners need to be removed when the component that uses this hook unmounts,
        // to prevent memory leaks, BUT the socket instance itself remains.
        return () => {
            socket.offAnyOutgoing(onAnyOutgoing);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []); // Empty dependency array ensures this setup runs only on mount

    return { socket, isConnected };
}