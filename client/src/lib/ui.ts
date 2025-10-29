export function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
    return letters || name.slice(0, 2).toUpperCase();
}

export function formatTime(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
};

export function randomAvatarColor(id: string): string {
    const colors = [
        "bg-red-200 text-red-700 border-red-700",
        "bg-orange-200 text-orange-700 border-orange-700",
        "bg-amber-200 text-amber-700 border-amber-700",
        "bg-yellow-200 text-yellow-700 border-yellow-700",
        "bg-lime-200 text-lime-700 border-lime-700",
        "bg-green-200 text-green-700 border-green-700",
        "bg-emerald-200 text-emerald-700 border-emerald-700",
        "bg-teal-200 text-teal-700 border-teal-700",
        "bg-cyan-200 text-cyan-700 border-cyan-700",
        "bg-sky-200 text-sky-700 border-sky-700",
        "bg-blue-200 text-blue-700 border-blue-700",
        "bg-indigo-200 text-indigo-700 border-indigo-700",
        "bg-violet-200 text-violet-700 border-violet-700",
        "bg-purple-200 text-purple-700 border-purple-700",
        "bg-fuchsia-200 text-fuchsia-700 border-fuchsia-700",
        "bg-pink-200 text-pink-700 border-pink-700",
        "bg-rose-200 text-rose-700 border-rose-700",
    ]

    function hashCode(str: string): number {
        let hash = 0;
        for (let i = 0, len = str.length; i < len; i++) {
            const chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    const hash = hashCode(id);
    const index = ((hash % colors.length) + colors.length) % colors.length;
    const color = colors[index];

    return color
}