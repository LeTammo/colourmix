
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import HideIcon from './HideIcon';
import ShowIcon from './ShowIcon';
import RangeSlider from './RangeSlider';
import type { CreateGamePayload } from '../../../shared/models/gamestate';

const API_URL = import.meta.env.VITE_API_URL as string;

const CreateGame: React.FC = () => {
	const [gameTitle, setGameTitle] = useState('');
	const [maxPlayers, setMaxPlayers] = useState<number>(5);
	const [timerDuration, setTimerDuration] = useState<number>(20);
	const [minCards, setMinCards] = useState<number>(2);
	const [maxCards, setMaxCards] = useState<number>(4);
	const [maxRounds, setMaxRounds] = useState<number>(5);
	const [withInviteCode, setWithInviteCode] = useState<boolean>(false);
	const [inviteCode, setInviteCode] = useState<string>('');
	const [showInviteCode, setShowInviteCode] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const inviteRef = useRef<HTMLInputElement | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// TODO: Additional client-side validation

		if (!gameTitle.trim()) {
			setError('Please enter a title for the game.');
			return;
		}

		// Basic sanity checks
		if (minCards > maxCards) {
			setError('Min cards cannot be greater than max cards.');
			return;
		}

		// If invite code is required, validate it
		if (withInviteCode) {
			if (!inviteCode || inviteCode.trim().length < 6) {
				setError('Invite code must be at least 6 characters long.');
				return;
			}
		}

		const payload: CreateGamePayload = {
			gameTitle: gameTitle.trim(),
			maxPlayers,
			timerDuration,
			minCards,
			maxCards,
			maxRounds,
		// include inviteCode only when the checkbox is set
			...(withInviteCode ? { inviteCode } : { inviteCode: undefined }),
		};

		try {
			setLoading(true);
			const res = await fetch(`${API_URL}/game`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				const data = await res.json();
				// If API returns id for the created game, navigate to it, otherwise go to games list
				if (data && data.gameId) {
					const id = data.gameId;
					navigate(`/games/${id}`);
				} else {
					navigate('/games');
				}
			} else {
				if (res.status === 401) {
					// Unauthorized - token might be invalid
					localStorage.removeItem('token');
					navigate('/login');
					return;	
				}

				const data = await res.json().catch(() => ({}));
				setError(data.message || 'Failed to create game');
			}
		} catch (err) {
			// log the error for debugging and show a user-friendly message
			console.error(err);
			setError('Network error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="font-nunito flex items-center justify-center min-h-screen bg-gray-100">
			<form
				onSubmit={handleSubmit}
				className="bg-white p-8 border-2 rounded-2xl shadow-lg border-gray-400 w-full max-w-md flex flex-col gap-4"
			>
				<h2 className="text-2xl font-bold text-center mb-2">Create Game</h2>

				<label className="block">
					<span className="text-sm font-medium text-gray-700">Game Title</span>
					<input
						type="text"
						value={gameTitle}
						onChange={e => setGameTitle(e.target.value)}
						required
						autoFocus
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
					/>
				</label>

				<div>
					<label className="block -mb-3 text-sm font-medium text-gray-700">Players: <span className="font-semibold">{maxPlayers}</span></label>
					<RangeSlider
						min={1}
						max={10}
						step={1}
						value={maxPlayers}
						onChange={v => setMaxPlayers(Array.isArray(v) ? v[1] : v)}
						ticks={10}
					/>
				</div>

				<div>
					<label className="block -mb-3 text-sm font-medium text-gray-700">Timer (seconds): <span className="font-semibold">{timerDuration}</span></label>
					<RangeSlider
						min={10}
						max={60}
						step={5}
						value={timerDuration}
						onChange={v => setTimerDuration(Array.isArray(v) ? v[1] : v)}
						ticks={6}
					/>
				</div>

				<div className="">
					<label className="block -mb-3 text-sm font-medium text-gray-700">Cards: <span className="font-semibold">{minCards} to {maxCards}</span></label>
					<RangeSlider
						min={2}
						max={4}
						step={1}
						value={[minCards, maxCards]}
						onChange={v => {
							if (Array.isArray(v)) {
								setMinCards(v[0]);
								setMaxCards(v[1]);
							}
						}}
						ticks={[2,3,4]}
					/>
				</div>

				<div>
					<label className="block -mb-3 text-sm font-medium text-gray-700">Rounds: <span className="font-semibold">{maxRounds}</span></label>
					<RangeSlider
						min={1}
						max={10}
						step={1}
						value={maxRounds}
						onChange={v => setMaxRounds(Array.isArray(v) ? v[1] : v)}
						ticks={10}
					/>
				</div>

				<label className="flex items-center gap-2 mt-1">
					<input
						type="checkbox"
						checked={withInviteCode}
						onChange={e => setWithInviteCode(e.target.checked)}
						className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-200"
					/>
					<span className="text-sm text-gray-700">Require invite code</span>
				</label>

				{withInviteCode && (
					<label className="block relative">
						{/* TODO: Show allowed letters for invite code*/}
						<span className="text-sm font-medium text-gray-700">Invite Code</span>
						<input
							ref={inviteRef}
							type={showInviteCode ? 'text' : 'password'}
							value={inviteCode}
                            minLength={6}
							pattern={"[A-Za-z0-9\\-]+"}
                            required={withInviteCode}
                            autoComplete="off"
							onChange={e => setInviteCode(e.target.value)}
							className="mt-1 block w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
						/>
						<button
							type="button"
							// prevent the button from taking focus so the input keeps its selection/caret
							onMouseDown={e => e.preventDefault()}
							onClick={() => {
								// toggle visibility without affecting focus/selection
								setShowInviteCode(prev => !prev);
							}}
							aria-label={showInviteCode ? 'Hide invite code' : 'Show invite code'}
							className="absolute right-2 top-9 -mt-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
						>
							{showInviteCode ? <HideIcon /> : <ShowIcon />}
						</button>
						<div className="text-xs text-gray-500 mt-1">At least 6 characters</div>
					</label>
				)}

				{error && (
					<div className="text-red-500 text-sm text-center">{error}</div>
				)}

				<button
					type="submit"
					disabled={loading}
					className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-60"
				>
					{loading ? 'Creating…' : 'Create'}
				</button>
			</form>
		</div>
	);
};

export default CreateGame;
