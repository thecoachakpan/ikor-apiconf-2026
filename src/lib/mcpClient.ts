export interface McpToolCall {
  isMcpAction: boolean;
  toolName?: string;
  arguments?: Record<string, any>;
  explanation?: string;
}

export async function parseMonnifyIntent(text: string, groqApiKey: string, userEmail?: string, userName?: string): Promise<McpToolCall> {
  const resolvedEmail = userEmail || "user@ikor.app";
  const resolvedName = userName || "Ikor User";
  const systemPrompt = `You are the Monnify MCP Intent Parser for the Ikor application.
Your job is to analyze the user's spoken command and determine if they want to execute a Monnify financial action.

IMPORTANT: The user is speaking into a DEDICATED financial voice command hotkey. If they pressed this hotkey, they almost certainly intend a financial action. Be liberal in matching — if the spoken text mentions money, payments, accounts, transfers, balances, subscriptions, top-ups, billing, refunds, verification, banks, BVN, NIN, or any business/financial concept, treat it as an MCP action.

The Monnify MCP server supports the following tool categories and actions:

── COLLECTIONS ──
1. "initiate_transaction" - To accept a payment, top-up, subscribe, or charge a customer.
   Required arguments:
   - "amount" (number)
   - "customerEmail" (string, default to "${resolvedEmail}" if not specified)
   - "customerName" (string, default to "${resolvedName}" if not specified)
   - "paymentDescription" (string)
2. "get_transaction_status" - To check the status of a payment transaction.
   Required arguments:
   - "transactionReference" (string)
3. "create_reserved_account" - To create a dedicated virtual bank account for a customer.
   Required arguments:
   - "customerEmail" (string)
   - "customerName" (string)
   - "accountName" (string, the name on the virtual account)
4. "initiate_refund" - To refund a previously completed transaction.
   Required arguments:
   - "transactionReference" (string)
   - "refundAmount" (number)
   - "refundReason" (string)

── INVOICING & MERCHANT BILLING ──
5. "create_invoice" - To create and issue a payment invoice with an amount and expiration date for a customer or business.
   Required arguments:
   - "amount" (number)
   - "customerName" (string)
   - "description" (string)
   Optional arguments:
   - "customerEmail" (string, default to "${resolvedEmail}" if not specified)
   - "expiryDays" (number, default to 7 if not specified, e.g. 5 for 5 days)

── DIRECT DEBIT ──
5. "create_direct_debit_mandate" - To set up a recurring debit mandate on a customer's bank account.
   Required arguments:
   - "customerEmail" (string)
   - "customerName" (string)
   - "amount" (number)
   - "mandateDescription" (string)
6. "debit_customer" - To execute a debit on an existing mandate.
   Required arguments:
   - "mandateReference" (string)
   - "amount" (number)
   - "narration" (string)

── VERIFICATION ──
7. "verify_bank_account" - To verify/validate a bank account (name enquiry).
   Required arguments:
   - "accountNumber" (string)
   - "bankCode" (string)
8. "verify_bvn" - To verify a Bank Verification Number (BVN).
   Required arguments:
   - "bvn" (string)
9. "verify_nin" - To verify a National Identification Number (NIN).
   Required arguments:
   - "nin" (string)

── UTILITIES & REPORTING ──
10. "get_banks" - To list all supported banks and their codes.
    No arguments required.
11. "get_all_transactions" - To query, audit, or summarize sales revenue, payments collected, or store transaction history (e.g., "What is my total sales revenue collected today via bank transfer?").
    Optional arguments:
    - "paymentStatus" (string, e.g. "PAID" for completed sales)
    - "paymentMethod" (string, e.g. "ACCOUNT_TRANSFER", "CARD", "USSD")
    - "timeframe" (string, e.g. "today", "yesterday", "this_week")

Analyze the user's input: "${text}"

If the input is clearly NOT a financial action (e.g. standard dictation like writing an email, saying hello, taking notes, chatting), return:
{ "isMcpAction": false }

If it IS a financial/business action, return:
{
  "isMcpAction": true,
  "toolName": "<one of the tool names listed above>",
  "arguments": { ... },
  "explanation": "A short, friendly 1-sentence summary of what this action will do"
}

You must return ONLY the raw JSON object. Do not include markdown code block formatting, explanations, or trailing text.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as McpToolCall;
    }
  } catch (err) {
    console.error("parseMonnifyIntent failed:", err);
  }

  return { isMcpAction: false };
}

export function formatMonnifyExpiryDate(days: number = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + (days || 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
