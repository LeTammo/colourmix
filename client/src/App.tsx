import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

type ColorData = {
    name: string;
    color: number[];
};

function App() {
    const [msg, setMsg] = useState("");
    const [chat, setChat] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const [targetColor, setTargetColor] = useState([0.3, 0.6, 0.7, 0]);
    const [currentMix, setCurrentMix] = useState([0, 0, 0, 0]);
    const [selection, setSelection] = useState(new Map<string, number>());
    const [maxSelection] = useState(4);

    const colors: ColorData[] = [
        {name: "C10", color: [0.1, 0, 0, 0]},
        {name: "C30", color: [0.3, 0, 0, 0]},
        {name: "C60", color: [0.6, 0, 0, 0]},
        {name: "M10", color: [0, 0.1, 0, 0]},
        {name: "M30", color: [0, 0.3, 0, 0]},
        {name: "M60", color: [0, 0.6, 0, 0]},
        {name: "Y10", color: [0, 0, 0.1, 0]},
        {name: "Y30", color: [0, 0, 0.3, 0]},
        {name: "Y60", color: [0, 0, 0.6, 0]},
        {name: "K10", color: [0, 0, 0, 0.1]},
        {name: "K30", color: [0, 0, 0, 0.3]},
        {name: "K60", color: [0, 0, 0, 0.6]},
    ];

    function cmykToRgbAndHex([c, m, y, k]: number[]): string {
        let r = 255 * (1 - c) * (1 - k);
        let g = 255 * (1 - m) * (1 - k);
        let b = 255 * (1 - y) * (1 - k);

        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);

        const toHex = (colorValue: number) => colorValue.toString(16).padStart(2, '0');
        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}ff`;
        return hex.toUpperCase();
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


    useEffect(() => {
        const nextMix = [0, 0, 0, 0];

        for (const colorName of selection.keys()) {
            const colorData = colors.find(c => c.name === colorName);
            if (colorData) {
                nextMix[0] += colorData.color[0];
                nextMix[1] += colorData.color[1];
                nextMix[2] += colorData.color[2];
                nextMix[3] += colorData.color[3];
            }
        }

        setCurrentMix(nextMix);
    }, [selection]);


    const handleColorSelect = (selectedColor: ColorData) => {
        const newSelection = new Map(selection);

        if (newSelection.size >= maxSelection && !newSelection.has(selectedColor.name)) {
            return;
        }
        if (newSelection.has(selectedColor.name)) {
            newSelection.delete(selectedColor.name);
        } else {
            newSelection.set(selectedColor.name, 1);
        }

        setSelection(newSelection);
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
                                    className="color-card w-36 h-36 border-4 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(targetColor)} 100%, black 50%)`,
                                            backgroundColor: `${cmykToRgbAndHex(targetColor)}`}}
                                    onClick={() => {
                                        const randomColor = [];
                                        const colorSet = new Set<number[]>();
                                        const colorNameSet = new Set<string>();
                                        const numColors = Math.floor(Math.random() * 3) + 2;

                                        while (colorSet.size < numColors) {
                                            const randomIndex = Math.floor(Math.random() * colors.length);
                                            colorSet.add(colors[randomIndex].color);
                                            colorNameSet.add(colors[randomIndex].name);
                                        }

                                        console.log("combined: ")
                                        Array.from(colorNameSet).forEach(c => console.log(c));

                                        for (const color of colorSet) {
                                            randomColor[0] = (randomColor[0] || 0) + color[0];
                                            randomColor[1] = (randomColor[1] || 0) + color[1];
                                            randomColor[2] = (randomColor[2] || 0) + color[2];
                                            randomColor[3] = (randomColor[3] || 0) + color[3];
                                        }

                                        setTargetColor(randomColor);
                                    }}
                                ></div>
                            </div>
                        </div>
                        <div className="color-display flex flex-col items-center">
                            <h2 className="text-2xl font-semibold text-center pb-3">Deine Mischung</h2>
                            <div className="color-swatch current-mix">
                                <div
                                    className="color-card w-36 h-36 border-4 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(currentMix)} 100%, black 50%)`,
                                            backgroundColor: `${cmykToRgbAndHex(currentMix)}`}}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 gap-4">
                        {colors.map((c) => {
                            const isSelected = selection.has(c.name);
                            return (
                                <div
                                    key={c.name}
                                    onClick={() => handleColorSelect(c)}
                                    className={`color-card w-30 h-40 border-4 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform
                                           ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500' : ''}`}
                                    style={{borderColor: `color-mix(in srgb, ${cmykToRgbAndHex(c.color)} 100%, black 50%)`, backgroundColor: `${cmykToRgbAndHex(c.color)}`}}
                                    data-color={c.name}
                                >
                                    <div className="card-text p-2 font-bold text-white text-shadow-test">{c.name}</div>
                                </div>
                            );
                        })}
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