import logoUrl from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

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
			<img
				alt="animus logo"
				className="h-[1.5em] w-auto shrink-0"
				src={logoUrl}
			/>
			animus
		</span>
	);
}
