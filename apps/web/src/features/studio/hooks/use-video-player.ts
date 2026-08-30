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

// Bridges the uncontrolled <video> element into React state, so VideoPlayer
// itself stays presentational.
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
  // Reset in render, not an effect, so it lands before paint.
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
  // With isPlaying, decides the overlay; always shown while paused.
  const [active, setActive] = useState(true);

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

  // playToken bumps per chat-card click. Skip mount so the panel does not
  // autoplay on load.
  useEffect(() => {
    if (playToken > 0) {
      videoRef.current?.play().catch(() => {
        // Autoplay can be blocked; the controls stay available.
      });
    }
  }, [playToken]);

  // Esc and F11 change fullscreen outside our button.
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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

  // Countdown starts with playback; the overlay stays pinned while paused.
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
        // A blocked play leaves the controls in place.
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
        // Best-effort.
      });
    } else {
      containerRef.current?.requestFullscreen().catch(() => {
        // The browser may block fullscreen.
      });
    }
  }, []);

  // Clicking the frame toggles playback; the controls have their own targets.
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
