import { useEffect, useState } from "react";

/** Whole seconds remaining until `deadline` (ms epoch), re-rendering about once
 * per second and clamped at 0. Pass a deadline of 0 (or any past time) to sit
 * idle at 0 with no timer running — handy when the countdown is conditional. */
export function useCountdown(deadline: number): number {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, deadline - Date.now())
  );

  useEffect(() => {
    setRemainingMs(Math.max(0, deadline - Date.now()));
    if (deadline <= Date.now()) {
      return;
    }
    const id = window.setInterval(() => {
      const left = deadline - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  return Math.ceil(remainingMs / 1000);
}
