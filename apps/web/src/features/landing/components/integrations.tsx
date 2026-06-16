import {
	AudioLinesIcon,
	BoxIcon,
	DatabaseIcon,
	SearchIcon,
	ShapesIcon,
	SparklesIcon,
} from "lucide-react";
import type React from "react";
import { DecorIcon } from "@/components/decor-icon";
import { cn } from "@/lib/utils";

type Integration = {
	name: string;
	description: string;
	icon: React.ReactNode;
	decor?: React.ReactNode;
};

const data: Integration[] = [
	{
		name: "Manim",
		description:
			"The animation engine behind every precise, programmatic scene.",
		icon: <ShapesIcon />,
	},
	{
		name: "ElevenLabs",
		description: "Lifelike narration voices, timed to the motion on screen.",
		icon: <AudioLinesIcon />,
		decor: <DecorIcon position="bottom-left" />,
	},
	{
		name: "Exa",
		description: "Grounded web research so explanations cite what's real.",
		icon: <SearchIcon />,
	},
	{
		name: "Daytona",
		description: "Isolated sandboxes where each render builds reproducibly.",
		icon: <BoxIcon />,
	},
	{
		name: "Postgres",
		description: "Durable history of every project, scene, and revision.",
		icon: <DatabaseIcon />,
	},
	{
		name: "Claude",
		description: "Reasoning and code generation that drives the whole studio.",
		icon: <SparklesIcon />,
		decor: <DecorIcon position="top-left" />,
	},
];

export function Integrations() {
	return (
		<section className="mx-auto w-full max-w-5xl px-4 py-20 md:px-8 md:py-28">
			<div className="mx-auto mb-14 max-w-2xl space-y-3 text-center">
				<h2 className="font-medium text-3xl tracking-tight md:text-5xl">
					Built on tools you already trust
				</h2>
				<p className="text-muted-foreground leading-relaxed md:text-lg">
					animus orchestrates best-in-class engines instead of reinventing them.
				</p>
			</div>

			<div className="relative mx-auto max-w-5xl border">
				<div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
					{data.map((item) => (
						<IntegrationCard integration={item} key={item.name}>
							{item.decor}
						</IntegrationCard>
					))}
				</div>
				<DecorIcon position="top-left" />
				<DecorIcon position="top-right" />
				<DecorIcon position="bottom-left" />
				<DecorIcon position="bottom-right" />
			</div>
		</section>
	);
}

function IntegrationCard({
	integration,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	integration: Integration;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col items-start gap-4 bg-background p-5 text-start md:p-6 md:even:bg-background/75",
				className,
			)}
			{...props}
		>
			<div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40 text-foreground [&_svg]:size-5 [&_svg]:stroke-[1.5]">
				{integration.icon}
			</div>
			<div className="space-y-1">
				<h3 className="font-medium">{integration.name}</h3>
				<p className="text-muted-foreground text-sm">
					{integration.description}
				</p>
			</div>
			{children}
		</div>
	);
}
