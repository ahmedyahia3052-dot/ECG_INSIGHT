import { useCallback, useEffect, useRef, useState } from "react";

export type EcgWaveformPlaybackState = {
  frozen: boolean;
  isPlaying: boolean;
  loop: boolean;
  playheadMs: number;
  speed: number;
  jumpToMs: (ms: number) => void;
  nextBeat: () => void;
  previousBeat: () => void;
  setFrozen: (value: boolean) => void;
  setLoop: (value: boolean) => void;
  setPlayheadMs: (ms: number) => void;
  setSpeed: (value: number) => void;
  togglePlay: () => void;
};

export function useEcgWaveformPlayback(durationMs = 10_000, beatIntervalMs = 850): EcgWaveformPlaybackState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;

  useEffect(() => {
    if (!isPlaying || frozen) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setPlayheadMs((current) => {
        const next = current + delta * speed;
        if (next >= durationRef.current) return loop ? 0 : durationRef.current;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozen, isPlaying, loop, speed]);

  const togglePlay = useCallback(() => setIsPlaying((value) => !value), []);
  const jumpToMs = useCallback((ms: number) => {
    setPlayheadMs(Math.max(0, Math.min(ms, durationRef.current)));
  }, []);

  const nextBeat = useCallback(() => {
    setPlayheadMs((current) => Math.min(durationRef.current, current + beatIntervalMs));
  }, [beatIntervalMs]);

  const previousBeat = useCallback(() => {
    setPlayheadMs((current) => Math.max(0, current - beatIntervalMs));
  }, [beatIntervalMs]);

  return {
    frozen,
    isPlaying,
    jumpToMs,
    loop,
    nextBeat,
    playheadMs,
    previousBeat,
    setFrozen,
    setLoop,
    setPlayheadMs,
    setSpeed,
    speed,
    togglePlay,
  };
}
