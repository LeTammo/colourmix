import React, {useState, useRef, useEffect} from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function Chat() {
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const [chat, setChat] = useState<string[]>([]);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        const onChatMessage = (incoming: string) => {
            setChat((prevChat) => [...prevChat, incoming]);
        };
        socket.on("chat message", onChatMessage);
        return () => {
            socket.off("chat message", onChatMessage);
        };
    }, []);

    const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (msg.trim()) {
            socket.emit("chat message", msg);
            setMsg("");
        }
    };

    return (
        <div className="w-1/4 flex flex-col bg-white border-l border-gray-300 shadow-lg">

            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-5">
                <ul className="space-y-3">
                    {chat.map((c, i) => (
                        <li key={i}
                            className="p-2 px-3 bg-blue-100 text-gray-800 rounded-lg max-w-[85%] break-words">
                            {c}
                        </li>
                    ))}
                </ul>
                <div ref={chatEndRef} />
            </div>

            <form className="p-5 border-t border-gray-200 bg-gray-50 flex items-center" onSubmit={sendMessage}>
                <input
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Type a message..."
                />
                <button
                    type="submit"
                    className="ml-3 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;