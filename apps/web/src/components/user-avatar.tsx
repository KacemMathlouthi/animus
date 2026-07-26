/** A user avatar that shows the profile image when present, and otherwise a
 * generated piece of art: a single initial over a grainy, two-tone oklch
 * gradient whose hue is derived from the user (stable per person). oklch keeps
 * it in the same color space as our tokens; the grain gives it some character. */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  /** Rounded-square instead of a circle (e.g. chat messages). */
  square?: boolean;
  className?: string;
};

/** A tileable grayscale film grain (SVG fractal noise), blended over the
 * gradient for texture. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Deterministic hue (0–359) from a seed, so a user always gets the same color. */
function hueFrom(seed: string): number {
  let hue = 0;
  for (let i = 0; i < seed.length; i++) {
    hue = (hue * 31 + seed.charCodeAt(i)) % 360;
  }
  return hue;
}

/** The single leading initial from a name or email. */
function initialFrom(label: string): string {
  return (label.trim()[0] ?? "?").toUpperCase();
}

export function UserAvatar({
  name,
  email,
  image,
  square,
  className,
}: UserAvatarProps) {
  const label = name?.trim() || email?.trim() || "User";
  const seed = email?.trim() || label;
  const hue = hueFrom(seed);
  const gradient = `radial-gradient(circle at 30% 22%, oklch(0.74 0.13 ${hue} / 0.85), transparent 55%), linear-gradient(140deg, oklch(0.64 0.16 ${hue}), oklch(0.5 0.17 ${(hue + 48) % 360}))`;

  return (
    <Avatar className={cn(square && "rounded-md after:rounded-md", className)}>
      {image ? (
        <AvatarImage
          alt={label}
          className={cn(square && "rounded-md")}
          src={image}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "relative overflow-hidden font-medium text-white",
          square && "rounded-md"
        )}
        style={{ backgroundImage: gradient }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: GRAIN }}
        />
        <span className="relative">{initialFrom(label)}</span>
      </AvatarFallback>
    </Avatar>
  );
}
