import {
	GraduationCapIcon,
	type LucideIcon,
	MicIcon,
	PresentationIcon,
	SparklesIcon,
	UsersIcon,
	VideoIcon,
} from "lucide-react";
import { DecorIcon } from "@/components/decor-icon";
import { cn } from "@/lib/utils";

type UseCase = {
	name: string;
	description: string;
	icon: LucideIcon;
	decor?: React.ReactNode;
};

const data: UseCase[] = [
	{
		name: "Students",
		description: "Turn a confusing lecture into a video that finally clicks.",
		icon: GraduationCapIcon,
	},
	{
		name: "Teachers",
		description: "Build lessons your class remembers, in minutes not weekends.",
		icon: PresentationIcon,
		decor: <DecorIcon position="bottom-left" />,
	},
	{
		name: "The endlessly curious",
		description:
			"Ask what you never got answered, get an explainer that sticks.",
		icon: SparklesIcon,
	},
	{
		name: "Researchers",
		description: "Explain your paper to any audience without dumbing it down.",
		icon: MicIcon,
	},
	{
		name: "Creators",
		description:
			"Ship polished explainers without touching animation software.",
		icon: VideoIcon,
	},
	{
		name: "Teams",
		description: "Make complex ideas land in onboarding, docs, and decks.",
		icon: UsersIcon,
		decor: <DecorIcon position="top-left" />,
	},
];

export function UseCases() {
	return (
		<section className="mx-auto w-full max-w-5xl px-4 py-20 md:px-8 md:py-28">
			<div className="mx-auto mb-14 space-y-3 text-center">
				<h2 className="mx-auto max-w-xl text-balance font-medium text-xl tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
					Made for anyone who'd rather understand
				</h2>
				<p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed md:text-lg">
					If you can ask the question, animus can turn the answer into something
					you'll actually remember.
				</p>
			</div>

			<div className="relative mx-auto max-w-5xl border">
				<div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
					{data.map((item) => (
						<UseCaseCard key={item.name} useCase={item}>
							{item.decor}
						</UseCaseCard>
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

function UseCaseCard({
	useCase,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	useCase: UseCase;
}) {
	const Icon = useCase.icon;

	return (
		<div
			className={cn(
				"relative flex flex-col items-start gap-4 bg-background p-5 text-start md:p-6 md:even:bg-background/75",
				className,
			)}
			{...props}
		>
			<div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40 text-foreground [&_svg]:size-5 [&_svg]:stroke-[1.5]">
				<Icon />
			</div>
			<div className="space-y-1">
				<h3 className="font-medium">{useCase.name}</h3>
				<p className="text-muted-foreground text-sm">{useCase.description}</p>
			</div>
			{children}
		</div>
	);
}
