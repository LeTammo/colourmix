import React, { useEffect, useState } from 'react';
import type { GameStateOutgoing } from '../../../shared/models/gamestate';
import type { Card } from '../../../shared/models/color';
import { calculateHex, colors } from '../../../shared/lib/color';
import { Link, useNavigate } from 'react-router';
import { initials, randomAvatarColor } from '../lib/ui';

const API_URL = import.meta.env.VITE_API_URL;

const GamesList: React.FC = () => {
    const [games, setGames] = useState<GameStateOutgoing[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // track expanded/collapsed state per gameId (collapsed by default)
    const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGames = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');

                const res = await fetch(`${API_URL}/player/games`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));

                    if (res.status === 401) {
                        // Unauthorized - token might be invalid
                        localStorage.removeItem('token');
                        navigate('/login');
                        return;
                    }

                    throw new Error(data.message || `HTTP ${res.status}`);
                }

                const data = await res.json();
                // Expecting an array of GameStateOutgoing or objects matching it
                setGames(data as GameStateOutgoing[]);
            } catch (err: unknown) {
                setError('Failed to load games.');
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, [navigate]);

    if (loading) {
        return <div className="bg-gray-100 h-screen w-full flex items-center justify-center">Loading games…</div>;
    }

    if (error) {
        return <div className="bg-gray-100 h-screen w-full flex items-center justify-center text-red-400">Error: {error}</div>;
    }

    if (!games || games.length === 0) {
        return <div className="bg-gray-100 h-screen w-full flex items-center justify-center">No games available.</div>;
    }

    return (
        <div className="flex font-nunito h-screen w-full bg-gray-100 justify-center items-start">
            <div className="p-4 grid gap-4 w-full max-w-3xl mt-8">
                {games.sort((a, b) => b.createdAt - a.createdAt).map((g, idx) => {
                    const id = String(g.gameId ?? idx);
                    const expanded = !!expandedGames[id];
                    return (
                        <div key={id} className="border-2 rounded-2xl shadow-lg border-gray-300 flex flex-col p-4 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-lg font-semibold">
                                    <Link to={`/games/${id}`}>{g.gameTitle || "Untitled Game"}</Link>
                                    <div className="text-xs font-normal text-gray-500">Created at {new Date(g.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-500">Round {g.round} / {g.maxRounds}</div>

                                </div>

                            </div>



                            {expanded ? (
                                <>
                                    <div className="mb-3">
                                        <div className="text-sm text-gray-600">Round Duration: <span className="font-medium">{g.timerDuration} seconds</span></div>
                                        <div className="text-sm text-gray-600">Max Players: <span className="font-medium">{g.maxPlayers}</span></div>
                                        <div className="text-sm text-gray-600">Min Cards: <span className="font-medium">{g.minCards}</span></div>
                                        <div className="text-sm text-gray-600">Max Cards: <span className="font-medium">{g.maxCards}</span></div>
                                        <div className="text-sm text-gray-600">With Invite Code: <span className="font-medium">{g.withInviteCode ? 'Yes' : 'No'}</span></div>
                                    </div>

                                    <div className="mb-3">
                                        {/* TODO: Display (players / max_players) */}
                                        <div className="text-sm font-semibold mb-2">Players:</div>
                                        <div className="flex flex-col gap-2">
                                            {Object.entries(g.players).map(([pid, p]) => (
                                                <div key={pid} className="flex rounded-full items-center justify-between px-3 py-2 bg-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${randomAvatarColor(pid)}`}>
                                                            {initials(p.name)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.isHost ? 'Host' : 'Player'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                                                            {p.score} Points
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pb-4">
                                        <div className="text-sm font-semibold mb-2">Rounds:</div>
                                        <div className="flex flex-col gap-2">
                                            {g.rounds.map((r, i) => (
                                                <div key={i} className="p-2 rounded-lg bg-gray-100 text-sm">
                                                    <div className="flex justify-between items-center">
                                                        <div>Round {i + 1} / {g.maxRounds} — {r.state}</div>
                                                        <div className="text-xs text-gray-500">Targets Cards: {r.targetCardsNumber ?? "?"}</div>
                                                    </div>
                                                    <div className="mt-2 flex gap-1 flex-wrap">
                                                        <div className="w-10 h-10 text-xl rounded border flex items-center justify-center" style={{ background: r.targetColor || 'transparent', borderColor: `color-mix(in srgb, ${r.targetColor} 100%, black 50%)` }}>{r.targetColor ? "" : "?"}</div>
                                                        <div className="w-10 h-10 text-xl rounded flex items-center justify-center"> = </div>
                                                        {r.targetCards === null ? <div className="w-10 h-10 text-xl border rounded text-center flex items-center justify-center">?</div> : null}
                                                        {r.targetCards && r.targetCards.length > 0 && r.targetCards.sort((a, b) => [...colors.keys()].indexOf(a) - [...colors.keys()].indexOf(b)).map((c, ci) => {
                                                            // c is a Card string; calculate hex for a single card
                                                            const hex = calculateHex([c as Card]);
                                                            return <div key={ci} className="w-10 h-10 rounded border flex items-center justify-center " style={{ background: hex, borderColor: `color-mix(in srgb, ${hex} 100%, black 50%)` }} title={String(c)}>
                                                                <div className="font-bold text-white text-shadow-test">{String(c)}</div>
                                                            </div>
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setExpandedGames(prev => ({ ...prev, [id]: !prev[id] }))}
                                className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 flex-grow"
                            >
                                {expanded ? 'Hide Details' : 'Show Details'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GamesList;
