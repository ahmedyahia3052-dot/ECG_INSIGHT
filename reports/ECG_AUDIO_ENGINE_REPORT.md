# ECG Audio Engine Report — Sprint 50

Module: `live-monitor-audio/useLiveMonitorAudioEngine.ts`

R-wave synced beeps via Web Audio API + `detectBeatMarkerIndices`. Modes: Adult (880 Hz), Pediatric (1046 Hz), Silent, Mute. PVC uses 660 Hz. Target latency < 10 ms.
