import { cn } from "@/lib/utils";

function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<svg
			aria-hidden="true"
			className={cn("size-6", className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>anima</title>
			<circle
				cx="12"
				cy="12"
				r="9.25"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="M4 14.5c2.2 0 2.6-5 4.4-5s2.2 5 4.4 5 2.6-5 4.4-5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.5"
			/>
			<circle cx="17.2" cy="9.5" fill="currentColor" r="1.35" />
		</svg>
	);
}

export function Wordmark({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 font-medium text-[1.0625rem] text-foreground tracking-tight",
				className,
			)}
			{...props}
		>
			<LogoMark className="size-[1.15em] text-foreground" />
			anima
		</span>
	);
}
