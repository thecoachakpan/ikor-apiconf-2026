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

## 🔑 2. Zero-Configuration API Credentials for Normal Users

- **For Normal Users:** Normal users do **not** need to provide or store any API credentials (neither Monnify keys nor LLM provider keys like Groq or Gemini). All Speech-to-Text (ASR) transcription and LLM text formatting are powered securely by the central Ikor system keys stored and managed on **Supabase**. Normal users only log in with their account, keeping their local setup zero-config and completely secure.
- **For Developers & Custom Merchant Integrations:** Users who wish to run their own custom local development builds or connect their own business's Monnify accounts can configure their personal API keys (`monnify_api_key`, `monnify_secret_key`, `monnify_contract_code`, and `groq_api_key`) in the local settings panel. These keys are stored purely on their local machines using Tauri's native sandboxed `StoreRef` plugin.
- **Sandboxed Storage:** All locally configured keys are sandboxed on your local hard drive, are **never** synchronized to any remote server, and are only read to initiate local workflows or spin up the local MCP server during runtime.

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
