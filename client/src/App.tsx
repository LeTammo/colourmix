import { useEffect, useState, useMemo, useRef } from "react";
import { MAX_SELECTION_COUNT, ROUND_TIME_IN_SECONDS, CLOCK_VOLUME } from "./lib/constants";
import { colors, createRandomColor, calculateHex, type CMYKColor, type Card } from "./lib/color";
// import Chat from "./components/Chat.tsx";
import StartGameIcon from "./components/StartGameIcon.tsx";
import Checkmark from "./components/Checkmark.tsx";
import AudioPlayer, { type AudioPlayerHandle } from "./components/AudioPlayer";
import Chat from "./components/Chat.tsx";
import ToastMessage from "./components/ToastMessage.tsx"
import { socket } from "./lib/socket.ts";
import type { StatusOutgoingMessage } from "../../server/src/models/messages.ts";


function App() {
    const [targetColor, setTargetColor] = useState<Map<Card, CMYKColor>>(new Map());
    const [currentMix, setCurrentMix] = useState(new Map<Card, CMYKColor>());
    const [selection, setSelection] = useState(new Map<Card, CMYKColor>());
    const [timer, setTimer] = useState(-1);
    const [statusMessages, setStatusMessages] = useState<StatusOutgoingMessage[]>([]);

    const removeMessage = (id: string) => {
        setStatusMessages((msgs) => msgs.filter((msg) => msg.id !== id));
    };

    const soundFilePath = "clock.mp3"; // **Replace with your actual audio file path**
    const audioPlayerRef = useRef<AudioPlayerHandle>(null); // Ref to hold the AudioPlayer instance

    const handlePlaySound = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.play();
        }
    };

    const handleStopSound = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.stop();
        }
    };

    // -1 = no game started yet
    //  0 = game ended
    // >0 = game running with x seconds left
    const startNewGame = () => {
        if (timer > 0) {
            return;
        }
        setSelection(new Map());
        setTargetColor(createRandomColor(colors));
        setTimer(ROUND_TIME_IN_SECONDS);
        handlePlaySound()
    }

    // If the timer is -1 or 0, nothing can be selected
    // If the timer is >0, colors can be selected up to a count of MAX_MIXING_COUNT
    // No duplicate colors allowed in selection
    const handleColorSelect = (selectedColor: [Card, CMYKColor]) => {
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

    useEffect(() => {
        socket.on("game_message", onGameMessage);
        return () => {
            socket.off("game_message", onGameMessage);
        };
    }, [socket]);

    const onGameMessage = (message: StatusOutgoingMessage) => {
        console.log("Received game message:", message); // Debug log

        if (message.type === "ERROR" || message.type === "SUCCESS") {
            setStatusMessages((msgs) => [...msgs, message]);
        }
        // Handle other message types as needed
    }

    // Whenever the selection changes, recalculate the current mix
    useEffect(() => {
        const nextMix = new Map<Card, CMYKColor>();
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
        } else if (timer === 0) {
            handleStopSound();
        }
    }, [timer]);

    // prepare hex values for targetColor and currentMix
    // useMemo to avoid recalculating on every render (only when targetColor or currentMix changes)
    const targetColorHex = useMemo(() => calculateHex(targetColor), [targetColor]);
    const mixedColorHex = useMemo(() => calculateHex(currentMix), [currentMix]);

    type CardState = {
        name: Card;
        arr: CMYKColor;
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
        <div className="flex font-poppins h-screen">
            <div className="flex-grow w-3/4 flex relative items-center justify-center bg-gray-100">
                <ToastMessage messages={statusMessages} onRemove={(id) => removeMessage(id)} />

                <div className="game-container">
                    <header className="game-header text-3xl text-center font-extrabold">
                        <h1>CMYK Color Mixer</h1>
                    </header>
                    <section className="goal-section flex justify-around my-4 border-2 p-8 border-gray-400 rounded-2xl
                                        shadow-lg bg-white items-center">
                        <div className="color-display">
                            <h2 className="text-2xl font-semibold text-center pb-3">Zielfarbe</h2>
                            <div className="color-swatch target-color">
                                <div className="color-card w-45 h-60 border-3 rounded-xl transition-colors duration-1000 ease-in-out"
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
                                                flex items-center justify-center transition-all 
                                                ${timer <= 0 ? "animate-pulse ring-4 ring-blue-400" : ""}`}
                                >
                                    <span className="text-2xl font-bold">
                                        {timer <= 0 ? <StartGameIcon /> : "00:" + timer.toString().padStart(2, "0")}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="color-display flex flex-col items-center">
                            <h2 className="text-2xl font-semibold text-center pb-3">Dein Mix</h2>
                            <div className="color-swatch current-mix">
                                <div className="color-card w-45 h-60 border-3 rounded-xl transition-colors duration-1000 ease-in-out"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${mixedColorHex} 100%, black 50%)`,
                                        backgroundColor: mixedColorHex
                                    }}
                                ></div>
                            </div>
                        </div>
                    </section>

                    <main className="palette-section grid grid-cols-6 gap-4 mt-8 border-2 p-4 border-gray-400 rounded-2xl
                                     shadow-lg bg-white">
                        {cardStates.map((c) => {
                            const style: React.CSSProperties = {
                                borderColor: `color-mix(in srgb, ${c.color} 100%, black 50%)`,
                                backgroundColor: c.color,
                            };

                            if (c.status === "selected") {
                                style.outline = '3px solid #0ea5e9';
                                style.outlineOffset = '2px';
                            } else if (c.status === "inactive-selected") {
                                style.opacity = 0.2;
                                style.pointerEvents = 'none';
                                style.outline = '3px solid #94a3b8';
                                style.outlineOffset = '2px';
                            } else if (c.status === "inactive") {
                                style.opacity = 0.2;
                                style.pointerEvents = 'none';
                            } else if (c.status === "selected-correct") {
                                style.outline = '3px solid #000';
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

                                    {c.status === "selected-correct" && (
                                        <div className="absolute flex justify-center items-center drop-shadow-md top-0 left-0 right-0 bottom-0 m-auto">
                                            <Checkmark />
                                        </div>
                                    )}

                                    <div className="card-text p-2 font-bold text-white text-shadow-test">{c.name}</div>

                                </div>
                            );
                        })}
                    </main>

                    <footer className="controls-section">
                        <AudioPlayer src={soundFilePath} volume={CLOCK_VOLUME} ref={audioPlayerRef} />
                    </footer>
                </div>
            </div>
            <Chat />
        </div>
    );
}

export default App;
