import { useEffect, useState, useMemo, useRef, useCallback, use } from "react";
import { MAX_SELECTION_COUNT, CLOCK_VOLUME } from "./lib/constants";
import { colors, calculateHex, type CMYKColor, type Card } from "./lib/color";
// import Chat from "./components/Chat.tsx";
import StartGameIcon from "./components/StartGameIcon.tsx";
import AudioPlayer, { type AudioPlayerHandle } from "./components/AudioPlayer";
import Chat from "./components/Chat.tsx";
import ToastMessage from "./components/ToastMessage.tsx"
import { useSocket } from "./lib/socket.ts";
import type { EndRoundOutgoingMessage, GameStateOutgoingMessage, NewRoundOutgoingMessage, OutgoingMessage, StartRoundOutgoingMessage, StatusOutgoingMessage, TimerUpdateOutgoingMessage } from "../../server/src/models/messages.ts";
import ResetGameIcon from "./components/ResetGameIcon.tsx";
import type { CardState } from "./components/CardComponent.tsx";
import CardComponent from "./components/CardComponent.tsx";
import Login from "./components/Login.tsx";


type LoginStatus = "checking" | "logged_in" | "logged_out";

function App() {
    const [targetColor, setTargetColor] = useState<Map<Card, CMYKColor>>(new Map());
    const [currentMix, setCurrentMix] = useState(new Map<Card, CMYKColor>());
    const [selection, setSelection] = useState(new Map<Card, CMYKColor>());
    const [timer, setTimer] = useState(-1);
    const [isHost, setIsHost] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loginStatus, setLoginStatus] = useState<LoginStatus>("checking");
    const [state, setState] = useState<"waiting" | "playing" | "finished">("waiting");
    const [statusMessages, setStatusMessages] = useState<StatusOutgoingMessage[]>([]);
    const [gameState, setGameState] = useState<GameStateOutgoingMessage["gameState"] | null>(null);
    const { socket, connectionStatus } = useSocket();

    const removeMessage = (id: string) => {
        setStatusMessages((msgs) => msgs.filter((msg) => msg.id !== id));
    };

    const soundFilePath = "clock.mp3";
    const audioPlayerRef = useRef<AudioPlayerHandle>(null);

    const handlePlaySound = useCallback(() => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.play();
        }
    }, []);

    const handleStopSound = useCallback(() => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.stop();
        }
    }, []);

    const startNewGame = useCallback(() => {
        if (socket && gameState && gameState.rounds[gameState.round - 1]?.state === "finished") {
            if (isHost) {
                socket.emit("game_message", { type: "NEW_ROUND" })
            }
        }


        if (gameState && gameState.rounds[gameState.round - 1]?.state === "waiting") {
            //setTargetColor(createRandomColor(colors));
            //setTimer(ROUND_TIME_IN_SECONDS);
            if (isHost) {
                socket.emit("game_message", { type: "START_ROUND" })
            }
        }
    }, [gameState, isHost, socket]);
    // If the timer is -1 or 0, nothing can be selected
    // If the timer is >0, colors can be selected up to a count of MAX_MIXING_COUNT
    // No duplicate colors allowed in selection
    const handleColorSelect = useCallback((selectedColor: [Card, CMYKColor]) => {
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
        socket.emit("game_message", { type: "CARDS_PICKED", cards: Array.from(newSelection.keys()) });
    }, [selection, socket, timer]);

    const createColorMap = useCallback((targetCards: Card[]) => {
        const newTargetColor = new Map<Card, CMYKColor>();
        for (const card of targetCards) {
            const colorArr = colors.get(card);
            if (colorArr) {
                newTargetColor.set(card, colorArr);
            }
        }
        return newTargetColor;
    }, [])

    // Send a request to check login status when the component mounts
    /*useEffect(() => {
        if (!token) {
            setLoginStatus("logged_out");
            return;
        }

        fetch("http://localhost:3000/login", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.user) {
                    setLoginStatus("logged_in");
                } else {
                    setLoginStatus("logged_out");
                }
            })
            .catch((error) => {
                console.error("Error checking login status:", error);
                setLoginStatus("logged_out");
            });
    }, [token]);*/

    useEffect(() => {
        if (gameState) {
            if (timer !== gameState.timer) {
                setTimer(gameState.timer);
            }

            if (gameState.timer === 0) {
                handleStopSound();
            }

            if (gameState.rounds[gameState.round - 1]?.state === "playing" && gameState.timer > 0) {
                handlePlaySound();
            }

            // Set state based on gameState
            setState(gameState.rounds[gameState.round - 1]?.state || "waiting");

            const targetCards = gameState.rounds[gameState.round - 1]?.targetCards || [];
            setTargetColor(createColorMap(targetCards));
            // Reset selection when round changes
            const pickedCards = gameState.rounds[gameState.round - 1]?.picks || {};

            setIsHost(!!(playerId && gameState.players[playerId]?.isHost));

            const state = gameState.rounds[gameState.round - 1]?.state; // get current state from gameState


            switch (state) {
                case "waiting":
                    setSelection(new Map());
                    handleStopSound();
                    break;
                case "finished":
                    {
                        handleStopSound();
                        if (playerId === null) {
                            console.error("No player ID found");
                            setSelection(new Map())
                            break;
                        }
                        const playerCards = pickedCards[playerId]

                        if (playerCards === undefined) {
                            console.error("No player cards found, resetting selection");
                            setSelection(new Map())
                            break;
                        }
                        setSelection(createColorMap(playerCards))
                        
                        break;
                    }
                case "playing":
                    // Don't update selection when timer is updated during playing state


                    break;
                default:
                    setSelection(new Map())
                    return
            }
        }
    }, [createColorMap, gameState, handlePlaySound, handleStopSound, playerId, timer]);


    const onGameMessage = useCallback((message: OutgoingMessage) => {
        console.log("Received game message:", message); // Debug log

        if (message.type === "ERROR" || message.type === "SUCCESS") {
            setStatusMessages((msgs) => [...msgs, message as StatusOutgoingMessage]);
        } else if (message.type === "GAME_STATE") {
            // Receive initial game state or updates
            const gameStateMessage = message as GameStateOutgoingMessage;
            setGameState(gameStateMessage.gameState);

            const roundState = gameStateMessage.gameState.rounds[gameStateMessage.gameState.round - 1]?.state;
            if (roundState === "playing") {
                // Reset selection only if the round is in playing state and initial gamestate is received
                setSelection(new Map());
                socket.emit("game_message", { type: "CARDS_PICKED", cards: Array.from(selection.keys()) });
            }
            setPlayerId(gameStateMessage.playerId);
        } else if (message.type === "START_ROUND") {
            const startRoundMessage = message as StartRoundOutgoingMessage;
            setGameState((prev) => {
                if (prev) {
                    const updatedRounds = [...prev.rounds];
                    updatedRounds[prev.round - 1] = {
                        ...updatedRounds[prev.round - 1],
                        state: "playing",
                        targetColor: startRoundMessage.targetColor,
                        targetCardsNumber: startRoundMessage.targetCardsNumber
                    };
                    return {
                        ...prev,
                        round: prev.round,
                        rounds: updatedRounds
                    };
                }
                return prev;
            });
        } else if (message.type === "NEW_ROUND") {
            const newRoundMessage = message as NewRoundOutgoingMessage;
            setGameState((prev) => {
                if (prev) {
                    return {
                        ...prev,
                        round: newRoundMessage.round,
                        timer: newRoundMessage.timer,
                        rounds: [...prev.rounds, {
                            picks: {},
                            targetCards: [],
                            targetColor: null,
                            targetCardsNumber: 0,
                            state: "waiting"
                        }]
                    };
                }
                return prev;
            });
        } else if (message.type === "END_ROUND") {
            const endRoundMessage = message as EndRoundOutgoingMessage;
            setGameState((prev) => {
                if (prev) {
                    const updatedRounds = [...prev.rounds];
                    updatedRounds[prev.round - 1] = {
                        ...updatedRounds[prev.round - 1],
                        picks: endRoundMessage.picks,
                        state: "finished",
                        targetCards: endRoundMessage.targetCards
                    };
                    return {
                        ...prev,
                        timer: 0,
                        round: prev.round,
                        rounds: updatedRounds
                    };
                }
                return prev;
            });
        } else if (message.type === "TIMER_UPDATE") {
            const timerMessage = message as TimerUpdateOutgoingMessage;
            setGameState((prev) => {
                if (prev) {
                    return {
                        ...prev,
                        timer: timerMessage.timer
                    };
                }
                return prev;
            });
        }
        // Handle other message types as needed
    }, [selection, socket]);

    useEffect(() => {
        socket.on("game_message", onGameMessage);
        socket.on("disconnect", () => {
            setGameState(null);
            setPlayerId(null);

            setStatusMessages((msgs) => [...msgs, {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: "ERROR",
                content: "Lost connection to server. Try reloading the page.",
            }]);
        });

        return () => {
            socket.off("disconnect");
            socket.off("game_message", onGameMessage);
        };
    }, [onGameMessage, socket]);


    // Whenever the selection changes, recalculate the current mix
    useEffect(() => {
        console.log("Updated Selection")
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
    /*useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0) {
            handleStopSound();
        }
    }, [timer]);*/

    // prepare hex values for targetColor and currentMix
    // useMemo to avoid recalculating on every render (only when targetColor or currentMix changes)
    const currentTargetColor = useMemo(() => {
        if (gameState) {
            return gameState.rounds[gameState.round - 1]?.targetColor || "#FFFFFF";
        }
        return "#FFFFFF";
    }, [gameState]);

    const targetColorHex = useMemo(() => currentTargetColor, [currentTargetColor]);
    const mixedColorHex = useMemo(() => calculateHex(currentMix), [currentMix]);



    const cardStates: CardState[] = useMemo(() => {
        return [...colors.entries()].map(([name, arr]) => {
            const color = calculateHex(new Map([[name, arr]]));
            const inTarget = targetColor.has(name);
            const inSelection = selection.has(name);

            let status: CardState["status"] = "default";
            // Disable selection if state is 'waiting'
            if (state === "waiting") {
                // uncomment the next line to visually indicate inactive cards during waiting state
                //status = "inactive";
            } else if (state === "playing") {
                status = inSelection ? "selected" : "default";
            } else if (state === "finished") {
                if (!inTarget && inSelection) status = "inactive-selected";
                else if (!inTarget && !inSelection) status = "inactive";
                else if (inTarget && inSelection) status = "selected-correct";
                else if (inTarget && !inSelection) status = "selected-wrong";
            }

            return { name, arr, color, inTarget, inSelection, status };
        });
    }, [targetColor, selection, state]);

    return (
        <div className="flex font-nunito h-screen">
            <div className="flex-grow w-3/4 flex relative items-center justify-center bg-gray-100">
                <ToastMessage messages={statusMessages} onRemove={(id) => removeMessage(id)} />
                {connectionStatus === "waiting" && (<div className="text-center text-gray-600">Connecting to server...</div>)}
                {connectionStatus === "disconnected" && (<Login />)}
                {connectionStatus === "connected" && gameState && (<div className="game-container">
                    <header className="game-header text-3xl text-center font-extrabold">
                        <h1>CMYK Color Mixer</h1>
                    </header>
                    <section className="goal-section flex justify-around my-4 border-2 p-8 border-gray-400 rounded-2xl
                                        shadow-lg bg-white items-center">
                        <div className="color-display">
                            <h2 className="text-2xl font-semibold text-center pb-3">Target Color</h2>
                            <div className="color-swatch target-color">
                                <div className="color-card w-45 h-60 border-3 rounded-xl transition-colors duration-1000 ease-in-out flex items-end justify-end"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${targetColorHex} 100%, black 50%)`,
                                        backgroundColor: targetColorHex
                                    }}

                                >
                                    <div className="card-text p-2 font-bold text-white text-shadow-test">
                                        {state !== "waiting" ? `${gameState.rounds[gameState.round - 1].targetCardsNumber} Cards` : ""}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className={`timer-display flex flex-col items-center cursor-pointer ${isHost || state === "playing" ? "" : "pointer-events-none opacity-30"}`}
                                onClick={() => startNewGame()}
                            >
                                <div className={`timer-circle w-24 h-24 border-4 rounded-full bg-white shadow-md
                                                flex items-center justify-center transition-all hover:scale-105 transition-transform`}
                                >
                                    <span className="text-2xl font-bold">
                                        {(state === "waiting") ? <StartGameIcon /> : ((state === "finished") ? <ResetGameIcon /> : "00:" + timer.toString().padStart(2, "0"))}
                                    </span>
                                </div>
                            </div>
                            <div className="text-center mt-2 font-semibold">{`Round ${gameState.round} / ${gameState.maxRounds}`}</div>
                        </div>
                        <div className="color-display flex flex-col items-center">
                            <h2 className="text-2xl font-semibold text-center pb-3">Your Color</h2>
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
                            return (
                                <CardComponent key={c.name} c={c} state={state} timer={timer} handleColorSelect={handleColorSelect}/>
                            );
                        })}
                    </main>

                    <footer className="controls-section">
                        <AudioPlayer src={soundFilePath} volume={CLOCK_VOLUME} ref={audioPlayerRef} />
                    </footer>
                </div>)}
            </div>
            <Chat players={gameState?.players} />
        </div>
    );


}

export default App;
