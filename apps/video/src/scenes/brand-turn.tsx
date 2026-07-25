import {
	AbsoluteFill,
	Img,
	interpolate,
	staticFile,
	useCurrentFrame,
} from "remotion";
import { EdgeLines, Stage } from "@/components/chrome";
import { LogoMark } from "@/components/logo-mark";
import { Headline, PixelWord } from "@/components/type";
import { easeFluid, easeSnappy, enter, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 02a. The turn: the film gets warm.
 *
 * The landing hero's own artwork blooms up from the bottom under the same
 * top-fading mask the site uses, the mark arrives and starts thinking, and the
 * pair then travels up and shrinks to make room for the real hero headline.
 * One continuous move, no cut, because this is the moment the answer stops
 * being a wall of text and starts being a product. */

const MASK =
	"linear-gradient(to top, transparent 0%, black 14%, black 40%, transparent 88%)";

export function BrandTurn(): React.JSX.Element {
	const frame = useCurrentFrame();

	const art = ramp(frame, sec(0.15), sec(1.8), easeFluid);
	const mark = ramp(frame, sec(0.35), sec(0.9));
	const wordmark = ramp(frame, sec(0.95), sec(0.7));
	// The lockup lifts and shrinks to become a header, freeing the centre.
	const travel = ramp(frame, sec(2.3), sec(1.1), easeFluid);
	const headline = ramp(frame, sec(2.9), sec(0.9));
	const tagline = ramp(frame, sec(3.7), sec(0.8));

	const lockupScale = interpolate(travel, [0, 1], [1, 0.42]);
	const lockupY = interpolate(travel, [0, 1], [0, -348]);

	return (
		<Stage>
			{/* The hero artwork, masked exactly as on the landing page. */}
			<AbsoluteFill style={{ opacity: art }}>
				<Img
					className="absolute bottom-0 left-0 w-full"
					src={staticFile("hero/hero-dark.webp")}
					style={{
						maskImage: MASK,
						WebkitMaskImage: MASK,
						transform: `scale(${interpolate(art, [0, 1], [1.12, 1])})`,
						transformOrigin: "bottom center",
					}}
				/>
				<AbsoluteFill className="bg-background/15" />
				<AbsoluteFill
					className="-inset-x-20 rounded-full blur-[50px]"
					style={{
						background:
							"radial-gradient(ellipse at center, rgba(250,250,250,0.05), transparent, transparent)",
					}}
				/>
			</AbsoluteFill>

			<EdgeLines opacity={art} />

			{/* The mark + wordmark lockup. It arrives centred at full size, then
          travels up and shrinks into a header as the headline takes over. */}
			<AbsoluteFill className="items-center justify-center">
				<div
					className="flex items-center gap-6"
					style={{
						transform: `translateY(${lockupY}px) scale(${lockupScale})`,
					}}
				>
					{/* The wrapper carries the entrance so the mark's own float, squash
              and blink keep running underneath it untouched. */}
					<div
						style={{
							opacity: mark,
							filter: `blur(${(1 - mark) * 16}px)`,
							transform: `scale(${interpolate(mark, [0, 1], [0.6, 1], {
								easing: easeSnappy,
							})})`,
						}}
					>
						<LogoMark animate="loading" className="h-[190px] w-auto" />
					</div>

					<span
						className="font-medium text-[96px] text-foreground tracking-[-0.02em]"
						style={{
							opacity: wordmark,
							filter: `blur(${(1 - wordmark) * 14}px)`,
							// Slides out from behind the mark.
							transform: `translateX(${(1 - wordmark) * -60}px)`,
						}}
					>
						animus
					</span>
				</div>
			</AbsoluteFill>

			{/* The real hero headline, verbatim from the landing page. */}
			<AbsoluteFill className="items-center justify-center">
				<div className="mt-24 flex flex-col items-center gap-7 text-center">
					<Headline
						className="max-w-[1500px] text-[104px] leading-[1.03]"
						style={enter(headline, { rise: 40, blur: 12 })}
					>
						<span className="block">
							Turn any <PixelWord italic>question</PixelWord>
						</span>
						<span className="block text-[0.9em]">
							into an explainer{" "}
							<PixelWord className="font-bold">video</PixelWord>
						</span>
					</Headline>

					<p
						className="text-[30px] text-muted-foreground"
						style={enter(tagline, { rise: 20, blur: 6 })}
					>
						Narrated, animated explainers that make anything click.
					</p>
				</div>
			</AbsoluteFill>
		</Stage>
	);
}
