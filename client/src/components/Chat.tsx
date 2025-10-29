import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChatOutgoingMessage, GameStateOutgoingMessage, OutgoingMessage, type ChatSegment } from "../../../shared/models/messages";
import { useSocket } from "../lib/socket";
import { formatTime, initials, randomAvatarColor } from "../lib/ui";

function Chat({players, playerId}: {players: GameStateOutgoingMessage["gameState"]["players"] | undefined, playerId: string | null}) {
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

    const renderSegments = (segments?: ChatSegment[], fallback?: string) => {
        if (!segments || segments.length === 0) {
            // Plain messages: render as-is without any parsing
            return fallback ?? null;
        }
        return (
            <>
                {segments.map((seg, idx) => (
                    <span
                        key={idx}
                        className={seg.kind === "correct"
                            ? "text-green-700 font-semibold"
                            : seg.kind === "wrong"
                                ? "text-red-600 font-semibold"
                                : undefined}
                    >
                        {seg.text}
                    </span>
                ))}
            </>
        );
    };

    return (
        <div className="flex h-full flex-col bg-gray-100">
            <div className="px-4 pt-4">
                <div className="border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800">Players</h2>
                    </div>
                    {players && (
                        <div className="max-h-60 overflow-y-auto">
                            <ul className="divide-y divide-gray-200">
                                {Array.from(Object.entries(players as Record<string, GameStateOutgoingMessage["gameState"]["players"][string]>))
                                    .sort((a, b) => b[1].score - a[1].score)
                                    .map(([id, p]) => (
                                        <li key={id} className="flex items-center gap-3 px-4 py-2">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${randomAvatarColor(id)}`}>
                                                    {initials(p.name)}
                                                </div>
                                                <div className="truncate text-gray-800">
                                                    <span className={`${id === playerId ? "font-bold" : "font-medium"}`}>{p.name}</span>
                                                    {p.isHost && <span title="Host" className="ml-1" aria-label="Host">👑</span>}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                                                    {p.score} Points
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 py-4 flex-1 min-h-0">
                <div className="bg-white border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden h-full flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <h2 className="text-lg font-bold text-gray-800">Chat</h2>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${connectionStatus === "connected" ? "bg-green-100 text-green-800" : connectionStatus === "waiting" ? "bg-yellow-100 text-yellow-800" : "bg-gray-200 text-gray-700"}`}>
                            {connectionStatus}
                        </span>
                    </div>

                    <div className="flex flex-col justify-between h-full min-h-0">
                        <div className="flex-grow overflow-y-auto px-4 py-3">
                            <ul className="space-y-3">
                                {chat.map((c) => {
                                    const isSystem = c.username === "System";
                                    return (
                                        <li key={c.id} className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSystem ? "bg-gray-200 text-gray-700" : randomAvatarColor(c.playerId ?? "")}`}>
                                                {initials(c.username)}
                                            </div>
                                            <div className="max-w-[80%]">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-sm font-semibold text-gray-800">{c.username}</span>
                                                    <span className="text-xs text-gray-500">{formatTime(c.timestamp)}</span>
                                                </div>
                                                <div className={`mt-1 px-3 py-2 rounded-lg break-words ${(isSystem || c.playerId !== playerId) ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-gray-800"}`}>
                                                    {renderSegments(c.segments as ChatSegment[] | undefined, c.content)}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div ref={chatEndRef} />
                        </div>

                        <div>
                            <form className="border-t border-gray-200 px-4 py-3 flex items-center gap-2" onSubmit={sendMessage}>
                                <input
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={msg}
                                    disabled={connectionStatus !== "connected"}
                                    onChange={(e) => setMsg(e.target.value)}
                                    placeholder="Type a message..."
                                />
                                <button
                                    type="submit"
                                    disabled={!msg.trim() || connectionStatus !== "connected"}
                                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chat;