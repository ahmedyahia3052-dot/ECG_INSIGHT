import { useCallback, useState } from "react";

import { useEcgWaveformPlayback, type EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";

const FRAME_STEP_MS = 40;

export type EcgLiveMonitorEngine = EcgWaveformPlaybackState & {
  frameStepBackward: () => void;
  frameStepForward: () => void;
  jumpToEnd: () => void;
  jumpToStart: () => void;
  pause: () => void;
  play: () => void;
  recording: boolean;
  resume: () => void;
  rhythmStripMode: boolean;
  setRhythmStripMode: (value: boolean) => void;
  toggleRecord: () => void;
};

export function useEcgLiveMonitorEngine(durationMs: number, beatIntervalMs = 850): EcgLiveMonitorEngine {
  const playback = useEcgWaveformPlayback(durationMs, beatIntervalMs);
  const [recording, setRecording] = useState(false);
  const [rhythmStripMode, setRhythmStripMode] = useState(false);

  const jumpToStart = useCallback(() => playback.jumpToMs(0), [playback]);
  const jumpToEnd = useCallback(() => playback.jumpToMs(durationMs), [durationMs, playback]);
  const frameStepForward = useCallback(() => playback.jumpToMs(playback.playheadMs + FRAME_STEP_MS), [playback]);
  const frameStepBackward = useCallback(() => playback.jumpToMs(playback.playheadMs - FRAME_STEP_MS), [playback]);
  const toggleRecord = useCallback(() => setRecording((value) => !value), []);

  const pause = useCallback(() => {
    if (playback.isPlaying) playback.togglePlay();
  }, [playback]);

  const play = useCallback(() => {
    playback.setFrozen(false);
    if (!playback.isPlaying) playback.togglePlay();
  }, [playback]);

  const resume = useCallback(() => {
    playback.setFrozen(false);
    if (!playback.isPlaying) playback.togglePlay();
  }, [playback]);

  return {
    ...playback,
    frameStepBackward,
    frameStepForward,
    jumpToEnd,
    jumpToStart,
    pause,
    play,
    recording,
    resume,
    rhythmStripMode,
    setRhythmStripMode,
    toggleRecord,
  };
}
