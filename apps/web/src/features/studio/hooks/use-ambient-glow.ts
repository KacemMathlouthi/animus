import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/** The heavy blur erases everything but rough color regions. */
export const AMBIENT_WIDTH = 64;
export const AMBIENT_HEIGHT = 36;

/** Mirrors the video to a tiny canvas each frame; the caller blurs it behind
 * the letterbox. Presigned R2 sources taint the canvas, but tainting only
 * blocks readback, and the try/catch covers engines that throw instead. */
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
      // HAVE_CURRENT_DATA: there is a frame to copy.
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, AMBIENT_WIDTH, AMBIENT_HEIGHT);
        } catch {
          // Cross-origin quirk; playback is unaffected.
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [videoRef]);

  return canvasRef;
}
