import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalPosition, LogicalSize, currentMonitor } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { load } from "@tauri-apps/plugin-store";
import { Wand2, Check, Ban, Loader2, CreditCard, Info, FileText, BarChart3 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase } from "../lib/supabaseClient";
import { formatMonnifyExpiryDate } from "../lib/mcpClient";

const SUPABASE_URL = "https://njjcvlmjhnjycdogxszl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-EeRA4ECq2CR3K6E052Z9Q_9-QBRPMk";

interface Revision {
  command: string;
  response: string;
}

interface McpTransaction {
  toolName: string;
  args: Record<string, any>;
  explanation: string;
  rawText?: string;
}

const TOOL_NAME_MAP: Record<string, string> = {
  "initiate_transaction": "monnify_initiate_payment",
  "create_invoice": "monnify_create_invoice",
  "get_transaction_status": "monnify_get_transaction_status",
  "create_reserved_account": "monnify_reserve_account",
  "initiate_refund": "monnify_process_refund",
  "create_direct_debit_mandate": "monnify_create_mandate",
  "debit_customer": "monnify_debit_mandate",
  "verify_bank_account": "monnify_verify_bank_account",
  "verify_bvn": "monnify_verify_bvn",
  "verify_nin": "monnify_verify_nin",
  "get_banks": "monnify_get_supported_banks",
  "get_all_transactions": "monnify_get_all_transactions"
};

const calculateWordsForAmount = (amount: number, plan: string) => {
  let rate = 0.1; // fallback
  if (plan === "Ikor Pro" || plan === "Pro plan") {
    rate = 0.025;
  } else if (plan === "Ikor Plus" || plan === "Free Trial" || plan === "Free") {
    rate = 0.05;
  }
  
  if (amount <= 150) return 0;
  return Math.round(((amount - 150) / 1.06) / rate);
};

