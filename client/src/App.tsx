import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

type ColorData = {
    name: string;
    color: number[];
};

const colorsOrigin: ColorData[] = [
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

const colors = new Map(
    colorsOrigin.map(({ name, color }) => [name, color])
);

function createRandomColor(colors: Map<string, number[]>): Map<string, number[]> {
    const colorSet = new Map<string, number[]>();
    const numColors = Math.floor(Math.random() * 3) + 2;
    const colorKeys = Array.from(colors.keys());

    while (colorSet.size < numColors) {
        const randomIndex = Math.floor(Math.random() * colorKeys.length);
        const key = colorKeys[randomIndex];
        if (!colorSet.has(key)) {
            colorSet.set(key, colors.get(key)!);
        }
    }
    return colorSet;
}

function StartPlayingIcon() {
    return (
        <svg width="100" height="100" viewBox="0 0 40 40" fill="none" aria-label="Start playing">
            <circle cx="20" cy="20" r="18" stroke="#000" strokeWidth="2" fill="#fff"/>
            <polygon points="16,13 28,20 16,27" fill="#000"/>
        </svg>
    );
}

function App() {
    const [msg, setMsg] = useState("");
    const [chat, setChat] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const [targetColor, setTargetColor] = useState<Map<string, number[]>>(new Map());
    const [currentMix, setCurrentMix] = useState(new Map<string, number[]>());
    const [selection, setSelection] = useState(new Map<string, number[]>());
    const [maxSelection] = useState(4);
    const [timer, setTimer] = useState(-1);

    function calculateHex(cmyk: Map<string, number[]>): string {
        const [c, m, y, k] = calculateColor(cmyk);

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
        const nextMix = new Map<string, number[]>();
        for (const colorName of selection.keys()) {
            const colorArr = colors.get(colorName);
            if (colorArr) {
                nextMix.set(colorName, colorArr);
            }
        }
        setCurrentMix(nextMix);
    }, [selection]);


    const handleColorSelect = (selectedColor: [string, number[]]) => {
        if (timer <= 0) {
            return;
        }

        const newSelection = new Map(selection);

        if (newSelection.size >= maxSelection && !newSelection.has(selectedColor[0])) {
            return;
        }
        if (newSelection.has(selectedColor[0])) {
            newSelection.delete(selectedColor[0]);
        } else {
            newSelection.set(selectedColor[0], selectedColor[1]);
        }

        setSelection(newSelection);
    };

    function calculateColor(colors: Map<string, number[]>): number[] {
        const combined = [0, 0, 0, 0];
        for (const color of colors.values()) {
            combined[0] += color[0];
            combined[1] += color[1];
            combined[2] += color[2];
            combined[3] += color[3];
        }
        return combined;
    }

    const chooseRandomColor = () => {
        setTargetColor(createRandomColor(colors));
        setTimer(20);
    }

    useEffect(() => {
        if (timer === 0) {
            const mixArr = calculateColor(currentMix);
            const targetArr = calculateColor(targetColor);
            const isMatch = mixArr.every((value, index) => value === targetArr[index]);
            if (isMatch) {
                setChat((prevChat) => [...prevChat, "You matched the color!"]);
            } else {
                setChat((prevChat) => [...prevChat, "Time's up! You did not match the color."]);
            }
        }

        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);


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
                                {targetColor.size > 0 ? (
                                    <div
                                        className="color-card w-36 h-36 border-4 rounded-xl transition-colors duration-1000 ease-in-out"
                                        style={{
                                            borderColor: `color-mix(in srgb, ${calculateHex(targetColor)} 100%, black 50%)`,
                                            backgroundColor: `${calculateHex(targetColor)}`
                                        }}
                                    ></div>
                                ) : (
                                    <div
                                        className="color-card w-36 h-36 border-4 rounded-xl bg-gray-300 border-gray-400 flex items-center justify-center text-gray-500 text-lg"
                                    >
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div
                                className={`timer-display flex flex-col items-center cursor-pointer`}
                                onClick={() => chooseRandomColor()}
                            >
                                <div
                                    className={`timer-circle w-24 h-24 border-4 rounded-full bg-white shadow-md
                                                flex items-center justify-center mt-16 transition-all 
                                                ${timer <= 0 ? "animate-pulse ring-4 ring-blue-400" : ""}`}
                                >
                                    <span className="text-4xl font-bold">
                                        {timer === -1 ? <StartPlayingIcon /> : timer}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="color-display flex flex-col items-center">
                            <h2 className="text-2xl font-semibold text-center pb-3">Deine Mischung</h2>
                            <div className="color-swatch current-mix">
                                <div
                                    className="color-card w-36 h-36 border-4 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${calculateHex(currentMix)} 100%, black 50%)`,
                                        backgroundColor: `${calculateHex(currentMix)}`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 gap-4">
                        {[...colors.entries()].map((c) => {
                            const isSelected = selection.has(c[0]);
                            return (
                                <div
                                    key={c[0]}
                                    onClick={() => handleColorSelect(c)}
                                    className={`color-card w-30 h-40 border-4 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform
                                           ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500' : ''}`}
                                    style={{borderColor: `color-mix(in srgb, ${calculateHex(new Map([[c[0], c[1]]]))} 100%, black 50%)`, backgroundColor: `${calculateHex(new Map([[c[0], c[1]]]))}`}}
                                    data-color={c[0]}
                                >
                                    <div className="card-text p-2 font-bold text-white text-shadow-test">{c[0]}</div>
                                </div>
                            );
                        })}
                    </main>

                    <footer className="controls-section">
                    </footer>

                </div>
            </div>

            {/* change to "flex flex-col", when we add the chat again */}
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