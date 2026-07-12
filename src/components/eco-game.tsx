import { Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassDialog,
	GlassDialogContent,
	GlassDialogHeader,
	GlassDialogTitle,
} from "#/components/ui/glass-dialog";
import { cn } from "#/lib/utils";

const VIEW_W = 900;
const VIEW_H = 320;
const GROUND_Y = 260;
const LEVEL_WIDTH = 3300;
const PLAYER_W = 28;
const PLAYER_H = 42;
const SPEED = 4.2;
const GRAVITY = 0.7;
const JUMP_FORCE = 13;

interface QuizObstacle {
	id: string;
	x: number;
	emoji: string;
	solvedEmoji: string;
	prompt: string;
	choices: string[];
	correctIndex: number;
	explanation: string;
}

const OBSTACLES: QuizObstacle[] = [
	{
		id: "bill",
		x: 550,
		emoji: "🏠",
		solvedEmoji: "☀️",
		prompt:
			"Your electricity bill just doubled. What's the best long-term fix?",
		choices: [
			"Turn lights off a little more often",
			"Install rooftop solar panels",
			"Buy a bigger refrigerator",
			"Call and complain to the power company",
		],
		correctIndex: 1,
		explanation:
			"Rooftop solar can offset most of a home's grid electricity long-term — small behavior tweaks barely move the needle compared to generating your own clean power.",
	},
	{
		id: "car",
		x: 1350,
		emoji: "🚗",
		solvedEmoji: "🔋",
		prompt:
			"Your car is a gas-guzzler and the tailpipe is the neighborhood's biggest polluter. Best fix?",
		choices: [
			"Switch to an electric vehicle",
			"Drive a little slower",
			"Get new tires",
			"Change the oil more often",
		],
		correctIndex: 0,
		explanation:
			"Transportation is the largest source of US emissions — an EV cuts tailpipe emissions to zero, especially as the grid gets cleaner.",
	},
	{
		id: "trash",
		x: 2150,
		emoji: "🗑️",
		solvedEmoji: "♻️",
		prompt:
			"The bin is overflowing with cans, bottles, and food scraps all mixed together. Best fix?",
		choices: [
			"Burn it in the backyard",
			"Sort recyclables and compost from landfill trash",
			"Bury it",
			"Just add a bigger bin",
		],
		correctIndex: 1,
		explanation:
			"Less than a third of US municipal waste gets recycled or composted — sorting is what actually keeps materials out of landfills.",
	},
	{
		id: "hillside",
		x: 2900,
		emoji: "🪓",
		solvedEmoji: "🌳",
		prompt:
			"The clear-cut hillside above town now floods every storm. Best fix?",
		choices: [
			"Pave it for parking",
			"Replant native trees",
			"Leave it bare",
			"Build a taller fence",
		],
		correctIndex: 1,
		explanation:
			"Tree roots hold soil and slow runoff — replanting native species is the standard fix for erosion and flash flooding after clear-cutting.",
	},
];

const GOAL_X = LEVEL_WIDTH - 120;

interface PlayerState {
	x: number;
	y: number;
	vx: number;
	vy: number;
	onGround: boolean;
	facing: 1 | -1;
}

