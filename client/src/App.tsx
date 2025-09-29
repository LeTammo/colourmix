import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
    const [msg, setMsg] = useState("");
    const [chat, setChat] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const colors = [
        {name: "C20", color: [0.2, 0, 0, 0]},
        {name: "C50", color: [0.5, 0, 0, 0]},
        {name: "C70", color: [0.7, 0, 0, 0]},
        {name: "M20", color: [0, 0.2, 0, 0]},
        {name: "M50", color: [0, 0.5, 0, 0]},
        {name: "M70", color: [0, 0.7, 0, 0]},
        {name: "Y20", color: [0, 0, 0.2, 0]},
        {name: "Y50", color: [0, 0, 0.5, 0]},
        {name: "Y70", color: [0, 0, 0.7, 0]},
        {name: "K20", color: [0, 0, 0, 0.2]},
        {name: "K50", color: [0, 0, 0, 0.5]},
        {name: "K70", color: [0, 0, 0, 0.7]},
    ]

    function cmykToRgbAndHex([c, m, y, k]: number[]): string {
        let r = 255 * (1 - c) * (1 - k);
        let g = 255 * (1 - m) * (1 - k);
        let b = 255 * (1 - y) * (1 - k);

        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);

        const toHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');

        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}ff`;

        return hex.toUpperCase()
    }

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
        <div className="flex bg-gray-100 font-poppins h-screen">
            <div className="flex-grow w-3/4 flex items-center justify-center bg-gray-200">
                <div className="game-container">
                    <header className="game-header text-3xl text-center font-extrabold">
                        <h1>CMYK Color Mixer</h1>
                    </header>
                    <section className="goal-section flex justify-around my-4">
                        <div className="color-display">
                            <h2 className="text-2xl font-semibold text-center pb-3">Ziel-Farbe</h2>
                            <div className="color-swatch target-color">
                                <div
                                    className="color-card w-36 h-36 border-4 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform"
                                    style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(colors[0].color)} 100%, black 50%)`, backgroundColor: `${cmykToRgbAndHex(colors[0].color)}`}}
                                    data-color={colors[0].name}
                                ></div>
                            </div>
                        </div>
                        <div className="color-display">
                            <h2 className="text-2xl font-semibold text-center pb-3">Deine Mischung</h2>
                            <div className="color-swatch current-mix">
                                <div
                                    className="color-card w-36 h-36 border-4 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform"
                                    style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(colors[0].color)} 100%, black 50%)`, backgroundColor: `${cmykToRgbAndHex(colors[0].color)}`}}
                                    data-color={colors[0].name}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 gap-4">
                        {colors.map((c) => (
                            <div
                                key={c.name}
                                className="color-card w-30 h-40 border-4 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform"
                                style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(c.color)} 100%, black 50%)`, backgroundColor: `${cmykToRgbAndHex(c.color)}`}}
                                data-color={c.name}
                            >
                                <div className="card-text p-2 font-bold text-white text-shadow-test">{c.name}</div>
                            </div>
                        ))}
                    </main>

                    <footer className="controls-section">

                    </footer>

                </div>
            </div>

            {/* change to: flex flex-col */}
            <div className="w-1/4 hidden bg-white border-l border-gray-300 shadow-lg">

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
        </div>
    );
}

export default App;
