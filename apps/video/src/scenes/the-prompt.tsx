import {
	AbsoluteFill,
	Img,
	interpolate,
	staticFile,
	useCurrentFrame,
} from "remotion";
import { EdgeLines, Stage } from "@/components/chrome";
import { PromptShell } from "@/components/prompt-shell";
import { Typewriter } from "@/components/type";
import { easeFluid, easeSnappy, ramp, window_ } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 02b. One question goes in.
 *
 * The question is the film's spine: it is the same Fourier transform that
 * 3Blue1Brown made famous, so by the time the render appears the audience
 * already knows what a good answer to it looks like. */

const QUESTION = "But what is a Fourier transform?";

const MASK =
	"linear-gradient(to top, transparent 0%, black 14%, black 40%, transparent 88%)";

const TYPE_START = sec(0.9);
const SEND_AT = sec(4.3);

export function ThePrompt(): React.JSX.Element {
	const frame = useCurrentFrame();

	const shell = ramp(frame, 0, sec(0.8), easeFluid);
	// The send button lights up the moment there is something to send.
	const sendActive = frame > TYPE_START + sec(0.2);
	const press = window_(frame, SEND_AT, SEND_AT + sec(0.34), sec(0.12));

	// On send the whole shell recoils, then accelerates away from camera: the
	// handoff into the studio.
	const launch = ramp(frame, SEND_AT + sec(0.18), sec(1.4), easeFluid);
	const shellScale =
		interpolate(shell, [0, 1], [0.94, 1]) *
		interpolate(launch, [0, 0.25, 1], [1, 1.03, 0.82], { easing: easeSnappy });

	// A ring of light leaves the send button as the turn starts.
	const pulse = ramp(frame, SEND_AT, sec(1.1), easeFluid);

	return (
		<Stage>
			<AbsoluteFill style={{ opacity: 1 - launch * 0.5 }}>
				<Img
					className="absolute bottom-0 left-0 w-full"
					src={staticFile("hero/hero-dark.webp")}
					style={{ maskImage: MASK, WebkitMaskImage: MASK }}
				/>
				<AbsoluteFill className="bg-background/15" />
			</AbsoluteFill>

			<EdgeLines opacity={1 - launch} />

			<AbsoluteFill className="items-center justify-center px-40">
				<div className="relative w-full max-w-[1250px]">
					{/* Expanding halo from the send corner. */}
					<div
						aria-hidden
						className="absolute rounded-full"
						style={{
							// Concentric with the send button: shell padding (16) + well
							// padding (20) + half the 56px button.
							right: 64,
							bottom: 64,
							width: 120,
							height: 120,
							transform: `translate(50%, 50%) scale(${1 + pulse * 9})`,
							border: "2px solid var(--primary)",
							opacity: (1 - pulse) * 0.5,
						}}
					/>

					<PromptShell
						sendActive={sendActive}
						sendPressed={press}
						style={{
							opacity: shell * (1 - launch * 0.9),
							filter: `blur(${(1 - shell) * 10 + launch * 10}px)`,
							transform: `scale(${shellScale}) translateY(${(1 - shell) * 30}px)`,
						}}
					>
						<Typewriter
							caretAfterDone={false}
							cps={19}
							start={TYPE_START}
							text={QUESTION}
						/>
					</PromptShell>
				</div>
			</AbsoluteFill>
		</Stage>
	);
}