/** Pure canvas render — kept outside the component so it's stable across renders for the rAF loop. */
function draw(
	ctx: CanvasRenderingContext2D,
	p: PlayerState,
	answered: Record<string, boolean>,
) {
	const camX = Math.max(0, Math.min(p.x - VIEW_W / 2, LEVEL_WIDTH - VIEW_W));

	// sky
	const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
	sky.addColorStop(0, "#0b1626");
	sky.addColorStop(1, "#12251c");
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, VIEW_W, VIEW_H);

	ctx.save();
	ctx.translate(-camX, 0);

	// ground
	ctx.fillStyle = "#1c3a24";
	ctx.fillRect(0, GROUND_Y, LEVEL_WIDTH, VIEW_H - GROUND_Y);
	ctx.fillStyle = "#3ebd49";
	ctx.fillRect(0, GROUND_Y, LEVEL_WIDTH, 4);

	// obstacles
	ctx.font = "40px serif";
	ctx.textAlign = "center";
	for (const obstacle of OBSTACLES) {
		const solved = answered[obstacle.id] !== undefined;
		ctx.fillText(
			solved ? obstacle.solvedEmoji : obstacle.emoji,
			obstacle.x + 23,
			GROUND_Y - 6,
		);
	}

	// goal flag
	ctx.fillText("🏁", GOAL_X + 20, GROUND_Y - 6);

	// player
	ctx.save();
	ctx.translate(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2);
	ctx.scale(p.facing, 1);
	ctx.font = "38px serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("🧑", 0, 4);
	ctx.restore();

	ctx.restore();
}

