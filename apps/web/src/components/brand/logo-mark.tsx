import { useId } from "react";
import { cn } from "@/lib/utils";

type LogoMarkProps = React.ComponentProps<"svg"> & {
  /** "loading" floats/scans/blinks as a working indicator. */
  animate?: "none" | "loading";
};

export function LogoMark({
  animate = "none",
  className,
  ...props
}: LogoMarkProps) {
  // Unique gradient ids so multiple marks can coexist on one page.
  const id = useId();
  const bodyId = `${id}-body`;
  const eyeId = `${id}-eye`;

  return (
    <svg
      className={cn(
        "logo overflow-visible",
        animate === "loading" && "logo--loading",
        className
      )}
      fill="none"
      role="img"
      viewBox="25 19 70 93"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>animus</title>
      <defs>
        <linearGradient id={bodyId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e7b277" />
          <stop offset="1" stopColor="#7a4717" />
        </linearGradient>
        <linearGradient id={eyeId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0b0a0a" />
          <stop offset="1" stopColor="#5f5a55" />
        </linearGradient>
      </defs>

      {/* logo-root floats as one body; nested eye groups scan + blink */}
      <g className="logo-root">
        <path
          className="logo-body"
          d="M28 64 C28 38 42 22 60 22 C78 22 92 38 92 64 L92 104 C92 111 80 111 76 104 Q68 114 60 104 Q52 114 44 104 C40 111 28 111 28 104 Z"
          fill={`url(#${bodyId})`}
        />
        <g className="logo-eyes-x">
          <g className="logo-eyes-y">
            <g
              fill={`url(#${eyeId})`}
              transform="translate(5.2 -11.2) scale(0.6)"
            >
              <path d="m74.6 97.4h0.2c3.2 0 5.6 2.6 5.6 5.8l0.1 17.9c-0.1 3.1-2.4 5.9-5.9 6-2.9-0.1-5.7-2.1-5.7-6.2v-17.9c0-3.1 2.5-5.6 5.7-5.6z" />
              <path d="m105.4 97.4h0.1c3 0 5.7 2.5 5.7 5.8v17.8c0 3-2.5 6.1-6 6.1-2.8-0.1-5.7-2.3-5.8-6.1v-18c0.2-3.1 2.6-5.6 6-5.6z" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
