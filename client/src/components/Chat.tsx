import React, { useState, useRef, useEffect } from "react";
import { ChatOutgoingMessage } from "../../../server/src/models/messages";
import { useSocket } from "../lib/socket";

function Chat() {
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const { socket, isConnected } = useSocket();
    const [chat, setChat] = useState<ChatOutgoingMessage[]>([]);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        const onGameMessage = (incoming: any) => {
            // Log incoming message for debugging
            console.log("Received message:", incoming);

            // Ensure the message is of type ChatOutgoingMessage
            if (incoming.type !== "CHAT") return;

            setChat((prevChat) => [...prevChat, incoming]);
        };
        socket.on("game_message", onGameMessage);
        return () => {
            socket.off("game_message", onGameMessage);
        };
    }, [socket]);

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
                <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-5">
                <ul className="space-y-3">
                    {chat.map((c, i) => (
                        <><div>{c.username}:</div><li key={i}
                            className="p-2 px-3 bg-blue-100 text-gray-800 rounded-lg max-w-[85%] break-words">
                            {c.content}
                        </li>
                        </>
                    ))}
                </ul>
                <div ref={chatEndRef} />
            </div>

            <form className="p-5 border-t border-gray-200 bg-gray-50 flex items-center" onSubmit={sendMessage}>
                <input
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={msg}
                    disabled={!isConnected}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Type a message..."
                />
                <button
                    type="submit"
                    disabled={!msg.trim() || !isConnected}
                    className="disabled:bg-gray-300 ml-3 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;