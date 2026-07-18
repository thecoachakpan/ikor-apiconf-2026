# Ikor (Sayikor) — Context-Aware Voice & MCP Overlay

Ikor is an intelligent, windowless speech-to-text overlay that lets you type anywhere on your screen using your voice, apply app-aware AI formatting (ScribePro), and execute financial operations via spoken commands (Voice to MCP) integrated with the **Monnify Sandbox API**.

Built with **Tauri v2**, **React 19**, **TypeScript**, and **Tailwind 4**.

---

## 🚀 Quick Start (For Hackathon Judges)

If you do not want to install Rust and compile the source code locally, you can run the pre-compiled application.

1.  **Download the Installer:**
    *   Go to the [Releases](https://github.com/thecoachakpan/sayikor/releases) page of this repository.
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
    git clone https://github.com/thecoachakpan/sayikor.git
    cd sayikor
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

### 💳 Mode 3: Voice to MCP (Financial Commands via Monnify)
Translates spoken intent into structured financial operations using the Monnify Sandbox.
1.  Open **Settings ➔ MCP Server** tab in the Ikor dashboard.
2.  Add your Monnify Sandbox keys (`API Key`, `Secret Key`, and `Contract Code`) and toggle **Sandbox Mode** to `true`, then click **Save**.
3.  Focus your cursor on a text area, **hold `Ctrl + Alt`**, and speak a financial command:
    *   *“Create an invoice of 5,000 Naira to John Doe for consulting services.”*
    *   *“Verify the bank account 1234567890 at GTBank.”*
    *   *“Initiate a sandbox refund of 1,200 Naira for transaction reference 987654.”*
4.  **Release the keys.**
5.  Instead of typing, the **Approval Panel / Mcp Confirmation Modal** will pop up on your screen.
6.  The app shows you the structured payload of the API call. Click **Approve** to execute the action via the Monnify MCP server, or **Cancel** to abort.

---

## 🧠 Gemini API Service Tiers Strategy

To maximize cost-efficiency and performance, Ikor divides LLM requests into three tiers:
1.  **Standard Tier (Real-Time Interactions):** Low-latency requests for speech-to-text formatting. Runs on `gemini-2.5-flash-lite`.
2.  **Flex Tier (Background / Agentic Tasks):** Latency-tolerant tasks like background context processing. Runs at 50% lower cost by specifying `service_tier: "flex"`.
3.  **Batch Tier (Bulk Processing):** Asynchronous bulk execution within 24 hours (e.g. daily telemetry audits).

---

## 🔒 License & Intellectual Property

This project is proprietary and confidential. Copyright (c) 2026 Victor Akpan (Ikor). All rights reserved.

A limited, temporary license is granted to the judges and evaluators of the **APIConf Lagos 2026 Developer Challenge** to download, compile, and run this code solely for evaluation purposes. No permission is granted to copy, distribute, modify, or create derivative works for any other purpose. See the [LICENSE](LICENSE) file for details.
