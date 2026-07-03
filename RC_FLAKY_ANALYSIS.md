# RC Flaky Analysis

Generated: 2026-07-03T21:52:58.319Z

Intermittent failures are treated as incorrect state transitions. Instrumentation uses runtime events:
StreamingStarted, StreamingFinished, VoiceIdle, UploadFinished, ViewerReady.

## Latest gate outcome

Gate failed on run(s): 1. Review Playwright HTML report and test-results/playwright-junit.xml.

## Root-cause categories addressed in this RC

- race condition: conversation FSM + StreamingFinished event
- async timing: event-based Playwright waits (no UI assertion retries)
- voice initialization: VoiceIdle event + disable voice on New Chat
- stale element: copilot-conversation-ready marker
- network retry: streamCopilotMessage network-only retry; mutation retry removed
- React rendering: explicit post-stream finalizeStream/onSettled
