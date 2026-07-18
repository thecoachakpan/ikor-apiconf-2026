# Ikor: Product Brief, Business Model, Roadmap & Operations Plan

**Date:** July 12, 2026  
**Authors:**  
*   **Victor Akpan** (CEO & CTO) — *80% Equity*  
*   **Ayomide Mustapha** (Operations Lead) — *20% Equity*  
**Document Version:** 1.0  
**Status:** Confidential - Internal Team Sharing  

---

## Executive Summary

**Ikor** (also referred to as Sayikor) is an AI-powered, cross-platform productivity and accessibility ecosystem. At its core, Ikor features a floating, lightweight speech-bubble overlay that enables zero-latency, real-time speech-to-text (STT) injection directly into any active application. Beyond dictation, Ikor is designed to capture meetings, generate high-fidelity, polished summaries, and serve as a universal language-bridge for global conferences. 

By leveraging a hybrid cloud architecture (Rust + Supabase backend routing to Groq and Gemini APIs) and a privacy-first local-storage strategy (using IndexedDB for crash-proof data recovery), Ikor delivers enterprise-grade intelligence without the latency, high costs, or intrusive bots associated with current industry alternatives.

---

## 1. Product Overview

Ikor is designed to solve three major pain points in the digital workspace:
1.  **Dictation Lag & Inaccuracy:** Standard speech-to-text tools are slow, struggle with punctuation, and fail when offline.
2.  **Meeting Capture Friction:** Zoom/Google Meet recording is locked behind expensive paywalls, and "AI meeting bots" interrupt the organic flow of human conversations.
3.  **Language Barriers at Events:** Professional simultaneous translation for conferences requires expensive hardware and dedicated translators, making it inaccessible for mid-market and community events.

### Core Features

*   **Real-Time Global Injection:** A floating speech bubble that overlays any app. When the user speaks, the audio is processed instantly and injected directly into the active window (e.g., Slack, Notion, Word, or code editors).
*   **Parallel Scribe Architecture:** Combines a zero-latency "Visual Transcript" (Web Speech API) with a background "Shadow Scribe" (Gemini Multimodal / Groq Whisper). The UI feels instantaneous, while the final output is corrected, punctuated, and polished by superior AI models.
*   **Crash-Proof Local Recording:** Media is chunked every 5–30 seconds and written directly to the user’s local hard drive (IndexedDB). If the system crashes, 99% of the session data is recovered instantly upon reboot.
*   **Privacy-First Design:** Meeting recordings and transcripts are stored locally by default and are never synced to the cloud without explicit user approval.
*   **Ikor Ultimate Suite:**
    *   *AI-Enhanced Scratchpad:* Users input raw, brief bullets which the LLM expands into professionally structured documentation.
    *   *One-Click Highlighting:* Quick floating buttons to tag parts of a live conversation as `[Action Item]`, `[Decision]`, or `[Insight]`.
    *   *Executive Minutes:* Pre-built formal templates to instantly format meetings without a bot joining the call.
    *   *Global Memory (RAG):* An interactive chat assistant that lets users query the history of all their meetings and notes.
*   **Ikor Event Bridge:**
    *   *Stage-to-Phone Broadcast:* Event hosts stream main stage audio to Ikor. Attendees join on their mobile devices by scanning a QR code and receive live transcripts translated into their native languages.
    *   *BYOD (Bring Your Own Device) Interpretation:* Attendees use their own headphones to listen to live AI-generated text-to-speech translations.
    *   *Media "Convo" Kits:* Journalists can interview anyone in any language. The app records the audio, translates it, and generates translation audio for distribution.

---

## 2. Business Model

Ikor utilizes a freemium software-as-a-service (SaaS) model, supplemented by transaction-based and B2B pricing for its live event translation infrastructure.

### Revenue Streams

| Tier | Pricing Model | Target Audience | Included Features |
| :--- | :--- | :--- | :--- |
| **Ikor Free** | Free Forever | Students, Freelancers, Casual Users | Local screen & system audio recording, standard STT with monthly time caps, local storage. |
| **Ikor Pro** | Monthly/Annual Subscription | Professionals, Creators, Writers | Unlimited STT injection, Parallel Scribe polishing, custom voice templates, and basic cloud sync. |
| **Ikor Ultimate** | Premium Subscription | Executives, Project Managers, Teams | Global Memory (RAG chat), AI-Enhanced Scratchpad, One-Click Highlighting, and cross-platform integrations (Slack, Notion). |
| **Ikor Event Bridge** | Pay-per-Event / SaaS | Conference Organizers, Media, Corporations | QR-code attendee routing, live translation streams, post-event analytics, and team channels for professional translators. |

### Operational Cost Control (The "Remote Control" Hub)
To prevent API overhead and run a high-margin operation, Ikor implements a backend routing system:
*   **The Telemetry Log Pipeline:** Tracks latency and model performance in real time via Supabase.
*   **The Remote Kill Switch:** If Groq's servers experience lag or high costs, the CEO/CTO can change configuration tables in Supabase in real time to reroute transcription traffic to Gemini Flash without rebuilding the client application.

