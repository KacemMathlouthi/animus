import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const SEEK_STEP_SEC = 5;
const VOLUME_STEP = 0.1;
const CONTROLS_HIDE_MS = 2500;

// The media controller for VideoPlayer: bridges the uncontrolled <video> element
// into React state and exposes the imperative play/seek/volume/fullscreen
// handlers. Kept out of the component so the component stays presentational.
export function useVideoPlayer({
  src,
  playToken,
}: {
  src: string | undefined;
  playToken: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // A new source (or none) is back at its resting state — show the poster again.
  // Render-phase reset (not an effect) so it lands before paint, matching the
  // pin-reset pattern in StudioWorkspace.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setHasStarted(false);
  }
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Whether there's been recent activity; combined with isPlaying it decides
  // whether the overlay shows (always shown while paused).
  const [active, setActive] = useState(true);

  // Reflect the media element's own state back into React.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const onPlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
    };
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration);
    const onVolume = () => setMuted(video.muted);
    const onRate = () => setRate(video.playbackRate);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("ratechange", onRate);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("ratechange", onRate);
    };
  }, []);

  // Autoplay when opened from a chat card (playToken bumps per click); skip the
  // initial mount so the panel doesn't autoplay on load.
  useEffect(() => {
    if (playToken > 0) {
      videoRef.current?.play().catch(() => {
        // Autoplay can be blocked; the controls remain available.
      });
    }
  }, [playToken]);

  // Fullscreen can change outside our button (Esc, F11) — keep the icon honest.
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Mark activity and schedule the overlay to hide after a quiet moment.
  const registerActivity = useCallback(() => {
    setActive(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(
      () => setActive(false),
      CONTROLS_HIDE_MS
    );
  }, []);

  // Start the hide countdown when playback begins; keep the overlay pinned on
  // while paused.
  useEffect(() => {
    if (isPlaying) {
      registerActivity();
    } else {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      setActive(true);
    }
  }, [isPlaying, registerActivity]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    },
    []
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play().catch(() => {
        // Ignore — a blocked play leaves the controls in place.
      });
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
    }
  }, []);

  const changeRate = useCallback((next: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = next;
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const max = Number.isFinite(video.duration)
      ? video.duration
      : video.currentTime + delta;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), max);
  }, []);

  const seekTo = useCallback((value: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = value;
      setCurrentTime(value);
    }
  }, []);

  const changeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = Math.min(1, Math.max(0, video.volume + delta));
    if (video.volume > 0) {
      video.muted = false;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Ignore — exiting fullscreen is best-effort.
      });
    } else {
      containerRef.current?.requestFullscreen().catch(() => {
        // Ignore — fullscreen may be blocked by the browser.
      });
    }
  }, []);

  // Click the frame (video or letterbox) to toggle playback; clicks on the
  // controls have their own targets and fall through.
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (
        event.target === videoRef.current ||
        event.target === containerRef.current
      ) {
        togglePlay();
      }
    },
    [togglePlay]
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // Let a focused control handle space/enter itself.
      const onContainer = event.target === event.currentTarget;
      switch (event.key) {
        case " ":
        case "k":
          if (!onContainer) {
            return;
          }
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          seekBy(-SEEK_STEP_SEC);
          break;
        case "ArrowRight":
          event.preventDefault();
          seekBy(SEEK_STEP_SEC);
          break;
        case "ArrowUp":
          event.preventDefault();
          changeVolume(VOLUME_STEP);
          break;
        case "ArrowDown":
          event.preventDefault();
          changeVolume(-VOLUME_STEP);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        default:
          return;
      }
      registerActivity();
    },
    [
      togglePlay,
      seekBy,
      changeVolume,
      toggleMute,
      toggleFullscreen,
      registerActivity,
    ]
  );

  const handlePointerLeave = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      setActive(false);
    }
  }, []);

  return {
    containerRef,
    videoRef,
    isPlaying,
    hasStarted,
    currentTime,
    duration,
    muted,
    rate,
    isFullscreen,
    seekable: duration > 0 && Number.isFinite(duration),
    controlsShown: !isPlaying || active,
    registerActivity,
    togglePlay,
    toggleMute,
    changeRate,
    seekTo,
    toggleFullscreen,
    handleClick,
    handleKeyDown,
    handlePointerLeave,
  };
}
