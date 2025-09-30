import { useEffect, useState, useMemo } from "react";
import { MAX_SELECTION_COUNT, ROUND_TIME_IN_SEC } from "./lib/constants";
import { colors, createRandomColor, calculateHex } from "./lib/color";
// import Chat from "./components/Chat.tsx";
import StartGameIcon from "./components/StartGameIcon.tsx";


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

    // prepare palette colors with their hex values
    // useMemo to avoid recalculating on every render (since colors is static, this will nuw only run once)
    const paletteColors = useMemo(() => {
        return [...colors.entries()].map(([name, arr]) => {
            const color = calculateHex(new Map([[name, arr]]));
            return { name, arr, color };
        });
    }, []);

    // prepare hex values for targetColor and currentMix
    // useMemo to avoid recalculating on every render (only when targetColor or currentMix changes)
    const targetColorHex = useMemo(() => calculateHex(targetColor), [targetColor]);
    const mixedColorHex = useMemo(() => calculateHex(currentMix), [currentMix]);


    return (
        <div className="flex flex-col sm:flex-row bg-gray-100 font-poppins min-h-screen">
            <div className="flex-grow w-full sm:w-3/4 flex items-center justify-center bg-gray-200">
                <div className="game-container w-full max-w-4xl px-2 sm:px-0">
                    <header className="game-header text-xl sm:text-3xl text-center font-extrabold pt-4">
                        <h1>CMYK Color Mixer</h1>
                    </header>
                    <section className="goal-section flex flex-row justify-around my-4 gap-6 sm:gap-0">
                        <div className="color-display flex-1 flex flex-col items-center">
                            <h2 className="text-md sm:text-2xl font-semibold text-center pb-3">Ziel-Farbe</h2>
                            <div className="color-swatch target-color">
                                <div className="color-card w-28 h-28 sm:w-36 sm:h-36 border-2 rounded-xl text-center
                                                transition-colors duration-1000 ease-in-out cursor-pointer sm:cursor-default"
                                     style={{
                                         borderColor: `color-mix(in srgb, ${targetColorHex} 100%, black 50%)`,
                                         backgroundColor: targetColorHex
                                     }}
                                     onClick={() => startNewGame()}
                                >
                                    <span className="inline-block sm:hidden font-bold text-white text-shadow-test text-xs sm:text-base">
                                        {timer >= 0 ? timer : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:flex flex-1 flex-col items-center">
                            <div className={`timer-display flex flex-col items-center cursor-pointer`}
                                 onClick={() => startNewGame()}
                            >
                                <div className={`timer-circle w-20 h-20 sm:w-24 sm:h-24 border-4 rounded-full bg-white shadow-md
                                            flex items-center justify-center mt-8 sm:mt-16 transition-all
                                            ${timer <= 0 ? "animate-pulse ring-4 ring-blue-400" : ""}`}
                                >
                                <span className="text-3xl sm:text-4xl font-bold">
                                    {timer === -1 ? <StartGameIcon /> : timer}
                                </span>
                                </div>
                            </div>
                        </div>
                        <div className="color-display flex-1 flex flex-col items-center">
                            <h2 className="text-md sm:text-2xl font-semibold text-center pb-3">Deine Mischung</h2>
                            <div className="color-swatch current-mix">
                                <div className="color-card w-28 h-28 sm:w-36 sm:h-36 border-2 rounded-xl transition-colors duration-1000 ease-in-out"
                                     style={{
                                         borderColor: `color-mix(in srgb, ${mixedColorHex} 100%, black 50%)`,
                                         backgroundColor: mixedColorHex
                                     }}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 sm:grid-cols-6 gap-3 sm:gap-4">
                        {paletteColors.map((c) => {
                            const isSelected = selection.has(c.name);
                            const style = {
                                borderColor: `color-mix(in srgb, ${c.color} 100%, black 50%)`,
                                backgroundColor: c.color,
                            };
                            return (
                                <div key={c.name}
                                     onClick={() => handleColorSelect([c.name, c.arr])}
                                     className={`color-card w-20 h-28 sm:w-30 sm:h-40 rounded-xl flex items-end justify-center sm:justify-end
                                             cursor-pointer border-2 hover:border-4 transition-transform
                                             ${isSelected ? 'scale-105 border-6' : ''}`}
                                     style={style}
                                     data-color={c.name}
                                >
                                    <div className="card-text p-2 font-bold text-white text-shadow-test text-xs sm:text-base">{c.name}</div>
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