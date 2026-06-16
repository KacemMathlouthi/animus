import { motion } from "motion/react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * The animated logo, wrapped so it morphs (position + size) between the studio
 * phases — empty state → loading → the workspace's render panel — via a shared
 * `layoutId`. Only one instance is mounted at a time, so motion tweens between
 * them as the view changes.
 */
export function MorphLogo({ className }: { className?: string }) {
	return (
		<motion.div
			className="shrink-0"
			layoutId="animus-mark"
			transition={{ type: "spring", bounce: 0.18, duration: 0.6 }}
		>
			<LogoMark animate="loading" className={cn("w-auto", className)} />
		</motion.div>
	);
}
