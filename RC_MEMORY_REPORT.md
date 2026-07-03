# RC Memory Report

Generated: 2026-07-03T21:52:58.324Z

Runtime listener registry is exposed as `window.__ECG_RUNTIME_LISTENERS__`.
Stress suite (`QA_RC_STRESS=1`) compares listener counts before/after 100 chats, 25 uploads, 50 voice toggles, 20 regenerations, and 20 exports without reload.

Gate memory check in standard RC suite: attachStrictRuntimeDiagnostics + voiceEngine.dispose on unmount.
