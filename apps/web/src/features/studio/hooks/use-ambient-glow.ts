import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/** Tiny backing store for the glow canvas — the heavy blur it renders under
 * erases any detail beyond rough color regions, so 64×36 is plenty. */
export const AMBIENT_WIDTH = 64;
export const AMBIENT_HEIGHT = 36;

/** YouTube-style ambient glow. Mirrors the video onto a tiny canvas every
 * animation frame; the caller renders that canvas blurred, scaled, and dimmed
 * behind the video so the letterbox picks up the scene's colors and follows
 * them live. Presigned R2 sources are cross-origin and taint the canvas, but
 * tainting only blocks pixel readback — drawing and displaying stay allowed
 * (the try/catch guards the odd engine that throws instead).
 */
export function useAmbientGlow(
  videoRef: RefObject<HTMLVideoElement | null>
): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!(video && canvas)) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let frame = 0;
    const draw = () => {
      // HAVE_CURRENT_DATA — there is a frame to copy.
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, AMBIENT_WIDTH, AMBIENT_HEIGHT);
        } catch {
          // Cross-origin restriction quirk; playback itself is unaffected.
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [videoRef]);

  return canvasRef;
}
