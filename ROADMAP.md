# Sayikor Product & Innovation Roadmap

This document tracks the novel ideas, competitive advantages, and future vision for Sayikor.

## 1. Crash-Proof Local Recording (The "Insurance" Policy)
**Concept:** Instead of saving a giant video/audio file at the end of a session, Sayikor "chunks" the media every 5-30 seconds and writes it directly to the Hard Drive (IndexedDB).
**Competitive Advantage:** Unlike Zoom or Google Meet, if the browser crashes or the laptop dies, Sayikor can recover 99% of the meeting data instantly upon reboot.

## 2. The "Free-Tier" Hook: Local Screen Recording
**Concept:** Offer high-quality screen and system audio recording for free, saving directly to the user's device.
**Competitive Advantage:** Zoom and Google Meet hide recording behind a $15+/month paywall. Sayikor provides this as a core feature, positioning itself as the "Free Pro Recorder" for students and freelancers.

## 3. Parallel Scribe Architecture
**Concept:** Running a zero-latency "Visual Transcript" (Web Speech API) alongside a "Shadow Scribe" (Gemini Multimodal). 
**Competitive Advantage:** The UI feels fast and responsive, but the final output is "polished" by Gemini's superior hearing, correcting spelling errors and punctuation in the background.

## 4. Environmental Awareness (Contextual Notes)
**Concept:** Instructing the AI to identify and label non-speech events like `[Background music playing]`, `[Long silence]`, or `[Crosstalk]`.
**Competitive Advantage:** Makes the final transcript feel like a professional screenplay rather than a wall of text.

## 5. Privacy-First Local Storage
**Concept:** Using IndexedDB for audio/video data so it never leaves the user's machine unless they explicitly choose to sync to the cloud.
**Competitive Advantage:** Appeals to security-conscious businesses and users who are wary of "AI eavesdropping" or cloud data breaches.

## 6. Sequential "Storytelling" UI
**Concept:** Chaining typewriter animations so the Summary, Action Items, and Outline flow in sequence.
**Competitive Advantage:** Prevents information overload and makes the AI output feel "alive" and curated.

## 7. Sayikor Ultimate: The Unified Intelligence Hub
**Concept:** Merging the "Killer Features" of top AI assistants into a single, bot-free platform.
- **AI-Enhanced Scratchpad (Granola):** A side-panel for active note-taking where brief human bullets are expanded into detailed notes by Gemini.
- **One-Click Highlighting (Fathom):** Floating buttons to mark `[Action Item]`, `[Decision]`, or `[Insight]` during live recording.
- **Conversation Intelligence (Fireflies):** Analytics dashboard showing talk-time, sentiment trends, and topic clusters.
- **Executive Minutes (Jamie):** High-fidelity, professional templates for formal documentation without needing a bot in the call.
- **Sayikor Flow:** A dedicated voice-to-document workspace with persona-based polishing (e.g., "Professional Email" or "Technical Spec" for engineers through Github repositories).
- **Global Memory (Otter):** AI Chat that can query across the entire history of meetings using RAG (Retrieval-Augmented Generation).

## 8. Sayikor Event Bridge: The Universal Language Hub
**Concept:** A live-streaming infrastructure for international conferences and media. This addition turns every event participant from a passive listener into an active participant in global trade and diplomacy.
- **Stage-to-Phone Broadcast (for Remote Simultaneous Interpretation (RSI) and Assistive Listening):** Event organizers stream audio from the main stage mixer to Sayikor. Attendees join on their phones to see real-time transcripts translated into their native language (French, Swahili, Arabic, etc.) Participants scan QR code or enter event code to join the event, event organizers can as well only allow participants who registered for the event to join the broadcast (this can be done via email verification). the event host can see the number of participants, the number of languages translated, the number of active sessions, and so on. With analytics for post-event insights.
- **BYOD Interpretation:** Attendees use their own headphones to listen to a live AI-generated voice-over (TTS) of the translation, replacing expensive rental hardware.
- **Media "Convo" Kits:** Reporters can interview anyone in any language. Sayikor saves the original audio, the translation, and a generated TTS version of the translation to the user's dashboard (when needed, not automatically to save our Google Cloud Text-to-speech API costs). Reporters can now send their news report in any language to news outlets across different countries without needing external interpretation services. 
- **Interactive Breakouts:** Non-English speakers can speak into their phone in their native language, and Sayikor plays the translated audio through a mic for the audience.
**Competitive Advantage:** Disrupts the $5B+ professional interpretation market by removing the need for specialized hardware and human interpreters for mid-tier events.
**Other features:** Specialized interpreters for mid-tier events can as well translate via Sayikor app for a token fee, or they can use the app as a tool to enhance their interpretation services. (This can be more like a team plan).

---

## Future Horizons
- **Sayikor Chrome Extension:** A "One-Click" recorder that lives inside the browser for instant access during any meeting.
- **Cross-Device Sync:** Transitioning to a Cloud-Hybrid model where text/audio can be accessed from any device while maintaining local speed.
- **Video Frame Analysis:** Sending key frames of a screen recording to Gemini for "Visual Summaries" (e.g., "The speaker pointed to the red bar in the chart...").
- **Sayikor MCP Server:** Building a connection point using the Model Context Protocol (MCP) so that other AI agents (Claude, ChatGPT) can "read" your Sayikor meeting history to answer questions in real-time.
- **Dual-Channel Storage (Local vs. Cloud):** Giving users the choice to save large video/audio files directly to a computer folder (via File System Access API) or sync them automatically to Google Drive/OneDrive. This caters to both "Privacy-First" users and "Collaborative" teams.
- **Instant YouTube Archive:** Allowing users to "Publish to YouTube" directly from Sayikor. This is perfect for creators and teams who want to instantly turn a meeting or lesson into a private/unlisted video for easy sharing.
- **The "Sayikor Room" (AI-Native Video Meetings):** Building a meeting platform from scratch (via LiveKit) where the AI is the "Host." This allows for perfect, high-fidelity transcription and collaborative AI tools built into the video stream itself.
- **Crash-Proof Video Infrastructure:** Using a self-hosted SFU (Selective Forwarding Unit) to provide free/low-cost professional recording that bypasses the expensive "pay-to-record" models of Zoom and Google Meet.
- **App Ecosystem Integrations:** Using MCP or official APIs to instantly "push" meeting action items to Slack, Notion, or Google Drive with one click.
- **Sayikor Flow Mode:** A "Voice Keyboard" experience where Sayikor lives in the background and polishes spoken text into any app.
- **Sayikor Insights API:** Allowing developers to pull meeting analytics (sentiment, keywords) into their own internal dashboards.
- **Cross-Platform Bot-Free Bridge:** Using headless browser technology to join meetings without a visible bot, maintaining a "human-only" feel while capturing high-fidelity audio.
