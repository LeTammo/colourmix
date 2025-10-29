import type { Card, CMYKColor } from "../../../shared/models/color";
import Checkmark from "./Checkmark";

export type CardState = {
    name: Card;
    arr: CMYKColor;
    color: string;
    inTarget: boolean;
    inSelection: boolean;
    status: "default" | "selected" | "selected-correct" | "selected-wrong" | "inactive" | "inactive-selected";
};

type CardComponentProps = {
    cardState: CardState;
    state: string;
    timer: number;
    handleColorSelect: (args: [Card, CMYKColor]) => void;
};

const CardComponent: React.FC<CardComponentProps> = ({ cardState, state, timer, handleColorSelect }) => {

    const style: React.CSSProperties = {
        borderColor: `color-mix(in srgb, ${cardState.color} 100%, black 50%)`,
        backgroundColor: cardState.color,
    };

    if (cardState.status === "selected") {
        style.outline = '3px solid #0ea5e9';
        style.outlineOffset = '2px';
    } else if (cardState.status === "inactive-selected") {
        style.opacity = 0.2;
        style.pointerEvents = 'none';
        style.outline = '3px solid #94a3b8';
        style.outlineOffset = '2px';
    } else if (cardState.status === "inactive") {
        style.opacity = 0.2;
        style.pointerEvents = 'none';
    } else if (cardState.status === "selected-correct") {
        style.outline = '3px solid #000';
        style.outlineOffset = '2px';
    } else if (cardState.status === "selected-wrong") {
        style.outline = '3px dashed gray';
        style.outlineOffset = '2px';
    }

    return (<div
        key={cardState.name}
        onClick={() => {
            if (state === "playing" && timer > 0) handleColorSelect([cardState.name, cardState.arr]);
        }}
        className={`color-card w-30 h-40 rounded-xl flex items-end justify-end
                    cursor-pointer border hover:scale-105 transition-transform relative`}
        style={style}
        data-color={cardState.name}
    >
        {cardState.status === "selected-correct" && (
            <div className="absolute flex justify-center items-center drop-shadow-md top-0 left-0 right-0 bottom-0 m-auto">
                <Checkmark />
            </div>
        )}

        <div className="card-text p-2 font-bold text-white text-shadow-test">{cardState.name}</div>
    </div>
    )
};

export default CardComponent;