export default function EcoGame() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const keysRef = useRef<Set<string>>(new Set());
	const pausedRef = useRef(true);
	const playerRef = useRef<PlayerState>({
		x: 40,
		y: GROUND_Y - PLAYER_H,
		vx: 0,
		vy: 0,
		onGround: true,
		facing: 1,
	});

	const [started, setStarted] = useState(false);
	const [finished, setFinished] = useState(false);
	const [answered, setAnswered] = useState<Record<string, boolean>>({});
	const [activeObstacle, setActiveObstacle] = useState<QuizObstacle | null>(
		null,
	);
	const [selected, setSelected] = useState<number | null>(null);

	const answeredRef = useRef(answered);
	answeredRef.current = answered;

	useEffect(() => {
		pausedRef.current = !started || finished || activeObstacle !== null;
	}, [started, finished, activeObstacle]);

	function resetGame() {
		playerRef.current = {
			x: 40,
			y: GROUND_Y - PLAYER_H,
			vx: 0,
			vy: 0,
			onGround: true,
			facing: 1,
		};
		setAnswered({});
		setActiveObstacle(null);
		setSelected(null);
		setFinished(false);
	}

	// keyboard input
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			keysRef.current.add(e.key.toLowerCase());
			if (
				["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(
					e.key.toLowerCase(),
				)
			) {
				e.preventDefault();
			}
		}
		function onKeyUp(e: KeyboardEvent) {
			keysRef.current.delete(e.key.toLowerCase());
		}
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	// game loop
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		function tick() {
			if (!ctx) return;
			const keys = keysRef.current;
			const p = playerRef.current;

			if (!pausedRef.current) {
				const left = keys.has("arrowleft") || keys.has("a");
				const right = keys.has("arrowright") || keys.has("d");
				const jump = keys.has("arrowup") || keys.has("w") || keys.has(" ");

				p.vx = left ? -SPEED : right ? SPEED : 0;
				if (left) p.facing = -1;
				if (right) p.facing = 1;
				if (jump && p.onGround) {
					p.vy = -JUMP_FORCE;
					p.onGround = false;
				}

				p.vy += GRAVITY;
				p.x = Math.max(0, Math.min(LEVEL_WIDTH - PLAYER_W, p.x + p.vx));
				p.y += p.vy;
				if (p.y + PLAYER_H >= GROUND_Y) {
					p.y = GROUND_Y - PLAYER_H;
					p.vy = 0;
					p.onGround = true;
				}

				// obstacle collisions — first unanswered one the player touches
				for (const obstacle of OBSTACLES) {
					if (answeredRef.current[obstacle.id]) continue;
					const obW = 46;
					const obX = obstacle.x;
					const overlap =
						p.x < obX + obW && p.x + PLAYER_W > obX && p.y + PLAYER_H > 210;
					if (overlap) {
						p.x = Math.max(0, obX - PLAYER_W - 2);
						setActiveObstacle(obstacle);
						setSelected(null);
						break;
					}
				}

				if (p.x + PLAYER_W >= GOAL_X) {
					setFinished(true);
				}
			}

			draw(ctx, p, answeredRef.current);
			rafRef.current = requestAnimationFrame(tick);
		}

		rafRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	function submitAnswer(index: number) {
		if (!activeObstacle || selected !== null) return;
		setSelected(index);
	}

	function continueAfterAnswer() {
		if (!activeObstacle || selected === null) return;
		const correct = selected === activeObstacle.correctIndex;
		setAnswered((prev) => ({ ...prev, [activeObstacle.id]: correct }));
		setActiveObstacle(null);
		setSelected(null);
	}

	const score = Object.values(answered).filter(Boolean).length;

	return (
		<div className="relative mx-auto w-full max-w-[900px]">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
				<p>
					Move: <b className="text-white">←/→ or A/D</b> · Jump:{" "}
					<b className="text-white">↑, W, or Space</b>
				</p>
				<p>
					Clean Energy Score:{" "}
					<b className="text-forest-400">
						{score} / {OBSTACLES.length}
					</b>
				</p>
			</div>

			<div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
				<canvas
					ref={canvasRef}
					width={VIEW_W}
					height={VIEW_H}
					className="block w-full bg-[#0b1626]"
				/>

				{!started && !finished && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
						<h2 className="text-2xl font-bold text-white">
							Clean Energy Quest
						</h2>
						<p className="max-w-sm text-center text-sm text-white/70">
							Walk into each problem you find and choose the clean-energy fix.
						</p>
						<GlassButton
							variant="primary"
							size="lg"
							onClick={() => setStarted(true)}
						>
							<Play className="h-4 w-4" /> Start
						</GlassButton>
					</div>
				)}

				{finished && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
						<h2 className="text-2xl font-bold text-white">
							You reached net-zero! 🎉
						</h2>
						<p className="text-white/70">
							Clean Energy Score: {score} / {OBSTACLES.length}
						</p>
						<GlassButton
							variant="primary"
							size="lg"
							onClick={() => {
								resetGame();
								setStarted(true);
							}}
						>
							<RotateCcw className="h-4 w-4" /> Play again
						</GlassButton>
					</div>
				)}
			</div>

			<GlassDialog
				open={!!activeObstacle}
				onOpenChange={(open) => {
					if (!open) continueAfterAnswer();
				}}
			>
				<GlassDialogContent>
					{activeObstacle && (
						<>
							<GlassDialogHeader>
								<GlassDialogTitle className="text-2xl">
									{activeObstacle.emoji}
								</GlassDialogTitle>
							</GlassDialogHeader>
							<p className="text-sm text-white/80">{activeObstacle.prompt}</p>
							<div className="mt-4 flex flex-col gap-2">
								{activeObstacle.choices.map((choice, i) => {
									const isCorrect =
										selected !== null && i === activeObstacle.correctIndex;
									const isWrongSelected =
										selected === i && i !== activeObstacle.correctIndex;
									return (
										<button
											key={choice}
											type="button"
											disabled={selected !== null}
											onClick={() => submitAnswer(i)}
											className={cn(
												"rounded-xl border border-white/15 px-4 py-2.5 text-left text-sm transition",
												selected === null && "hover:bg-white/5",
												isCorrect && "border-forest-400/60 bg-forest-500/15",
												isWrongSelected && "border-red-400/60 bg-red-500/15",
											)}
										>
											{choice}
										</button>
									);
								})}
							</div>
							{selected !== null && (
								<div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70 leading-relaxed">
									{selected === activeObstacle.correctIndex
										? "Correct! "
										: "Not quite. "}
									{activeObstacle.explanation}
								</div>
							)}
							<GlassButton
								variant="primary"
								className="mt-4 w-full"
								disabled={selected === null}
								onClick={continueAfterAnswer}
							>
								Continue
							</GlassButton>
						</>
					)}
				</GlassDialogContent>
			</GlassDialog>
		</div>
	);
}
