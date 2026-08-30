import { useId } from "react";
import { cn } from "@/lib/utils";

/** The agent's chat avatar: a square tile in the logo's warm body gradient with
 * only the eyes on it — no ghost silhouette. It fills its box edge to edge, so
 * the container supplies the corner radius and the clipping. Geometry and
 * colours are lifted from `LogoMark`: the eyes keep the mark's 1:2.6 capsule
 * proportion and the gap between them stays about 1.5 eye-widths. */
export function AgentMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  // Unique gradient ids so several marks can coexist on one page.
  const id = useId();
  const tileId = `${id}-tile`;
  const eyeId = `${id}-eye`;

  return (
    <svg
      className={cn("block", className)}
      fill="none"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>animus</title>
      <defs>
        <linearGradient id={tileId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e7b277" />
          <stop offset="1" stopColor="#7a4717" />
        </linearGradient>
        <linearGradient id={eyeId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0a0908" />
          <stop offset="1" stopColor="#423c38" />
        </linearGradient>
      </defs>

      <rect fill={`url(#${tileId})`} height="24" width="24" x="0" y="0" />
      <g fill={`url(#${eyeId})`}>
        <rect height="9" rx="1.7" width="3.4" x="6" y="7.5" />
        <rect height="9" rx="1.7" width="3.4" x="14.6" y="7.5" />
      </g>
    </svg>
  );
}
