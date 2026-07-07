import { useCallback, useState } from "react";

import { playbackRateForPaperSpeed } from "./ecgMonitorGridMath";
import type { MonitorLayoutMode } from "./monitorLayout";
import { useEcgWaveformPlayback, type EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";
import type { EcgPaperSpeed } from "./types";

const FRAME_STEP_MS = 40;

export type EcgLiveMonitorEngine = EcgWaveformPlaybackState & {
  frameStepBackward: () => void;
  frameStepForward: () => void;
  jumpToEnd: () => void;
  jumpToStart: () => void;
  layoutMode: MonitorLayoutMode;
  paperSpeed: EcgPaperSpeed;
  pause: () => void;
  play: () => void;
  recording: boolean;
  resume: () => void;
  reviewMode: boolean;
  rhythmStripLead: string;
  rhythmStripMode: boolean;
  setLayoutMode: (mode: MonitorLayoutMode) => void;
  setPaperSpeed: (speed: EcgPaperSpeed) => void;
  setReviewMode: (value: boolean) => void;
  setRhythmStripLead: (lead: string) => void;
  setRhythmStripMode: (value: boolean) => void;
  toggleRecord: () => void;
  toggleReviewMode: () => void;
};

export function useEcgLiveMonitorEngine(durationMs: number, beatIntervalMs = 850): EcgLiveMonitorEngine {
  const playback = useEcgWaveformPlayback(durationMs, beatIntervalMs);
  const [recording, setRecording] = useState(false);
  const [rhythmStripMode, setRhythmStripMode] = useState(false);
  const [rhythmStripLead, setRhythmStripLead] = useState("II");
  const [reviewMode, setReviewMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<MonitorLayoutMode>("single");
  const [paperSpeed, setPaperSpeedState] = useState<EcgPaperSpeed>(25);

  const setPaperSpeed = useCallback(
    (speed: EcgPaperSpeed) => {
      setPaperSpeedState(speed);
      playback.setSpeed(playbackRateForPaperSpeed(speed));
    },
    [playback],
  );

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
    setReviewMode(false);
    if (!playback.isPlaying) playback.togglePlay();
  }, [playback]);

  const resume = useCallback(() => {
    playback.setFrozen(false);
    setReviewMode(false);
    if (!playback.isPlaying) playback.togglePlay();
  }, [playback]);

  const toggleReviewMode = useCallback(() => {
    setReviewMode((value) => {
      const next = !value;
      if (next) {
        playback.setFrozen(true);
        if (playback.isPlaying) playback.togglePlay();
      }
      return next;
    });
  }, [playback]);

  return {
    ...playback,
    frameStepBackward,
    frameStepForward,
    jumpToEnd,
    jumpToStart,
    layoutMode,
    pause,
    paperSpeed,
    play,
    recording,
    resume,
    reviewMode,
    rhythmStripLead,
    rhythmStripMode,
    setLayoutMode,
    setPaperSpeed,
    setReviewMode,
    setRhythmStripLead,
    setRhythmStripMode,
    toggleRecord,
    toggleReviewMode,
  };
}
