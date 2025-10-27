type DiceProps = {
    size?: number | string;
    fill?: string;
    className?: string;
};

function Dice({ size = 32, fill = "#000000", className }: DiceProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
            <circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
            <circle cx="15.5" cy="8.5" r=".5" fill="currentColor" />
            <circle cx="15.5" cy="15.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="15.5" r=".5" fill="currentColor" />
            <circle cx="12" cy="12" r=".5" fill="currentColor" />
        </svg>
    );
}

export default Dice;