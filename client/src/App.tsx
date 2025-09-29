import { useEffect, useState } from "react";
import StartGameIcon from "./components/StartGameIcon.tsx";
import Chat from "./components/Chat.tsx";
import {
    colors,
    createRandomColor,
    calculateHex
} from "./lib/color";


function App() {
    const [targetColor, setTargetColor] = useState<Map<string, number[]>>(new Map());
    const [currentMix, setCurrentMix] = useState(new Map<string, number[]>());
    const [selection, setSelection] = useState(new Map<string, number[]>());
    const [maxSelection] = useState(4);
    const [timer, setTimer] = useState(-1);

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

    const startNewGame = () => {
        if (timer > 0) {
            return;
        }
        setSelection(new Map());
        setTargetColor(createRandomColor(colors));
        setTimer(20);
    }

    useEffect(() => {
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
                                onClick={() => startNewGame()}
                            >
                                <div
                                    className={`timer-circle w-24 h-24 border-4 rounded-full bg-white shadow-md
                                                flex items-center justify-center mt-16 transition-all 
                                                ${timer <= 0 ? "animate-pulse ring-4 ring-blue-400" : ""}`}
                                >
                                    <span className="text-4xl font-bold">
                                        {timer === -1 ? <StartGameIcon /> : timer}
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
                                    className={`color-card w-30 h-40 rounded-xl flex items-end justify-end
                                           cursor-pointer hover:scale-105 transition-transform
                                           ${isSelected ? 'border-6' : 'border-2'}`}
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

            {/* <Chat /> @TODO uncomment when used again */}
        </div>
    );
}

export default App;