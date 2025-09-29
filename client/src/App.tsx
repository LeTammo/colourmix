import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
    const [msg, setMsg] = useState("");
    const [chat, setChat] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scrollToBottom = () => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        };
        scrollToBottom();
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
        <div className="app-container">
            <div className="game-board">
                <h1>Game board will be here</h1>
            </div>
            <div className="chat-container">
                <div className="chat-header">
                    <h2>Chat Room</h2>
                </div>
                <div className="chat-messages">
                    <ul>
                        {chat.map((c, i) => (
                            <li key={i}>{c}</li>
                        ))}
                    </ul>
                    <div ref={chatEndRef} />
                </div>
                <form className="chat-form" onSubmit={sendMessage}>
                    <input
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default App;
