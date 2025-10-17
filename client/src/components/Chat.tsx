import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChatOutgoingMessage, GameStateOutgoingMessage, OutgoingMessage } from "../../../shared/models/messages";
import { useSocket } from "../lib/socket";

function Chat({players}: {players: GameStateOutgoingMessage["gameState"]["players"] | undefined}) {
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const { socket, connectionStatus } = useSocket();
    const [chat, setChat] = useState<ChatOutgoingMessage[]>([]);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    const onGameMessage = useCallback((incoming: OutgoingMessage) => {
        // Ensure the message is of type ChatOutgoingMessage
        if (incoming.type !== "CHAT") return;
        
        console.log("Received chat message:", incoming);
        
        setChat((prevChat) => [...prevChat, incoming as ChatOutgoingMessage]);
    }, []);

    useEffect(() => {

        socket.on("game_message", onGameMessage);
        return () => {
            socket.off("game_message", onGameMessage);
        };

    }, [socket, onGameMessage]);

    const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (msg.trim()) {
            socket.emit("game_message", {
                type: "CHAT",
                content: msg
            });
            setMsg("");
        }
    };

    return (
        <div className="flex flex-col bg-white border-l border-gray-300 shadow-lg">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">Game</h2>
            </div>

            {players && <div className="overflow-y-auto">
                <ul className="text-gray-800">
                    {(Array.from(Object.entries(players as Record<string, GameStateOutgoingMessage["gameState"]["players"][string]>))?.sort((a, b) => b[1].score - a[1].score).map(([id, p], i) => (
                        <li key={id} className="flex">
                            <div className={`flex-grow border-r border-gray-200 pl-5 py-2 text-md  ${i > 0 ? "border-t": ""}`}>{p.name} <span title="Host">{p.isHost ? "👑" : ""}</span></div>
                            <div className={`text-center w-30 border-blue-200 bg-blue-100 p-2 text-md  ${i > 0 ? "border-t": ""}`}>{p.score}</div>
                        </li>
                    )))}
                </ul>
            </div>}

            <div className="p-5 border-b border-t border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-5">
                <ul className="space-y-3">
                    {chat.map((c) => (
                        <React.Fragment key={c.id}>
                            <div>{c.username}:</div>
                            <li
                                className="p-2 px-3 bg-blue-100 text-gray-800 rounded-lg max-w-[85%] break-words"
                            >
                                {c.content}
                            </li>
                        </React.Fragment>
                    ))}
                </ul>
                <div ref={chatEndRef} />
            </div>

            <form className="p-5 border-t border-gray-200 bg-gray-50 flex items-center" onSubmit={sendMessage}>
                <input
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={msg}
                    disabled={connectionStatus !== "connected"}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Type a message..."
                />
                <button
                    type="submit"
                    disabled={!msg.trim() || connectionStatus !== "connected"}
                    className="disabled:bg-gray-300 ml-3 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;