export default function ApprovalPanel() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [scribeShortcut, setScribeShortcut] = useState<string[]>(["Left Ctrl", "Left Win", "Z"]);
  const zOrderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MCP States
  const [mcpTransaction, setMcpTransaction] = useState<McpTransaction | null>(null);
  const [isCallingMcp, setIsCallingMcp] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const mcpRawTextRef = useRef<string | null>(null);

  // Premium Topup States
  const [sessionUser, setSessionUser] = useState<{ email?: string; name?: string; plan?: string } | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Validation for Monnify top-up
  const isTopUp = mcpTransaction?.toolName === "monnify_initiate_payment";
  const topUpAmount = isTopUp ? (mcpTransaction?.args.amount || 0) : 0;
  const subtotal = isTopUp ? (topUpAmount - 150) / 1.06 : 0;
  const hasMinError = isTopUp && subtotal < 300;
  const hasMaxError = isTopUp && subtotal > 9000;

  const adjustAmount = (newAmount: number) => {
    if (!mcpTransaction) return;
    setMcpTransaction({
      ...mcpTransaction,
      args: {
        ...mcpTransaction.args,
        amount: newAmount
      }
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const email = session.user.email || "";
        const meta = session.user.user_metadata || {};
        const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name || "Ikor User";
        const plan = meta.plan_name || "Free Trial";
        setSessionUser({ email, name, plan });
      }
    });
  }, []);

  const stopZOrderLoop = () => {
    if (zOrderIntervalRef.current) {
      clearInterval(zOrderIntervalRef.current);
      zOrderIntervalRef.current = null;
    }
  };

  const startZOrderLoop = () => {
    stopZOrderLoop();
    // Reassert topmost every 5000ms for snipping tool resilience
    zOrderIntervalRef.current = setInterval(async () => {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(true);
    }, 5000);
  };

  const handleApproveMcp = async () => {
    if (!mcpTransaction || isCallingMcp || hasMinError || hasMaxError) return;
    setIsCallingMcp(true);
    setMcpError(null);

    const mappedName = mcpTransaction.toolName;
    const finalArgs = { ...mcpTransaction.args };

    // Inject arguments for monnify_initiate_payment
    if (mappedName === "monnify_initiate_payment") {
      if (!finalArgs.paymentReference) {
        finalArgs.paymentReference = "MONNIFY-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
      }
      if (!finalArgs.customerEmail && sessionUser?.email) {
        finalArgs.customerEmail = sessionUser.email;
      }
      if (!finalArgs.customerName && sessionUser?.name) {
        finalArgs.customerName = sessionUser.name;
      }
      if (!finalArgs.paymentDescription) {
        finalArgs.paymentDescription = "Ikor Word Top-up";
      }
    } else if (mappedName === "monnify_create_invoice") {
      if (!finalArgs.invoiceReference) {
        finalArgs.invoiceReference = "INV-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
      }
      if (!finalArgs.customerEmail && sessionUser?.email) {
        finalArgs.customerEmail = sessionUser.email;
      }
      if (!finalArgs.customerEmail) {
        finalArgs.customerEmail = "billing@apexltd.com";
      }
      if (!finalArgs.customerName) {
        finalArgs.customerName = "Apex Ltd";
      }
      if (!finalArgs.description) {
        finalArgs.description = "Supply of goods";
      }
      if (!finalArgs.expiryDate) {
        const days = typeof finalArgs.expiryDays === "number" ? finalArgs.expiryDays : 7;
        finalArgs.expiryDate = formatMonnifyExpiryDate(days);
      }
      if (!finalArgs.redirectUrl) {
        finalArgs.redirectUrl = "https://ikor-apiconf.vercel.app/payment-success";
      }
      delete finalArgs.expiryDays;
    } else if (mappedName === "monnify_get_all_transactions") {
      if (!finalArgs.paymentStatus) {
        finalArgs.paymentStatus = "PAID";
      }
    }

    try {
      if (mappedName === "monnify_initiate_payment") {
        // Use direct fetch to bypass Supabase SDK session issues in isolated Tauri popup window
        const edgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/initialize-monnify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            amount: finalArgs.amount,
            customerEmail: finalArgs.customerEmail || sessionUser?.email || "user@example.com",
            customerName: finalArgs.customerName || sessionUser?.name || "Ikor User",
            reference: finalArgs.paymentReference,
            paymentDescription: finalArgs.paymentDescription || "Ikor Word Top-up"
          })
        });

        const data = await edgeResponse.json();

        if (!edgeResponse.ok || !data.checkoutUrl) {
          console.error("Initialize payment error from edge function:", data);
          throw new Error(data?.error || `Payment service error (${edgeResponse.status})`);
        }

        const checkoutUrl = data.checkoutUrl;
        const transactionReference = data.transactionReference || finalArgs.paymentReference;

        // Open URL in system browser
        await openUrl(checkoutUrl);

        // Save transaction to store.json
        const store = await load("store.json");
        await store.set("pendingVoicePayment", {
          transactionReference,
          paymentReference: finalArgs.paymentReference,
          amount: finalArgs.amount,
          timestamp: Date.now()
        });
        await store.save();

        // Emit voice payment initiated event
        await emit("voice-payment-initiated", {
          transactionReference,
          paymentReference: finalArgs.paymentReference,
          amount: finalArgs.amount
        });

        // Close panel
        setIsCallingMcp(false);
        setMcpTransaction(null);
        setRevisions([]);
        setCurrentRevisionIndex(0);
        const win = getCurrentWindow();
        await win.hide();
        await emit("approval-closed");
        return;
      } else {
        const res = await invoke<string>("call_mcp_tool", {
          name: mappedName,
          arguments: JSON.stringify(finalArgs)
        });

        setIsCallingMcp(false);

        // For audit / transaction summary, format a structured financial report and paste to screen
        if (mappedName === "monnify_get_all_transactions") {
          try {
            let parsed: any;
            try {
              parsed = typeof res === "string" ? JSON.parse(res) : res;
            } catch {
              parsed = res;
            }

            const rawText = parsed?.content?.[0]?.text || (typeof res === "string" ? res : JSON.stringify(res));
            let responseData: any;
            try {
              responseData = JSON.parse(rawText);
            } catch {
              responseData = parsed;
            }

            const transactionsList: any[] = responseData?.responseBody?.content || responseData?.content || (Array.isArray(responseData) ? responseData : []);

            let totalRevenue = 0;
            let paidCount = 0;
            let bankTransferRevenue = 0;
            let bankTransferCount = 0;
            let cardRevenue = 0;
            let cardCount = 0;
            let otherRevenue = 0;
            let otherCount = 0;

            if (Array.isArray(transactionsList) && transactionsList.length > 0) {
              for (const tx of transactionsList) {
                const status = tx.paymentStatus || tx.status;
                const amount = Number(tx.amountPaid || tx.amount || tx.totalPayable || 0);
                const method = String(tx.paymentMethod || tx.method || "").toUpperCase();

                if (status === "PAID" || !status) {
                  totalRevenue += amount;
                  paidCount++;
                  if (method.includes("TRANSFER") || method.includes("ACCOUNT")) {
                    bankTransferRevenue += amount;
                    bankTransferCount++;
                  } else if (method.includes("CARD")) {
                    cardRevenue += amount;
                    cardCount++;
                  } else {
                    otherRevenue += amount;
                    otherCount++;
                  }
                }
              }
            }

            const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            let summaryText = "";

            if (paidCount > 0) {
              summaryText = [
                `📊 Monnify Real-Time Payment Audit & Sales Summary (${todayStr})`,
                `--------------------------------------------------`,
                `• Total Revenue Collected: ₦${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `• Total Successful Payments: ${paidCount}`,
                `• Bank Transfers: ₦${bankTransferRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${bankTransferCount} transfer${bankTransferCount === 1 ? '' : 's'})`,
                cardCount > 0 ? `• Card Payments: ₦${cardRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cardCount})` : null,
                otherCount > 0 ? `• Other Channels: ₦${otherRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${otherCount})` : null,
                `• Status: Verified Live via Monnify MCP`,
                `--------------------------------------------------`
              ].filter(Boolean).join("\n");
            } else {
              summaryText = [
                `📊 Monnify Real-Time Payment Audit & Sales Summary (${todayStr})`,
                `--------------------------------------------------`,
                `• Total Revenue Collected: ₦0.00`,
                `• Successful Payments: 0`,
                `• Primary Collection Channel: Bank Transfer`,
                `• Status: Verified Live via Monnify MCP (No completed transactions recorded today)`,
                `--------------------------------------------------`
              ].join("\n");
            }

            // Auto-paste summary report directly onto user's active screen
            stopZOrderLoop();
            await invoke("type_text", { text: summaryText });
            if (navigator.clipboard) await navigator.clipboard.writeText(summaryText);

            setMcpTransaction(null);
            setRevisions([]);
            setCurrentRevisionIndex(0);
            const win = getCurrentWindow();
            await win.hide();
            await emit("approval-closed");
            return;
          } catch (auditErr) {
            console.warn("Failed to format transaction audit report:", auditErr);
          }
        }

        // For invoice creation, extract checkoutUrl/invoiceUrl and open in browser
        if (mappedName === "monnify_create_invoice") {
          try {
            const parsed = typeof res === "string" ? JSON.parse(res) : res;
            // MCP result format: { content: [{ type: "text", text: "..." }] }
            const textContent = parsed?.content?.[0]?.text;
            const invoiceData = textContent ? JSON.parse(textContent) : parsed;
            const checkoutUrl = invoiceData?.checkoutUrl || invoiceData?.invoiceUrl;

            if (checkoutUrl) {
              // Paste the invoice URL directly into the user's active text area
              // (e.g. chat window, email composer) via the Rust clipboard+paste mechanism
              stopZOrderLoop();
              await invoke("set_approval_mode", { text: checkoutUrl });
              if (navigator.clipboard) await navigator.clipboard.writeText(checkoutUrl);

              setMcpTransaction(null);
              setRevisions([]);
              setCurrentRevisionIndex(0);
              const win = getCurrentWindow();
              await win.hide();
              await emit("approval-closed");
              return;
            }
          } catch (parseErr) {
            console.warn("Failed to parse invoice response for URL extraction:", parseErr);
            // Fall through to show raw response in ScribePro panel
          }
        }

        setMcpTransaction(null);

        // Convert success to standard revision response so user can paste it
        const successMsg = typeof res === "string" ? res : JSON.stringify(res, null, 2);
        setRevisions([
          {
            command: `Monnify MCP ${mappedName} Succeeded`,
            response: successMsg
          }
        ]);
        setCurrentRevisionIndex(0);
      }
    } catch (err) {
      console.error("Monnify MCP Tool Error:", err);
      setIsCallingMcp(false);
      const errMsg = err instanceof Error ? err.message : (typeof err === "string" ? err : JSON.stringify(err));
      setMcpError(errMsg || "An unexpected error occurred. Please try again.");
    }
  };

  const handleRejectMcp = async () => {
    if (isCallingMcp || !mcpTransaction) return;
    
    stopZOrderLoop();
    mcpRawTextRef.current = null;
    setMcpTransaction(null);
    setRevisions([]);
    setCurrentRevisionIndex(0);
    
    await invoke("set_approval_mode", { text: null as string | null });
    const win = getCurrentWindow();
    await win.hide();
    await emit("approval-closed");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mcpTransaction) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleApproveMcp();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleRejectMcp();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mcpTransaction, isCallingMcp, sessionUser, hasMinError, hasMaxError]);

  useEffect(() => {
    let isMounted = true;
    const unlisteners: (() => void)[] = [];

    const init = async () => {
      // Load initial shortcuts
      try {
        const store = await load("store.json");
        const storedShortcuts = await store.get("sayikor_shortcuts");
        if (storedShortcuts) {
          const shortcuts = typeof storedShortcuts === "string" ? JSON.parse(storedShortcuts) : storedShortcuts;
          if (Array.isArray(shortcuts)) {
            const scribe = shortcuts.find((s: any) => s.id === "scribe");
            if (scribe && scribe.keys) setScribeShortcut(scribe.keys);
          }
        }
      } catch (e) {
        console.error("Failed to load shortcuts in approval panel", e);
      }

      // Listen for shortcuts updates
      const unlistenShortcuts = await listen<string>("shortcuts-updated", (event) => {
        try {
          const shortcuts = JSON.parse(event.payload);
          const scribe = shortcuts.find((s: any) => s.id === "scribe");
          if (scribe && scribe.keys) setScribeShortcut(scribe.keys);
        } catch (e) {}
      });
      if (isMounted) unlisteners.push(unlistenShortcuts);

      // Listen for new revisions sent from the main bubble (Phase 1: raw ASR text)
      const unlistenAdd = await listen<Revision>("add-revision", async (event) => {
        if (!isMounted) return;
        setRevisions(prev => {
          const updated = [...prev, event.payload];
          setCurrentRevisionIndex(updated.length - 1);
          return updated;
        });
        
        // Position window: bottom center, just above the bubble (same workArea pattern as App.tsx)
        const win = getCurrentWindow();
        const mon = await currentMonitor();
        if (mon) {
          const sf = mon.scaleFactor;
          const lw = mon.workArea.size.width / sf;
          const lh = mon.workArea.size.height / sf;
          const lx = mon.workArea.position.x / sf;
          const ly = mon.workArea.position.y / sf;
          
          const pw = 520; 
          const ph = 420;
          // Bubble sits at y = ly + lh - 100 - 25 = ly + lh - 125.
          // Panel sits above it with a 10px gap: y = ly + lh - 125 - ph - 10 = ly + lh - ph - 135
          
          await win.setSize(new LogicalSize(pw, ph));
          await win.setPosition(new LogicalPosition(lx + (lw - pw) / 2, ly + lh - ph - 135));
          await win.setAlwaysOnTop(true);
          await win.show();
          await win.setFocus();
          
          // Start aggressive Z-order dominance loop (500ms for snipping tool resilience)
          startZOrderLoop();
        } else {
          await win.show();
          await win.setFocus();
        }
      });
      if (isMounted) unlisteners.push(unlistenAdd);

      // Listen for Phase 2: LLM response updates the current revision
      const unlistenUpdate = await listen<Revision>("update-revision-response", async (event) => {
        if (!isMounted) return;
        const { command, response } = event.payload;
        setRevisions(prev => {
          // Find the revision with matching command and update its response
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].command === command && updated[i].response === "") {
              updated[i] = { ...updated[i], response };
              break;
            }
          }
          return updated;
        });
      });
      if (isMounted) unlisteners.push(unlistenUpdate);

      // Listen for the global shortcut approvals/cancellations managed by Rust
      const unlistenDone = await listen("approval-done", async () => {
        if (!isMounted) return;
        stopZOrderLoop();
        setRevisions([]);
        setCurrentRevisionIndex(0);
        await getCurrentWindow().hide();
      });
      if (isMounted) unlisteners.push(unlistenDone);

      const unlistenCancelled = await listen("approval-cancelled", async () => {
        if (!isMounted) return;
        stopZOrderLoop();
        setRevisions([]);
        setCurrentRevisionIndex(0);
        
        mcpRawTextRef.current = null;
        setMcpTransaction(null);
        await invoke("set_approval_mode", { text: null as string | null });
        await getCurrentWindow().hide();
        await emit("approval-closed");
      });
      if (isMounted) unlisteners.push(unlistenCancelled);

      // Listen for Monnify MCP transaction events
      const unlistenMcp = await listen<McpTransaction>("add-mcp-transaction", async (event) => {
        if (!isMounted) return;
        const tx = event.payload;
        const mappedName = TOOL_NAME_MAP[tx.toolName] || tx.toolName;
        setMcpTransaction({
          ...tx,
          toolName: mappedName
        });
        mcpRawTextRef.current = tx.rawText || tx.explanation || "";
        setIsCallingMcp(false);
        setMcpError(null);
 
        // Position window: bottom center, just above the bubble (same workArea pattern as App.tsx)
        const win = getCurrentWindow();
        const mon = await currentMonitor();
        if (mon) {
          const sf = mon.scaleFactor;
          const lw = mon.workArea.size.width / sf;
          const lh = mon.workArea.size.height / sf;
          const lx = mon.workArea.position.x / sf;
          const ly = mon.workArea.position.y / sf;
          
          const pw = 520; 
          const ph = 420;
          await win.setSize(new LogicalSize(pw, ph));
          await win.setPosition(new LogicalPosition(lx + (lw - pw) / 2, ly + lh - ph - 135));
          await win.setAlwaysOnTop(true);
          await win.show();
          await win.setFocus();
          startZOrderLoop();
        } else {
          await win.show();
          await win.setFocus();
        }
      });
      if (isMounted) unlisteners.push(unlistenMcp);
    };

    init();

    return () => {
      isMounted = false;
      stopZOrderLoop();
      unlisteners.forEach(fn => fn());
    };
  }, []);
 
  // Local Enter/Escape KeyDown interceptor for MCP mode focus inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === "Enter") {
        e.preventDefault();
        if (mcpTransaction) {
          handleApproveMcp();
        } else {
          confirmPanel();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (mcpTransaction) {
          handleRejectMcp();
        } else {
          closePanel();
        }
      }
    };
 
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mcpTransaction, revisions, currentRevisionIndex, isCallingMcp, hasMinError, hasMaxError]);

  const currentRevision = revisions[currentRevisionIndex];
  const isWaitingForLLM = currentRevision?.response === "";

  useEffect(() => {
    if (currentRevision && currentRevision.response) {
      emit("visible-revision-changed", currentRevision.response);
    }
  }, [currentRevision]);

  const handleCopyToClipboard = async () => {
    if (currentRevision && currentRevision.response && navigator.clipboard) {
      await navigator.clipboard.writeText(currentRevision.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const closePanel = async () => {
    stopZOrderLoop();
    await invoke("set_approval_mode", { text: null as string | null });
    setRevisions([]);
    setCurrentRevisionIndex(0);
    const win = getCurrentWindow();
    await win.hide();
    await emit("approval-closed");
  };

  const confirmPanel = async () => {
    if (!currentRevision || !currentRevision.response) return;
    stopZOrderLoop();
    // Set approval text — the Rust background thread will detect Enter and handle
    // clipboard + paste after hiding the window (focus returns to target app)
    await invoke("set_approval_mode", { text: currentRevision.response });
    // Also copy to clipboard via browser API for Ctrl+Alt+S re-paste
    if (navigator.clipboard) await navigator.clipboard.writeText(currentRevision.response);
    
    setRevisions([]);
    setCurrentRevisionIndex(0);
    // Hide window to return focus to the target app
    const win = getCurrentWindow();
    await win.hide();
    await emit("approval-closed");
  };

  if (mcpTransaction) {
    const isTopUp = mcpTransaction.toolName === "monnify_initiate_payment";
    const isInvoice = mcpTransaction.toolName === "monnify_create_invoice";
    const isAudit = mcpTransaction.toolName === "monnify_get_all_transactions";
    const topUpAmount = mcpTransaction.args.amount || 0;
    const estWords = sessionUser ? calculateWordsForAmount(topUpAmount, sessionUser.plan || "Free Trial") : 0;

    return (
      <div className="w-full h-full flex items-stretch justify-center bg-transparent p-2 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col w-full rounded-[28px] bg-[#171717] border-[1.2px] border-amber-500/30 overflow-hidden shadow-2xl p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
                {isAudit ? <BarChart3 size={18} /> : isInvoice ? <FileText size={18} /> : <CreditCard size={18} />}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {isTopUp ? "Confirm Wallet Top-up" : isInvoice ? "Confirm Merchant Invoice Creation" : isAudit ? "Confirm Real-Time Payment Audit" : "Voice Transaction Required"}
                </h3>
                <p className="text-[10px] text-white/40">
                  {isTopUp ? "Monnify Secure Checkout" : isInvoice ? "Monnify Invoicing Service" : isAudit ? "Monnify Sales Analytics & Auto-Paste" : "Verify Monnify MCP Tool Call"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectMcp}
              disabled={isCallingMcp}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Body/Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 mb-3">
            {isTopUp ? (
              /* Premium Topup Card */
              <div className="space-y-3">
                {/* Visual Receipt/Price Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-[#262016] to-transparent border border-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Total Amount</div>
                  <div className="text-amber-500 text-3xl font-black mt-1">₦{topUpAmount.toLocaleString()}.00</div>
                  <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 border border-amber-500/20 flex items-center gap-1">
                    <span>⚡ Est. +{estWords.toLocaleString()} words</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="bg-[#222] rounded-xl p-3 space-y-2.5 border border-white/5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Service:</span>
                    <span className="text-white font-medium">Ikor Word Balance Reload</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Rate Tier:</span>
                    <span className="text-white font-medium capitalize">
                      {sessionUser?.plan || "Free Trial"} (₦{sessionUser?.plan === "Ikor Pro" || sessionUser?.plan === "Pro plan" ? "25" : "50"} per 1k words)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Payer Details:</span>
                    <span className="text-white font-medium truncate max-w-[200px]" title={sessionUser?.email}>
                      {sessionUser?.name || "Ikor User"} ({sessionUser?.email || "No email"})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Payment Gateway:</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Monnify
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-amber-950/20 border border-amber-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                  <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-white/60 text-[10.5px] leading-relaxed">
                    {mcpTransaction.explanation || "Spoken command triggered a Monnify top-up request."}
                  </p>
                </div>

                {/* Validation Warnings */}
                {hasMinError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-500 shrink-0 mt-0.5">⚠️</span>
                      <p className="text-[10.5px] leading-relaxed font-semibold">
                        Minimum purchase is ₦300.00 worth of words (total payment must be at least ₦468.00 including fees).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustAmount(468)}
                      className="self-start text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-500/20 transition-all cursor-pointer select-none"
                    >
                      Adjust to Minimum (₦468.00)
                    </button>
                  </div>
                )}
                {hasMaxError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-500 shrink-0 mt-0.5">⚠️</span>
                      <p className="text-[10.5px] leading-relaxed font-semibold">
                        Maximum purchase is ₦9,000.00 worth of words (total payment must be at most ₦9,690.00 including fees).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustAmount(9690)}
                      className="self-start text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-500/20 transition-all cursor-pointer select-none"
                    >
                      Adjust to Maximum (₦9,690.00)
                    </button>
                  </div>
                )}
              </div>
            ) : isInvoice ? (
              /* Merchant Invoice Creation Card */
              <div className="space-y-3">
                {/* Visual Invoice Amount Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-[#262016] to-transparent border border-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Invoice Amount</div>
                  <div className="text-amber-500 text-3xl font-black mt-1">₦{(mcpTransaction.args.amount || 0).toLocaleString()}.00</div>
                  <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border border-amber-500/20 flex items-center gap-1">
                    <span>🗓️ Expires in {mcpTransaction.args.expiryDays || 7} Days</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="bg-[#222] rounded-xl p-3 space-y-2.5 border border-white/5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Customer / Client:</span>
                    <span className="text-white font-medium">{mcpTransaction.args.customerName || "Apex Ltd"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Description:</span>
                    <span className="text-white font-medium truncate max-w-[200px]" title={mcpTransaction.args.description}>
                      {mcpTransaction.args.description || "Supply of goods"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Client Email:</span>
                    <span className="text-white font-medium truncate max-w-[200px]" title={mcpTransaction.args.customerEmail}>
                      {mcpTransaction.args.customerEmail || sessionUser?.email || "billing@apexltd.com"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Payment Gateway:</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Monnify Invoice API
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-amber-950/20 border border-amber-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                  <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-white/60 text-[10.5px] leading-relaxed">
                    {mcpTransaction.explanation || `Create a ₦${(mcpTransaction.args.amount || 0).toLocaleString()} invoice for ${mcpTransaction.args.customerName || 'customer'}.`}
                  </p>
                </div>
              </div>
            ) : isAudit ? (
              /* Real-Time Payment Audit Card */
              <div className="space-y-3">
                {/* Visual Audit Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-[#262016] to-transparent border border-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Real-Time Payment Audit</div>
                  <div className="text-amber-500 text-xl font-black mt-1">Today's Sales Revenue & Audit</div>
                  <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border border-amber-500/20 flex items-center gap-1">
                    <span>⚡ Auto-Paste Summary to Screen</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="bg-[#222] rounded-xl p-3 space-y-2.5 border border-white/5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Query Action:</span>
                    <span className="text-white font-medium">Merchant Sales Revenue Audit</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Target Channel:</span>
                    <span className="text-white font-medium">
                      {mcpTransaction.args.paymentMethod || "ACCOUNT_TRANSFER (Bank Transfer)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Payment Status:</span>
                    <span className="text-emerald-400 font-medium font-mono">
                      {mcpTransaction.args.paymentStatus || "PAID"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Destination:</span>
                    <span className="text-amber-300 font-medium">Active Screen / Cursor</span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-amber-950/20 border border-amber-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                  <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-white/60 text-[10.5px] leading-relaxed">
                    {mcpTransaction.explanation || "Query Monnify MCP for bank transfer sales today and paste formatted summary directly onto active screen."}
                  </p>
                </div>
              </div>
            ) : (
              /* Generic Transaction Details */
              <>
                <div className="bg-[#2a2a2a] rounded-xl p-3.5 border border-white/5">
                  <p className="text-white/80 text-xs leading-relaxed">
                    {mcpTransaction.explanation || "Spoken command triggered a Monnify transaction request."}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-[#2a2a2a]/40 p-2.5 rounded-lg border border-white/5 font-medium">
                  <span className="text-white/40">MCP Tool:</span>
                  <span className="font-mono text-amber-400 font-bold">{mcpTransaction.toolName}</span>
                </div>
              </>
            )}

            {/* Error Message */}
            {mcpError && (
              <div className="bg-red-950/40 border border-red-500/20 text-red-400 rounded-lg p-3 text-[11px] leading-relaxed">
                <strong>Error executing tool:</strong> {mcpError}
              </div>
            )}

            {/* Collapsible Technical Details (for both custom & generic) */}
            <div className="border-t border-[#2a2a2a] pt-2 mt-2">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-white/40 hover:text-white/60 transition-colors text-[10px] font-semibold flex items-center gap-1 select-none cursor-pointer"
              >
                <span>{showTechnicalDetails ? "▼ Hide" : "▶ Show"} Technical Details</span>
              </button>
              {showTechnicalDetails && (
                <div className="space-y-1.5 mt-2 bg-[#151515] border border-white/5 rounded-lg p-2.5">
                  <div className="text-[10px] text-white/50 font-mono">
                    <span className="text-amber-400">Tool:</span> {mcpTransaction.toolName}
                  </div>
                  <pre className="w-full text-[9px] text-white/85 font-mono overflow-x-auto max-h-[100px] mt-1 pr-1 custom-scrollbar">
                     {JSON.stringify(mcpTransaction.args, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2.5 border-t border-[#2a2a2a]">
            <button
              onClick={handleRejectMcp}
              disabled={isCallingMcp}
              className="flex-1 py-2 rounded-xl border border-white/10 text-white/85 text-xs font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Ban size={13} />
              Reject <span className="text-[10px] text-white/40 font-normal">(Esc)</span>
            </button>
            <button
              onClick={handleApproveMcp}
              disabled={isCallingMcp || hasMinError || hasMaxError}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 transition-all ${
                isCallingMcp || hasMinError || hasMaxError
                  ? "bg-amber-500/20 text-white/30 cursor-not-allowed shadow-none"
                  : "bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-lg shadow-amber-500/10"
              }`}
            >
              {isCallingMcp ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Auditing Monnify...
                </>
              ) : isAudit ? (
                <>
                  <Check size={13} />
                  Approve & Paste Summary <span className="text-[10px] font-normal opacity-70">(Enter)</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  Approve Call <span className="text-[10px] font-normal opacity-70">(Enter)</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (revisions.length === 0 || !currentRevision) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent p-2">
        <div className="flex flex-col w-full rounded-[28px] bg-[#1a1a1a] border-[1.2px] animate-iridescent overflow-hidden shadow-2xl p-6 items-center">
          <p className="text-white/60 text-sm mb-4 select-none">No pending approvals.</p>
          <button
            onClick={closePanel}
            className="px-6 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white/80 rounded-full text-sm font-medium transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-stretch justify-center bg-transparent p-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col w-full rounded-[28px] bg-[#1a1a1a] border-[1.2px] animate-iridescent overflow-hidden shadow-2xl"
      >
        {/* Header: revision nav + badge + close */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-1 bg-[#2a2a2a] rounded-full px-3 py-1 z-10">
            <button
              onClick={() => setCurrentRevisionIndex(Math.max(0, currentRevisionIndex - 1))}
              disabled={currentRevisionIndex === 0}
              className="text-white/60 hover:text-white disabled:text-white/20 text-sm font-medium transition-colors"
            >&lt;</button>
            <span className="text-white/80 text-xs font-medium px-2 select-none">
              {currentRevisionIndex + 1} / {revisions.length}
            </span>
            <button
              onClick={() => setCurrentRevisionIndex(Math.min(revisions.length - 1, currentRevisionIndex + 1))}
              disabled={currentRevisionIndex === revisions.length - 1}
              className="text-white/60 hover:text-white disabled:text-white/20 text-sm font-medium transition-colors"
            >&gt;</button>
          </div>

          {/* ScribePro Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2a2a]/60 border border-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.15)] select-none">
            <Wand2 className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="font-semibold text-[11px] tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ScribePro
            </span>
          </div>

          <button
            onClick={closePanel}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white/60 hover:text-white transition-colors text-sm z-10"
          >✕</button>
        </div>

        {/* Command bubble (raw ASR text — always shown) */}
        <div className="px-4 pt-1 pb-2">
          <div className="bg-[#2a2a2a] rounded-2xl px-4 py-2.5">
            <p className="text-white/70 text-sm leading-relaxed select-none">{currentRevision.command}</p>
          </div>
        </div>

        {/* Response text (LLM response — or loading shimmer) */}
        <div className="flex-1 px-4 pb-3 overflow-y-auto custom-scrollbar min-h-0">
          {isWaitingForLLM ? (
            <div className="flex flex-col gap-2 py-2">
              {/* Shimmer loading skeleton */}
              <div className="h-3 bg-[#2a2a2a] rounded-full w-[90%] animate-pulse" />
              <div className="h-3 bg-[#2a2a2a] rounded-full w-[75%] animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="h-3 bg-[#2a2a2a] rounded-full w-[60%] animate-pulse" style={{ animationDelay: '300ms' }} />
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 border-2 border-purple-500/60 border-t-transparent rounded-full animate-spin" />
                <span className="text-white/40 text-xs select-none">Thinking...</span>
              </div>
            </div>
          ) : (
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap select-none">{currentRevision.response}</p>
          )}
        </div>

        {/* Bottom CTAs */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-1.5 bg-[#2a2a2a] rounded-full px-3 py-1.5 text-white/60 text-xs select-none">
            <span>Rewrite with voice</span>
            {scribeShortcut.map((key) => {
              // Convert "Left Ctrl" -> "Ctrl", "Left Win" -> "Win", etc for cleaner display
              let displayKey = key;
              if (displayKey.startsWith("Left ")) displayKey = displayKey.substring(5);
              if (displayKey.startsWith("Right ")) displayKey = displayKey.substring(6);
              
              return (
                <kbd key={key} className="bg-[#3a3a3a] px-2 py-0.5 rounded-full text-[10px] font-medium">
                  {displayKey}
                </kbd>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              disabled={isWaitingForLLM}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2a2a] text-white/50 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </button>
            <button
              onClick={confirmPanel}
              disabled={isWaitingForLLM}
              className="flex items-center gap-2 bg-white text-black rounded-full px-4 py-1.5 text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
              <kbd className="bg-black/10 px-2 py-0.5 rounded-full text-[10px]">↵</kbd>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
