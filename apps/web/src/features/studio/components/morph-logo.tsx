import { motion } from "motion/react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/** The animated logo, morphing position + size between studio phases (empty →
 * loading → render panel) via a shared `layoutId`. Only one instance is mounted
 * at a time, so motion tweens between them. */
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
