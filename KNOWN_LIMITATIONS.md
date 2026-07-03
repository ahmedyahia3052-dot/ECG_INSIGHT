# Known Limitations — Sprint 11.0

## OCR

- PDF and scanned images use best-effort printable-byte extraction, not Tesseract or cloud vision
- Low-confidence OCR triggers UI warnings; clinician review required
- DICOM and ZIP uploads are not yet fully parsed (architecture prepared via document classifier types)

## ECG Digitization

- Real-world clinical photos may fall back when grid/leads cannot be detected
- Synthetic test grids digitize reliably; photo quality varies widely
- Multi-page PDF ECG uses first decodable image path

## Voice

- Browser Web Speech API is primary STT (requires network on most browsers)
- Server Whisper transcription requires Ollama with a Whisper model (`OLLAMA_WHISPER_MODEL`)
- Arabic STT supported via `ClinicalVoiceEngine.setLanguage("ar-SA")` but not yet exposed in Copilot UI toggle

## Clinical AI

- LLM tools remain disabled when Ollama is active (knowledge injected upstream)
- Mock LLM used in CI; production requires Ollama or OpenAI configuration
- AI_MODEL_API_KEY unset → rule-based / mock fallback for some paths

## Mobile

- Copilot file upload remains web-only (`Platform.OS !== "web"`)

## Case Storage

- Copilot attachments persist analysis in `CopilotAttachment` records
- Automatic Patient → Visit → ECG Study linkage on copilot upload requires explicit `patientId` / `caseId` context
