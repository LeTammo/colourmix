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