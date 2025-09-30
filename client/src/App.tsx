import { useEffect, useState, useMemo } from "react";
import { MAX_SELECTION_COUNT, ROUND_TIME_IN_SEC } from "./lib/constants";
import { colors, createRandomColor, calculateHex } from "./lib/color";
// import Chat from "./components/Chat.tsx";
import StartGameIcon from "./components/StartGameIcon.tsx";
import Checkmark from "./components/Checkmark.tsx";
import X from "./components/X.tsx";


function App() {
    const [targetColor, setTargetColor] = useState<Map<string, number[]>>(new Map());
    const [currentMix, setCurrentMix] = useState(new Map<string, number[]>());
    const [selection, setSelection] = useState(new Map<string, number[]>());
    const [timer, setTimer] = useState(-1);

    // -1 = no game started yet
    //  0 = game ended
    // >0 = game running with x seconds left
    const startNewGame = () => {
        if (timer > 0) {
            return;
        }
        setSelection(new Map());
        setTargetColor(createRandomColor(colors));
        setTimer(ROUND_TIME_IN_SEC);
    }

    // If the timer is -1 or 0, nothing can be selected
    // If the timer is >0, colors can be selected up to a count of MAX_MIXING_COUNT
    // No duplicate colors allowed in selection
    const handleColorSelect = (selectedColor: [string, number[]]) => {
        if (timer <= 0) {
            return;
        }

        const newSelection = new Map(selection);

        if (newSelection.size >= MAX_SELECTION_COUNT && !newSelection.has(selectedColor[0])) {
            return;
        }
        if (newSelection.has(selectedColor[0])) {
            newSelection.delete(selectedColor[0]);
        } else {
            newSelection.set(selectedColor[0], selectedColor[1]);
        }

        setSelection(newSelection);
    };

    // Whenever the selection changes, recalculate the current mix
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

    // Round timer
    // Decrease timer every second if it's > 0
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    // prepare hex values for targetColor and currentMix
    // useMemo to avoid recalculating on every render (only when targetColor or currentMix changes)
    const targetColorHex = useMemo(() => calculateHex(targetColor), [targetColor]);
    const mixedColorHex = useMemo(() => calculateHex(currentMix), [currentMix]);


    type CardState = {
        name: string;
        arr: number[];
        color: string;
        inTarget: boolean;
        inSelection: boolean;
        status: "default" | "selected" | "selected-correct" | "selected-wrong" | "inactive" | "inactive-selected";
    };

    const cardStates: CardState[] = useMemo(() => {
        return [...colors.entries()].map(([name, arr]) => {
            const color = calculateHex(new Map([[name, arr]]));
            const inTarget = targetColor.has(name);
            const inSelection = selection.has(name);

            let status: CardState["status"] = "default";
            if (timer > 0) {
                status = inSelection ? "selected" : "default";
            } else if (timer === 0) {
                if (!inTarget && inSelection) status = "inactive-selected";
                else if (!inTarget && !inSelection) status = "inactive";
                else if (inTarget && inSelection) status = "selected-correct";
                else if (inTarget && !inSelection) status = "selected-wrong";
            }

            return { name, arr, color, inTarget, inSelection, status };
        });
    }, [targetColor, selection, timer]);

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
                                <div className="color-card w-30 h-40 border-2 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${targetColorHex} 100%, black 50%)`,
                                        backgroundColor: targetColorHex
                                    }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className={`timer-display flex flex-col items-center cursor-pointer`}
                                onClick={() => startNewGame()}
                            >
                                <div className={`timer-circle w-24 h-24 border-4 rounded-full bg-white shadow-md
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
                                <div className="color-card w-30 h-40 border-2 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${mixedColorHex} 100%, black 50%)`,
                                        backgroundColor: mixedColorHex
                                    }}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 gap-4 mt-8">
                        {cardStates.map((c) => {
                            const style: React.CSSProperties = {
                                borderColor: `color-mix(in srgb, ${c.color} 100%, black 50%)`,
                                backgroundColor: c.color,
                            };

                            if (c.status === "selected") {
                                style.outline = '3px solid #0ea5e9';
                                style.outlineOffset = '2px';
                            } else if (c.status === "inactive-selected") {
                                style.opacity = 0.3;
                                style.pointerEvents = 'none';
                                style.outline = '3px solid #94a3b8';
                                style.outlineOffset = '2px';
                            } else if (c.status === "inactive") {
                                style.opacity = 0.3;
                                style.pointerEvents = 'none';
                            } else if (c.status === "selected-correct") {
                                style.outline = '3px solid #00a63e';
                                style.outlineOffset = '2px';
                            } else if (c.status === "selected-wrong") {
                                style.outline = '3px dashed gray';
                                style.outlineOffset = '2px';
                            }

                            return (
                                <div key={c.name}
                                    onClick={() => {
                                        if (timer > 0) handleColorSelect([c.name, c.arr]);
                                    }}
                                    className={`color-card w-30 h-40 rounded-xl flex items-end justify-end
                                                cursor-pointer border-2 hover:scale-105 transition-transform relative`}
                                    style={style}
                                    data-color={c.name}
                                >
                                    <div>
                                        {c.status === "selected-correct" && (
                                            <div className="absolute drop-shadow-md top-12 left-0 right-0 bottom-0 m-auto w-1/2">
                                                <Checkmark />
                                            </div>
                                        )}

                                        <div className="card-text p-2 font-bold text-white text-shadow-test">{c.name}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </main>

                    <footer className="controls-section"></footer>
                </div>
            </div>

            {/* <Chat /> @TODO uncomment when used again */}
        </div>
    );
}

export default App;
