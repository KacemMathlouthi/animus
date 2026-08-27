/** The profile image when present, otherwise a generated identicon seeded on
 * `email:name`. Inline SVG so it stays crisp at any size; lightness and chroma
 * come from theme tokens, leaving only the hue per user. */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GRID, identiconFrom } from "@/lib/identicon";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  className?: string;
  email?: string | null;
  image?: string | null;
  name?: string | null;
  /** Rounded-square instead of a circle (e.g. chat messages). */
  square?: boolean;
}

export function UserAvatar({
  name,
  email,
  image,
  square,
  className,
}: UserAvatarProps) {
  const label = name?.trim() || email?.trim() || "User";
  const { cells, hue } = identiconFrom(
    `${email?.trim() ?? ""}:${name?.trim() ?? ""}`
  );
  const block = `oklch(var(--identicon-l) var(--identicon-c) ${hue})`;

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
        className={cn("overflow-hidden p-0", square && "rounded-md")}
      >
        <svg
          className="size-full"
          data-testid="identicon"
          role="img"
          shapeRendering="crispEdges"
          viewBox={`0 0 ${GRID} ${GRID}`}
        >
          <title>{label}</title>
          {cells.flatMap((row, y) =>
            row.map((filled, x) =>
              filled ? (
                <rect
                  fill={block}
                  height="1"
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid, never reordered
                  key={`${y}-${x}`}
                  width="1"
                  x={x}
                  y={y}
                />
              ) : null
            )
          )}
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
