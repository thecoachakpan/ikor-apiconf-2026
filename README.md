# Ikor (Sayikor) — Context-Aware Voice & MCP Overlay

Ikor is an intelligent, windowless speech-to-text overlay that lets you type anywhere on your screen using your voice, apply app-aware AI formatting (ScribePro), and execute financial operations via spoken commands (Voice to MCP) integrated with the **Monnify Sandbox API**.

Built with **Tauri v2**, **React 19**, **TypeScript**, and **Tailwind 4**.

---

## 🚀 Quick Start (For Hackathon Judges)

If you do not want to install Rust and compile the source code locally, you can run the pre-compiled application.

1.  **Download the Installer:**
    *   Go to the [Releases](https://github.com/thecoachakpan/ikor-apiconf-2026/releases) page of this repository.
    *   Download the latest `.exe` (Windows) or `.dmg` (macOS) installer.
2.  **Bypass SmartScreen (Windows):**
    *   Since this is an unsigned developer build, Windows Defender will show a warning ("Windows protected your PC").
    *   Click **"More info"** and then select **"Run anyway"**.
3.  **Log In with Test Credentials:**
    *   Once the app launches, you can log in immediately using the following pre-created test account:
        *   **Email:** `testikor@gmail.com`
        *   **Password:** `ikor@apiconf2026`
4.  **⚠️ Critical Prerequisite for Voice to MCP:**
    *   The application launches the Monnify MCP server locally using `npx`. 
    *   Therefore, the host machine **must have Node.js and npm/npx installed** for the **Voice to MCP** feature to work.

---

## 🛠️ Developer Setup & Local Compilation

To inspect the source code, configure custom API endpoints, and run the project in development mode:

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js (LTS version)](https://nodejs.org/)
*   [Rust & Cargo (stable)](https://www.rust-lang.org/tools/install)
*   Tauri prerequisites for your OS (e.g. C++ Build Tools on Windows). See the [Tauri Setup Guide](https://v2.tauri.app/start/prerequisites/).

### 2. Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/thecoachakpan/ikor-apiconf-2026.git
    cd ikor-apiconf-2026
    ```
2.  Install frontend and Tauri node dependencies:
    ```bash
    npm install
    ```
3.  Create your environment configuration:
    ```bash
    cp .env.example .env
    ```
    Populate the `.env` file with your **Supabase** database credentials and **Gemini API Key**.

### 3. Running Locally
Run the following command to launch the application in development mode:
```bash
npm run tauri dev
```

---

## 🎮 Interactive Demo Guide (The 3 Modes)

Once the application is running, sign in or sign up, then try the three core features:

### 🎙️ Mode 1: Normal Dictation
Provides low-latency, accurate speech-to-text directly into any text input.
1.  Open any text editor (Notepad, VS Code, a browser search bar).
2.  Focus your cursor inside the text area.
3.  **Press and hold `Ctrl + Alt`** on your keyboard. The circular waveform overlay will appear on your screen.
4.  Dictate a sentence (e.g., *"Sayikor is running on my local machine and dictating perfectly."*).
5.  **Release the keys.** The app transcribes the audio and instantly pastes the text at your cursor.

---

### ✍️ Mode 2: ScribePro (Context & App Awareness)
Uses your active window's identity to format and style transcripts intelligently.
1.  Open **VS Code** and focus on a code file, OR open **Slack** and focus on a message input.
2.  **Hold `Ctrl + Alt`** and dictate your text:
    *   **In VS Code:** Say *"write a quicksort function in rust"* ➔ Ikor automatically detects you are in an IDE and injects formatted Rust markdown code blocks.
    *   **In Slack/Notion:** Say *"mention John Doe and set up a call"* ➔ Ikor detects you are in Slack and auto-formats the mention to `@John Doe` instead of plain text.

---

### 💳 Mode 3: Voice to MCP (Financial Wallet Top-Ups via Monnify)
Translates spoken intent into structured financial operations to top-up the user's speech wallet using the Monnify Sandbox.
*Note: Voice to MCP currently works for Ikor users to top-up words in their wallets, and not for general merchant operations. You do NOT need to configure or add your own API keys in the MCP Server settings for this mode.*

1.  Focus your cursor on a text area.
2.  **Hold `Ctrl + Shift + S`** and speak a top-up or subscription command:
    *   *“Top up my wallet with 5,000 Naira.”*
    *   *“Add 2,500 Naira to my speech credit.”*
    *   *“I want to subscribe 10,000 Naira to upgrade my plan.”*
3.  **Release the keys.**
4.  Instead of typing, the **Approval Panel / MCP Confirmation Modal** will pop up on your screen.
5.  The app shows you the structured payload of the API call. Click **Approve** to execute the action via the Monnify MCP server, or **Cancel** to abort.

---

## 🧠 AI Model & Pipeline Strategy

To maximize transcription speed, accuracy, and context awareness, Ikor uses a hybrid AI pipeline:
1.  **Speech-to-Text (ASR):** Runs on **Groq Whisper Large V3 Turbo** (`whisper-large-v3-turbo`) for ultra-low latency audio transcription.
2.  **LLM Polishing & MCP Intent Parsing:** Runs on **openai/gpt-oss-120b** (via Groq Cloud) to perform context-aware styling, keyboard shortcuts expansions, and structured voice-to-MCP command mapping.
3.  **Local Fallback (Offline Mode):** Features a local Whisper engine to transcribe voice inputs when the machine loses network connectivity.

---

## 🔒 License & Intellectual Property

This project is proprietary and confidential. Copyright (c) 2026 Victor Akpan (Ikor). All rights reserved.

A limited, temporary license is granted to the judges and evaluators of the **APIConf Lagos 2026 Developer Challenge** to download, compile, and run this code solely for evaluation purposes. No permission is granted to copy, distribute, modify, or create derivative works for any other purpose. See the [LICENSE](LICENSE) file for details.
