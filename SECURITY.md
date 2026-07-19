# Security Posture

Ikor is designed to be a secure, privacy-first productivity overlay. Because it handles voice input and financial transactions through the Monnify MCP server, the security posture is conservative, keeping user data local and financial actions transparent.

---

## 🔒 1. The Human-in-the-Loop Rule (Voice-to-MCP)

**No spoken command can execute a financial transaction automatically.**

- If the user dictates a financial command (e.g., *"Top up my speech wallet with 5,000 Naira"*), the system parses the intent but does **not** make the API call directly.
- The Tauri desktop client intercepts the action and pops up the **Approval Panel / MCP Confirmation Modal**.
- The user must visually review the structured payload (amount, description, target) and manually click **Approve** or **Cancel**.
- The Monnify MCP tools can only be invoked after explicit manual approval.

---

## 🔑 2. Sandboxed API Credentials (Normal Users vs. Merchants)

- **For Normal Users (Default Wallet Flow):** Normal users only store their personal LLM API credentials (such as `groq_api_key` or `gemini_api_key`) and their Supabase session tokens. They **do not** need to provide or store Monnify API keys. Their speech credit top-ups are processed via the central Ikor merchant backend.
- **For Businesses & Custom Merchant Integrations:** If a business user integrates their own Monnify account in the settings panel to handle custom MCP transactions (e.g., invoice creation, bank verifications, or customer debits), their private credentials (`monnify_api_key`, `monnify_secret_key`, and `monnify_contract_code`) are stored locally on their machine using Tauri's native `StoreRef` plugin.
- **Sandboxed Storage:** All locally stored keys are sandboxed on your local hard drive, are **never** synchronized to any remote server, and are only read to initiate local workflows or spin up the local MCP server during runtime.

---

## 🌐 3. Secure Edge Function Payment Verification

- Instead of executing payment initiation or status verification directly from the desktop client (which would require bundling admin secret keys), Ikor routes collections through secure **Supabase Edge Functions**:
  - `initialize-monnify-payment`
  - `verify-monnify-payment`
- The client app only transitions to a successful payment state after the edge function performs a secure server-to-server validation call directly with Monnify. A client-side redirect or fake success state can never trigger wallet top-ups.

---

## 🎙️ 4. Data Minimization & Privacy

- Audio recordings, visual transcripts, and ScribePro histories are stored locally on the user's machine (using IndexedDB).
- Raw speech files are chunked locally every 5 to 30 seconds to ensure a crash-proof experience.
- No transcription data, transcripts, or user text is sent to the cloud other than the target API endpoint (e.g. Groq Whisper or Gemini API) solely for real-time transcription.

---

## 🚨 5. Telemetry & The Remote Kill Switch

- To prevent API overhead, misuse, or cost spikes, Ikor uses a **Supabase telemetry log pipeline**.
- In the event of a model endpoint failure, high latency, or API key compromise, the super-admin can toggle remote configuration tables on Supabase.
- This acts as an instant **Remote Kill Switch** or rerouter, allowing the app to switch transcription pipelines (e.g. from Groq to Gemini Flash) in real time without requiring the client to reinstall or update the app.

---

## 🛡️ 6. Reporting a Vulnerability

Ikor is a hackathon project built for the **APIConf Lagos 2026 Developer Challenge**. If you discover a security vulnerability, please do not disclose it publicly. Contact the core team directly (Victor Akpan) or open an issue marked with the `security` label, and we will set up a secure channel to address it.
