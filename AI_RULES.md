# Sayikor / Ikor AI Rules & Behaviors

This document defines the core operational logic and prompt behaviors for the Sayikor / Ikor AI Speech-to-Text & Scribe Engine.

## 📜 Core Rules

### 1. Global Speech-to-Text Injection
- **Trigger**: Release of hotkey (e.g., `Ctrl + Alt` or ScribePro hotkey).
- **Action**: Converts recorded audio to text using ASR (`Deepgram Nova-3` or `Groq Whisper`), then passes text through Groq LLM (`openai/gpt-oss-120b`).
- **Output**: The resulting text is typed directly into the active text area using simulated keyboard input.

### 2. Smart Dictation & Self-Correction
- **Behavior**: If the user makes a verbal mistake or changes their mind mid-sentence (e.g., *"let's meet by 8am, or no let's meet by 10am instead"*), the AI resolves the user's intent.
- **Rule**: Output ONLY the final intended sentence (*"Let's meet by 10am instead"*). Remove speech hesitations, false starts, and filler words (*umm*, *uh*).

### 3. Context-Aware Screen Integration
- **Behavior**: The AI reads active window container context (UIAutomation) to adapt tone, format, and mentions (`@Name`).
- **Rule**: In communication, note-taking, and collaboration apps (Slack, WhatsApp, Teams, Discord, Gmail, Notion, LinkedIn), convert spoken triggers like *"at John"* or *"tag Sarah"* to `@John` or `@Sarah`.

### 4. Silence & Noise Handling
- **Behavior**: If recorded audio contains only silence, background noise, or breathing, the AI remains silent without inserting hallucinations or error messages.

### 5. Multi-Mode Pipeline Architecture
- **Ultrafast Mode**: Deepgram Nova-3 (Streaming WebSocket) + Groq (`openai/gpt-oss-120b`).
- **Fast Mode**: Groq Whisper Large V3 Turbo (Batch ASR) + Groq (`openai/gpt-oss-120b`).
- **Queued Mode**: Local Native Whisper Engine (`whisper.cpp`) + Groq (`openai/gpt-oss-120b`) when online.
