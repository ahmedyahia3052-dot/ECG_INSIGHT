import { useCallback, useState } from "react";

import { playbackRateForPaperSpeed } from "./ecgMonitorGridMath";
import {
  COMPARISON_PRESETS,
  MONITOR_CUSTOM_DEFAULT,
  type MonitorComparisonPreset,
  type MonitorLayoutMode,
  type RhythmStripWindow,
} from "./monitorLayout";
import { useEcgWaveformPlayback, type EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";
import type { EcgLeadId, EcgPaperSpeed } from "./types";

const FRAME_STEP_MS = 40;

export type MonitorFilter = "100Hz" | "150Hz" | "40Hz" | "Diagnostic" | "Monitor";

const FILTER_CYCLE: MonitorFilter[] = ["Monitor", "Diagnostic", "40Hz", "100Hz", "150Hz"];

export type EcgLiveMonitorEngine = EcgWaveformPlaybackState & {
  comparisonPreset: MonitorComparisonPreset;
  customLeads: EcgLeadId[];
  cycleFilter: () => void;
  filter: MonitorFilter;
  focusLead: (lead: EcgLeadId) => void;
  frameStepBackward: () => void;
  frameStepForward: () => void;
  horizontalScroll: number;
  isolatedLead: EcgLeadId | null;
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
  rhythmStripWindowSec: RhythmStripWindow;
  setComparisonPreset: (preset: MonitorComparisonPreset) => void;
  setCustomLeads: (leads: EcgLeadId[]) => void;
  setHorizontalScroll: (value: number) => void;
  setIsolatedLead: (lead: EcgLeadId | null) => void;
  setLayoutMode: (mode: MonitorLayoutMode) => void;
  setPaperSpeed: (speed: EcgPaperSpeed) => void;
  setReviewMode: (value: boolean) => void;
  setRhythmStripLead: (lead: string) => void;
  setRhythmStripMode: (value: boolean) => void;
  setRhythmStripWindowSec: (seconds: RhythmStripWindow) => void;
  toggleRecord: () => void;
  toggleReviewMode: () => void;
};

export function useEcgLiveMonitorEngine(durationMs: number, beatIntervalMs = 850): EcgLiveMonitorEngine {
  const playback = useEcgWaveformPlayback(durationMs, beatIntervalMs);
  const [recording, setRecording] = useState(false);
  const [rhythmStripMode, setRhythmStripMode] = useState(false);
  const [rhythmStripLead, setRhythmStripLead] = useState("II");
  const [rhythmStripWindowSec, setRhythmStripWindowSec] = useState<RhythmStripWindow>(10);
  const [reviewMode, setReviewMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<MonitorLayoutMode>("single");
  const [paperSpeed, setPaperSpeedState] = useState<EcgPaperSpeed>(25);
  const [filter, setFilter] = useState<MonitorFilter>("Monitor");
  const [horizontalScroll, setHorizontalScroll] = useState(0);
  const [isolatedLead, setIsolatedLead] = useState<EcgLeadId | null>(null);
  const [customLeads, setCustomLeads] = useState<EcgLeadId[]>(MONITOR_CUSTOM_DEFAULT);
  const [comparisonPreset, setComparisonPresetState] = useState<MonitorComparisonPreset>(null);

  const setPaperSpeed = useCallback(
    (speed: EcgPaperSpeed) => {
      setPaperSpeedState(speed);
      playback.setSpeed(playbackRateForPaperSpeed(speed));
    },
    [playback],
  );

  const setComparisonPreset = useCallback((preset: MonitorComparisonPreset) => {
    setComparisonPresetState(preset);
    if (!preset) return;
    const leads = preset === "custom" ? customLeads : COMPARISON_PRESETS[preset];
    setCustomLeads(leads);
    setLayoutMode("custom");
    setRhythmStripMode(false);
    setIsolatedLead(null);
  }, [customLeads]);

  const focusLead = useCallback((lead: EcgLeadId) => {
    setIsolatedLead(lead);
    setLayoutMode("single");
    setRhythmStripMode(false);
    setComparisonPresetState(null);
  }, []);

  const cycleFilter = useCallback(() => {
    setFilter((current) => {
      const index = FILTER_CYCLE.indexOf(current);
      return FILTER_CYCLE[(index + 1) % FILTER_CYCLE.length]!;
    });
  }, []);

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
    comparisonPreset,
    customLeads,
    cycleFilter,
    filter,
    focusLead,
    frameStepBackward,
    frameStepForward,
    horizontalScroll,
    isolatedLead,
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
    rhythmStripWindowSec,
    setComparisonPreset,
    setCustomLeads,
    setHorizontalScroll,
    setIsolatedLead,
    setLayoutMode,
    setPaperSpeed,
    setReviewMode,
    setRhythmStripLead,
    setRhythmStripMode,
    setRhythmStripWindowSec,
    toggleRecord,
    toggleReviewMode,
  };
}
