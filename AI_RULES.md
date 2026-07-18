# Sayikor AI Rules & Behaviors

This document defines the core operational logic for the Sayikor AI Speech Bubble. Rules are added and tested incrementally.

## 📜 Core Rules

### 1. Global Speech-to-Text Injection
- **Trigger**: Upon completion of the "Transcribing" state (after releasing `Ctrl + Alt`).
- **Action**: The AI shall convert the processed audio into text using Gemini 2.5 Flash.
- **Output**: The resulting text must be injected/typed directly into the currently active text input area (where the typing cursor is focused) using simulated keyboard input.
- **Context**: The AI should maintain the user's intent, correcting grammar only if it enhances clarity without changing the meaning.

### 2. Silence Handling
- **Behavior**: If the recorded audio contains only silence, background noise (fans, typing), or no human voice/whisper is detected, the AI must remain silent.
- **Constraint**: Do not inject any text, return errors to the user UI, or provide commentary/hallucinations (e.g., "Silence." or "I didn't hear anything.").

## 💰 STT Cost & Token Optimization Strategy

To minimize Gemini API costs while maintaining high-quality real-time transcription, the following strategies MUST be utilized:

1. **Voice Activity Detection (VAD)**: Trim all leading and trailing silence *before* sending audio to the API. Since Gemini tokenizes audio at 32 tokens per second, trimming just 5 seconds of silence saves 160 tokens per request.
2. **Micro-Prompts**: Use a minimal 2-word system prompt (e.g., `"Transcribe exactly:"`) instead of lengthy text instructions to keep input token counts low.
3. **Model Selection**: Default to `gemini-2.5-flash-lite` for standard STT tasks. It costs $0.30 per 1M audio tokens (a 70% reduction compared to standard Flash).
4. **Client-Side Chunking**: For long dictation sessions, process audio in 5-to-10-second chunks as the user pauses. This reduces maximum token context size and prevents long reasoning paths or output hallucinations.

## 🧠 Advanced Feature Architecture (Planned)

### 3. Highlight & Improve (Tone Editing)
- **Trigger**: Hotkey (e.g., `Ctrl + Shift + A`) while text is highlighted.
- **Action**: Tauri copies text to clipboard, user selects or speaks a tone, Gemini (`2.5-flash`) rewrites the text.
- **Prompt Rule**: Must output ONLY the rewritten text without conversational filler.
- **Output**: Tauri simulates `Ctrl + V` to overwrite the highlighted text.

### 4. Smart Dictation (Self-Correction)
- **Behavior**: If the user corrects themselves mid-sentence during dictation, the AI must seamlessly apply the correction.
- **Prompt Rule**: "Transcribe fluidly. If the user makes a verbal mistake or corrects themselves, output ONLY the final intended sentence. Remove filler words (umm, uh)."
- **Model**: `gemini-2.5-flash` (requires reasoning to detect correction intent).

### 5. Context-Aware Tone Mapping (App Recognition)
- **Behavior**: The AI adapts its tone based on the active application.
- **Action**: Tauri reads the Active Window Title (e.g., "Gmail", "WhatsApp").
- **Prompt Rule**: Inject context dynamically: `"User is typing in [App Name]. Tone preference: [User Settings Tone]."`

### 6. The Context Router
- **Behavior**: Manages different rule books based on the text input area or context.
- **Action**: Tauri reads active window info and assigns a specific "Rule Book" (e.g., Casual, Developer, Formal).
- **Output**: The specific Rule Book prompt is stitched into the STT request.

### 7. Self-Learning Dictionary (RAG & Local Vocabulary)
- **Behavior**: Learns from manual user edits to correctly spell local African names or slang in future transcriptions.
- **Action**: User corrections are captured and saved to a local "Personal Dictionary" database.
- **Prompt Injection**: Automatically appends the custom dictionary to the prompt: `"CRITICAL: Spell these exactly as shown: [Chukwuebuka, Danfo, Wahala]."`.
- **Global Sync**: (Future) Aggregates popular custom words to a cloud database to improve global transcription accuracy.

## 🛠️ Testing Status
- [x] Rule 1: Speech-to-Text Injection (Implemented)
- [x] Rule 2: Silence Handling (Implemented)
- [ ] Rule 3: Highlight & Improve (Planned)
- [ ] Rule 4: Smart Dictation / Self-Correction (Planned)
- [ ] Rule 5: Context-Aware Tone Mapping (Planned)
- [ ] Rule 6: Context Router (Planned)
- [ ] Rule 7: Self-Learning Dictionary (Planned)