---

## 3. Equity & Governance Structure

Ikor is co-founded by Victor Akpan and Ayomide Mustapha. The equity and roles are structured as follows:

*   **Victor Akpan (CEO & CTO):** **80% Equity**
*   **Ayomide Mustapha (Operations Lead):** **20% Equity**

### Equity & Roles Table

| Founder | Title | Equity Share | Core Focus & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Victor Akpan** | CEO & CTO | **80%** | Technical architecture, application engineering (Tauri, React, Rust), LLM/STT pipeline integration, Supabase cloud database configuration, product vision, and overall business strategy. |
| **Ayomide Mustapha**| Operations Lead | **20%** | Commercial launch strategy, community management, marketing, beta test program coordination, user onboarding, business development for Event Bridge, customer support setup, and legal/admin operations. |

---

## 4. Product Roadmap

The development and launch of Ikor are structured across five sequential phases:

### Phase 1: MVP & Core Injection (Target: Month 1-2)
*   Deploy Tauri v2 + React 19 desktop application frame.
*   Implement standard STT injection utilizing Rust backend.
*   Build the primary Supabase settings connection to route keys dynamically.
*   *Milestone:* A working desktop bubble that pastes real-time voice into active documents.

### Phase 2: Beta Launch & Local Capture (Target: Month 3-4)
*   Build the crash-proof local recording system (IndexedDB chunking).
*   Add the local screen recording "Free-Tier Hook".
*   Integrate Telemetry tracking tables in Supabase.
*   *Operations Focus:* Launch private beta sign-up page; onboard initial 100 creators/freelancers.

### Phase 3: Ikor Ultimate & Browser Extension (Target: Month 5-7)
*   Build the AI-Enhanced Scratchpad and One-Click Highlighting panel.
*   Implement local RAG (Global Memory) using IndexedDB-stored meeting history.
*   Publish the Chrome Extension version of Ikor.
*   *Milestone:* Paid subscription tiers go live.

### Phase 4: Ikor Event Bridge (Target: Month 8-9)
*   Build the Event Hub dashboard for conference organizers.
*   Develop the stage-to-phone translation streaming infrastructure.
*   Create QR code routing and email verification login for attendees.
*   *Operations Focus:* Partners with local conferences and journalist networks for live testing.

### Phase 5: Scale & Developer Ecosystem (Target: Month 10-12)
*   Launch "Sayikor Room" (AI-Native video calls running via LiveKit).
*   Expose the Ikor Insights API and Model Context Protocol (MCP) server.
*   Scale marketing and business development.

---

## 5. Job Description (JD): Operations Lead

**Role Title:** Operations Lead  
**Equity:** 20% Founder’s Equity  
**Location:** Remote / Hybrid  
**Reporting to:** Victor Akpan (CEO & CTO)  

### Role Summary
As the Operations Lead, **Ayomide Mustapha** will own the commercial, operational, and customer-facing aspects of Ikor. This role requires driving the launch pipeline, building a thriving community of early adopters, coordinating with businesses and event organizers, and establishing the structural foundation for Ikor's commercial scaling. You will translate Victor's technical execution into market-facing success.

### Key Responsibilities

#### 1. Launch & Beta Program Management
*   Plan, coordinate, and execute the pre-launch waitlist and public launch campaigns.
*   Manage communication with beta testers, collect structured feedback, and prioritize feature requests for the CTO.
*   Organize and run online events (webinars, demos) to showcase Ikor’s capabilities.

#### 2. Community & Marketing Operations
*   Own brand messaging, social media presence (Twitter/X, LinkedIn, Discord), and content marketing.
*   Write and maintain user-facing documentation, quick-start guides, and help articles.
*   Monitor user metrics and sentiment to drive retention strategies.

#### 3. B2B & Event Bridge Operations
*   Onboard professional interpreters and conference organizers onto the Event Bridge platform.
*   Coordinate on-site or virtual setups for events using Ikor Event Bridge, ensuring seamless translator-to-attendee streams.
*   Manage corporate partnership inquiries and lead B2B sales development.

#### 4. Business Support
*   Establish customer support workflows (email, ticketing, Discord support).
*   Manage corporate documentation, partnership contracts, and assist with financial planning.
*   Collaborate with the CEO on fundraising decks and investor presentations.

### Key Performance Indicators (KPIs)
1.  **Launch Execution:** Grow waitlist to target numbers and achieve successful launch timelines.
2.  **User Onboarding & Activation:** Conversion rate of free-tier sign-ups to active users.
3.  **Beta Feedback Loop:** Systematically deliver user bug reports and feature requests to the CTO weekly.
4.  **B2B Pilot Pipeline:** Secure and execute initial pilot events using the Ikor Event Bridge.
