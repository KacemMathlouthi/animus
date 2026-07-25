import { Composition } from "remotion";
import "@/styles.css";
import { LaunchVideo } from "@/launch-video";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "@/lib/timing";

export function RemotionRoot(): React.JSX.Element {
	return (
		<Composition
			component={LaunchVideo}
			defaultProps={{ soundtrack: true }}
			durationInFrames={TOTAL_FRAMES}
			fps={FPS}
			height={HEIGHT}
			id="LaunchVideo"
			width={WIDTH}
		/>
	);
}
