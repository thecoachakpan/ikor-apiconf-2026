import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalPosition, LogicalSize, currentMonitor } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

import { playStartRecordingSound, playStopRecordingSound } from "./utils/audio";
import { motion, AnimatePresence } from "framer-motion";
import { UltraFastStream } from "./audio/ultraFastStream";
import { FastBatch, PipelineResult } from "./audio/fastBatch";
import { QueuedLocal } from "./audio/queuedLocal";
import { Wand2 } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { calculateWordDeduction } from "./utils/wordDeduction";
import { parseMonnifyIntent } from "./lib/mcpClient";

const WAVE_LINES = 7;
const SILENCE_HEIGHT = 2;
const SILENCE_ARRAY = new Array(WAVE_LINES).fill(SILENCE_HEIGHT);

// Modes: 
// - idle: collapsed pill
// - active_speaking: human voice detected (100% opacity, moving)
// - hover_preview: expanded but inactive
type Mode = 'idle' | 'active_speaking' | 'hover_preview' | 'transcribing' | 'approval';

interface Revision {
  command: string;
  response: string;
}

const SAYIKOR_LOGO = (
  <img src="/app-logos/sayikor.png" className="w-4 h-4 object-contain rounded-sm" alt="Sayikor" />
);

const DEFAULT_MAPPINGS: Record<string, string[]> = {
  slack: ["slack"],
  whatsapp: ["whatsapp"],
  cursor: ["cursor"],
  vscode: ["visual studio code", "vscode"],
  notion: ["notion"],
  spotify: ["spotify"],
  discord: ["discord"],
  teams: ["teams"],
  zoom: ["zoom"],
  figma: ["figma"],
  gmail: ["gmail", "mail.google.com"],
  youtube: ["youtube"],
  github: ["github"]
};

let globalMappings: Record<string, string[]> = DEFAULT_MAPPINGS;

fetch('/mappings.json')
  .then(res => res.json())
  .then(data => {
    globalMappings = { ...DEFAULT_MAPPINGS, ...data };
  })
  .catch(() => {});

const AppIcon = ({ name, iconUrl, exe, title }: { name: string; iconUrl?: string | null; exe: string; title: string }) => {
  const [imgError, setImgError] = useState(false);
  const [browserImgError, setBrowserImgError] = useState(false);

  const exeLower = exe ? exe.toLowerCase() : "";
  const isBrowser = ["chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe"].includes(exeLower);

  // Determine key using mappings and title if running in a browser
  let key = name.toLowerCase().replace(/\s+/g, "").replace("-", "");
  
  if (isBrowser) {
    const titleLower = title ? title.toLowerCase() : "";
    for (const [mapKey, keywords] of Object.entries(globalMappings)) {
      if (titleLower.includes(mapKey) || keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
        key = mapKey;
        break;
      }
    }
  }

  const isBrowserSite = isBrowser && !["chrome", "edge", "msedge", "firefox", "brave", "opera"].includes(key);

  let browserKey = exeLower.replace(".exe", "");
  if (browserKey === "msedge") browserKey = "edge";

  useEffect(() => {
    setImgError(false);
    setBrowserImgError(false);
  }, [name, exe, title]);

  if (!imgError) {
    return (
      <img 
        src={`/app-logos/${key}.png`} 
        className="w-4 h-4 object-contain rounded-sm"
        alt={name}
        onError={() => setImgError(true)}
      />
    );
  }

  if (isBrowserSite && !browserImgError) {
    return (
      <img 
        src={`/app-logos/${browserKey}.png`} 
        className="w-4 h-4 object-contain rounded-sm"
        alt={browserKey}
        onError={() => setBrowserImgError(true)}
      />
    );
  }

  if (iconUrl) {
    return <img src={iconUrl} className="w-4 h-4 object-contain rounded-sm" alt={name} />;
  }

  return SAYIKOR_LOGO;
};

function App({ hasSession = false }: { hasSession?: boolean }) {
  const hasSessionRef = useRef(hasSession);
  useEffect(() => {
    hasSessionRef.current = hasSession;
  }, [hasSession]);

  const [audioData, setAudioData] = useState<number[]>(SILENCE_ARRAY);
  const [mode, setMode] = useState<Mode>('idle');
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const [hideFocusedAppIcon, setHideFocusedAppIcon] = useState(false);
  const [showIkorBar, setShowIkorBar] = useState(localStorage.getItem("sayikor_show_ikor_bar") !== "false");
  const showIkorBarRef = useRef<boolean>(localStorage.getItem("sayikor_show_ikor_bar") !== "false");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isScribeMode, setIsScribeMode] = useState(false);
  const [isMcpMode, setIsMcpMode] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const isHandsFreeRef = useRef(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const showOfflineAlertRef = useRef(false);
  const [activeApp, setActiveApp] = useState<{ name: string; icon?: string | null; exe: string; title: string }>({
    name: "Sayikor",
    icon: null,
    exe: "sayikor.exe",
    title: ""
  });

  // Visualizer refs
  const animationFrameRef = useRef<number | null>(null);

  // Audio module refs
  const activeModuleRef = useRef<UltraFastStream | FastBatch | QueuedLocal | null>(null);

  // App state refs
  const dictationSpeedRef = useRef<string>("fast");
  const storeRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isScribeModeRef = useRef(false);
  const isMcpModeRef = useRef(false);
  const windowContextRef = useRef<string | null>(null);
  const scribeGroupIdRef = useRef<string | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const recordingLockRef = useRef(false);
  const userWordsRef = useRef<number>(900);
  const contextAwarenessRef = useRef<boolean>(localStorage.getItem("sayikor_context_awareness") !== "false");
  const systemAudioRef = useRef<boolean>(localStorage.getItem("sayikor_system_audio") === "true");
  const interactionSoundsRef = useRef<boolean>(localStorage.getItem("sayikor_interaction_sounds") !== "false");
  const offlineModeRef = useRef<boolean>(localStorage.getItem("sayikor_offline_mode") === "true");
  const modeRef = useRef<Mode>('idle');
  const changeMode = (newMode: Mode) => {
    setMode(newMode);
    modeRef.current = newMode;
    if (newMode === 'idle' && (!showIkorBarRef.current || !hasSessionRef.current)) {
      getCurrentWindow().hide().catch(console.error);
    }
  };
  const stopTimeoutRef = useRef<any>(null);
  const currentMicVolumeRef = useRef<number>(0);
  const activePollingRefs = useRef<Set<string>>(new Set());

  const startPaymentPolling = (pendingPayment: { transactionReference: string; paymentReference: string; amount: number }) => {
    if (!pendingPayment || !pendingPayment.transactionReference) return;
    if (activePollingRefs.current.has(pendingPayment.transactionReference)) return;
    activePollingRefs.current.add(pendingPayment.transactionReference);

    console.log("Starting background polling for voice payment:", pendingPayment.transactionReference);

    const intervalId = setInterval(async () => {
      try {
        console.log("Polling payment verification for ref:", pendingPayment.transactionReference);
        const { data, error } = await supabase.functions.invoke("verify-monnify-payment", {
          body: { transactionReference: pendingPayment.transactionReference }
        });

        if (error) {
          console.warn("verify-monnify-payment edge function error:", error);
          return;
        }

        if (data && data.verified) {
          console.log("Voice payment verification successful!", data);
          clearInterval(intervalId);
          activePollingRefs.current.delete(pendingPayment.transactionReference);

          // Get user details to calculate and update word balance
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const currentPlan = user.user_metadata?.plan_name || "Free Trial";
            
            // Calculate words to add
            let rate = 0.1; // fallback
            if (currentPlan === "Ikor Pro" || currentPlan === "Pro plan") {
              rate = 0.025;
            } else if (currentPlan === "Ikor Plus" || currentPlan === "Free Trial" || currentPlan === "Free") {
              rate = 0.05;
            }
            
            const wordsAdded = pendingPayment.amount <= 150 ? 0 : Math.round(((pendingPayment.amount - 150) / 1.06) / rate);
            const currentWords = user.user_metadata?.user_words_balance || 0;
            const newWordsVal = currentWords + wordsAdded;

            // Update user words balance in Supabase
            const metadata = user.user_metadata || {};
            await supabase.auth.updateUser({
              data: {
                ...metadata,
                user_words_balance: newWordsVal
              }
            });

            // Update local ref & Tauri store
            userWordsRef.current = newWordsVal;
            const store = storeRef.current || await load("store.json");
            await store.set("userWords", newWordsVal);
            await store.delete("pendingVoicePayment");
            await store.save();

            // Emit to sync other windows
            await emit("user-words-updated", newWordsVal);
            await emit("voice-payment-success", {
              amount: pendingPayment.amount,
              wordsAdded,
              paymentReference: pendingPayment.paymentReference
            });

            // Native desktop notification using tauri-plugin-notification for correct app name
            try {
              const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
              const hasPermission = await isPermissionGranted();
              let granted = hasPermission;
              if (!hasPermission) {
                const permission = await requestPermission();
                granted = permission === "granted";
              }
              if (granted) {
                sendNotification({
                  title: "Ikor Top-up Successful",
                  body: `Successfully credited your wallet with ${wordsAdded.toLocaleString()} words!`
                });
              }
            } catch (notificationErr) {
              console.error("Failed to trigger native notification via plugin:", notificationErr);
              // Graceful fallback to native browser desktop notification if plugin is unavailable
              if (Notification.permission === "granted") {
                new Notification("Ikor Top-up Successful", {
                  body: `Successfully credited your wallet with ${wordsAdded.toLocaleString()} words!`
                });
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((perm) => {
                  if (perm === "granted") {
                    new Notification("Ikor Top-up Successful", {
                      body: `Successfully credited your wallet with ${wordsAdded.toLocaleString()} words!`
                    });
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in voice payment polling loop:", err);
      }
    }, 5000);
  };

  // Constants for visualizer

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    showIkorBarRef.current = showIkorBar;
    if (!isInitialized) return;
    const win = getCurrentWindow();
    if (hasSession && (showIkorBar || modeRef.current !== 'idle')) {
      win.show().catch(console.error);
    } else {
      win.hide().catch(console.error);
    }
  }, [showIkorBar, isInitialized, hasSession, mode]);

  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  useEffect(() => {
    isScribeModeRef.current = isScribeMode;
  }, [isScribeMode]);

  useEffect(() => {
    isMcpModeRef.current = isMcpMode;
  }, [isMcpMode]);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  useEffect(() => {
    showOfflineAlertRef.current = showOfflineAlert;
  }, [showOfflineAlert]);

  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineAlert(false);
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (hasSession) {
      // Fetch initial userWords balance from cached session (to bypass supabase auth lockup)
      try {
        const cachedUserStr = localStorage.getItem("sayikor_user");
        if (cachedUserStr) {
          const user = JSON.parse(cachedUserStr);
          const val = user.user_metadata?.user_words_balance;
          if (typeof val === 'number') {
            userWordsRef.current = val;
            console.log("Loaded userWords into ref from cached localStorage user metadata:", userWordsRef.current);
          }
        }
      } catch (e) {
        console.error("Failed to sync user words on session transition from cache:", e);
      }
    } else {
      // Clear local word cache and store on sign-out
      userWordsRef.current = 900;
      (async () => {
        try {
          const store = storeRef.current || await load("store.json");
          await store.delete("userWords");
          await store.save();
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [hasSession]);

  // ── Unified Transcription Callback (called by all modules) ───────────
  const handleRawTranscription = async (result: PipelineResult | string) => {
    try {
      console.time("Total Transcription Pipeline");

      let text = "";
      
      if (typeof result === 'string') {
        text = result;
      } else if (result && result.text) {
        text = result.text;
        
        if (result.telemetry) {
          const t = result.telemetry;
          const totalTime = t.asrTimeMs + t.llmTimeMs;
          console.log(`
┌─────────────────────────────────────────────────────────┐
│ 🚀 Sayikor Speech Bubble Telemetry                      │
├─────────────────────────────────────────────────────────┤
│ Audio Payload Size : ${t.payloadSizeKb} KB (WebM)
│ Groq Whisper ASR   : ${t.asrTimeMs} ms
│ LLM Polishing      : ${t.llmTimeMs} ms [${t.modelUsed}]
│ Total Cloud Time   : ${totalTime} ms
└─────────────────────────────────────────────────────────┘
          `);
        }
      }

      if (!text) {
        console.log("No text received, skipping.");
        return;
      }

      // Fetch Groq API key if we might need to parse intent
      let groqKey = "";
      let mcpUserEmail = "";
      let mcpUserName = "";
      if (isMcpModeRef.current) {
        try {
          const cachedSessionStr = localStorage.getItem("sayikor_session");
          if (cachedSessionStr) {
            const session = JSON.parse(cachedSessionStr);
            mcpUserEmail = session.user.email || "";
            const meta = session.user.user_metadata || {};
            mcpUserName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name || "";
            groqKey = await invoke<string>("fetch_groq_key", {
              supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
              supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
            });
          }
        } catch (err) {
          console.warn("Failed to fetch Groq key for intent parsing:", err);
        }
      }

      if (isMcpModeRef.current) {
        // Save to history and deduct words immediately for MCP voice commands
        (async () => {
          try {
            const store = storeRef.current || await load("store.json");
            const rawHistory = await store.get('transcriptHistory');
            const history = (rawHistory as any[]) || [];
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const durationMs = performance.now() - recordStartTimeRef.current;
            const durationStr = `${(durationMs / 60000).toFixed(2)}m`;
            const wordsCount = text.split(/\s+/).filter(Boolean).length;
            const speedMode = dictationSpeedRef.current;
            const capitalizedMode = speedMode === "queued" ? "Queued" : speedMode === "ultrafast" || speedMode === "ultra-fast" ? "Ultrafast" : "Fast";

            const cost = calculateWordDeduction({
              type: "MCP",
              mode: capitalizedMode,
              duration: durationStr,
              wordsSpoken: wordsCount,
              content: text
            });

            const newHistory = [{
              time: timeStr,
              content: text,
              date: dateStr,
              type: "MCP",
              mode: capitalizedMode,
              duration: durationStr,
              wordsSpoken: wordsCount,
              cost: cost
            }, ...history];

            const transaction = {
              id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              date: `${dateStr}, ${timeStr}`,
              dayName: now.toLocaleDateString('en-US', { weekday: 'short' }),
              type: "MCP",
              mode: capitalizedMode,
              duration: durationStr,
              words: wordsCount,
              cost: cost,
              status: "Successful"
            };

            const rawConsumption = await store.get('wordConsumptionHistory');
            const consumptionHistory = (rawConsumption as any[]) || [];
            const newConsumption = [transaction, ...consumptionHistory];
            await store.set('wordConsumptionHistory', newConsumption);
            await store.set('transcriptHistory', newHistory);
            await store.save();

            await emit("new-transcription", newHistory);
            await emit("word-consumption-history-updated", newConsumption);

            // Update cumulative stats & word balance in Supabase
            const cachedUserStr = localStorage.getItem("sayikor_user");
            const user = cachedUserStr ? JSON.parse(cachedUserStr) : null;
            let updatedWords = 900;
            if (user) {
              const metadata = user.user_metadata || {};
              const prevTotalWords = typeof metadata.total_words === 'number' ? metadata.total_words : 0;
              const newTotalWords = prevTotalWords + wordsCount;

              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, '0');
              const day = String(today.getDate()).padStart(2, '0');
              const dateStrLocal = `${year}-${month}-${day}`;

              const prevDates = Array.isArray(metadata.transcription_dates) ? metadata.transcription_dates : [];
              const newDates = Array.from(new Set([...prevDates, dateStrLocal]));

              const prevWordsBalance = typeof metadata.user_words_balance === 'number' ? metadata.user_words_balance : 900;
              updatedWords = Math.max(0, prevWordsBalance - cost);

              const prevConsumptionMetadata = Array.isArray(metadata.word_consumption_history) ? metadata.word_consumption_history : [];
              const newConsumptionMetadata = [transaction, ...prevConsumptionMetadata];

              await supabase.auth.updateUser({
                data: {
                  total_words: newTotalWords,
                  transcription_dates: newDates,
                  user_words_balance: updatedWords,
                  word_consumption_history: newConsumptionMetadata
                }
              });
              await emit("cumulative-metrics-updated", { totalWords: newTotalWords, transcriptionDates: newDates });
            } else {
              // Offline fallback
              const storedWords = await store.get("userWords");
              const prevWordsBalance = (storedWords !== undefined && storedWords !== null) ? Number(storedWords) : 900;
              updatedWords = Math.max(0, prevWordsBalance - cost);
            }

            // Update local store userWords
            await store.set("userWords", updatedWords);
            await store.save();
            await emit("user-words-updated", updatedWords);
          } catch (e) {
            console.error("Failed to save MCP transcript to store:", e);
          }
        })();

        if (groqKey) {
          try {
            const mcpCall = await parseMonnifyIntent(text, groqKey, mcpUserEmail, mcpUserName);
            if (mcpCall.isMcpAction && mcpCall.toolName) {
              console.log("Speech mapped to MCP tool action, showing approval overlay:", mcpCall);
              await invoke("set_approval_mode", { text: null as string | null });
              await emit("add-mcp-transaction", {
                toolName: mcpCall.toolName,
                args: mcpCall.arguments || {},
                explanation: mcpCall.explanation || `Perform Monnify action: ${mcpCall.toolName}`,
                rawText: text
              });
              setIsTranscribing(false);
              return; // Intercept typing/polishing flow
            } else {
              // MCP hotkey was pressed but LLM did not recognize a specific tool —
              // still show the approval panel with the raw text as a general command
              console.log("MCP hotkey active but no specific tool matched; showing general approval overlay.");
              await invoke("set_approval_mode", { text: null as string | null });
              await emit("add-mcp-transaction", {
                toolName: "general_financial",
                args: { description: text },
                explanation: `Voice command via MCP hotkey: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`,
                rawText: text
              });
              setIsTranscribing(false);
              return;
            }
          } catch (err) {
            console.warn("MCP intent parsing failed, falling back to general MCP overlay:", err);
            // Even on parse failure, show the approval panel since the MCP hotkey was pressed
            await invoke("set_approval_mode", { text: null as string | null });
            await emit("add-mcp-transaction", {
              toolName: "general_financial",
              args: { description: text },
              explanation: `Voice command via MCP hotkey: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`,
              rawText: text
            });
            setIsTranscribing(false);
            return;
          }
        } else {
          // MCP hotkey was pressed but Groq key could not be loaded —
          // still show approval panel with raw text
          console.warn("MCP mode active but Groq key unavailable; showing raw approval overlay.");
          await invoke("set_approval_mode", { text: null as string | null });
          await emit("add-mcp-transaction", {
            toolName: "general_financial",
            args: { description: text },
            explanation: `Voice command via MCP hotkey (no API key): "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`,
            rawText: text
          });
          setIsTranscribing(false);
          return;
        }
      }
      if (isScribeModeRef.current) {
         const rawCommand = (typeof result !== 'string' && result?.rawAsrText) ? result.rawAsrText : text;
         
         // Phase 2: Update approval panel with the LLM-polished response
         await invoke("set_approval_mode", { text });
         await emit("update-revision-response", { command: rawCommand, response: text });
         
         // Save to history for ScribePro
         (async () => {
            try {
              const store = storeRef.current || await load("store.json");
              const rawHistory = await store.get('transcriptHistory');
              const history = (rawHistory as any[]) || [];
              const now = new Date();
              const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              const durationMs = performance.now() - recordStartTimeRef.current;
              const durationStr = `${(durationMs / 60000).toFixed(2)}m`;
              const wordsCount = text.split(/\s+/).filter(Boolean).length;
              const highlightedChars = windowContextRef.current ? windowContextRef.current.length : 0;
              
              const cost = calculateWordDeduction({
                type: "ScribePro",
                duration: durationStr,
                wordsSpoken: wordsCount,
                highlightedChars,
                content: text
              });

              if (!scribeGroupIdRef.current) {
                scribeGroupIdRef.current = `scribe-group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              }

              const newHistory = [{
                time: timeStr,
                content: text,
                command: rawCommand,
                date: dateStr,
                type: "ScribePro",
                groupId: scribeGroupIdRef.current,
                duration: durationStr,
                wordsSpoken: wordsCount,
                highlightedChars,
                cost: cost
              }, ...history];

              await store.set('transcriptHistory', newHistory);
              
              const transaction = {
                id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: `${dateStr}, ${timeStr}`,
                dayName: now.toLocaleDateString('en-US', { weekday: 'short' }),
                type: "ScribePro",
                mode: "Fast",
                duration: durationStr,
                words: wordsCount,
                cost: cost,
                status: "Successful"
              };
              const rawConsumption = await store.get('wordConsumptionHistory');
              const consumptionHistory = (rawConsumption as any[]) || [];
              const newConsumption = [transaction, ...consumptionHistory];
              await store.set('wordConsumptionHistory', newConsumption);
              await store.save();

              await emit("new-transcription", newHistory);
              await emit("word-consumption-history-updated", newConsumption);

              // Update cumulative stats & word balance in Supabase
              const { data: { user } } = await supabase.auth.getUser();
              let updatedWords = 900;
              if (user) {
                const metadata = user.user_metadata || {};
                const prevTotalWords = typeof metadata.total_words === 'number' ? metadata.total_words : 0;
                const newTotalWords = prevTotalWords + wordsCount;
                
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const dateStrLocal = `${year}-${month}-${day}`;

                const prevDates = Array.isArray(metadata.transcription_dates) ? metadata.transcription_dates : [];
                const newDates = Array.from(new Set([...prevDates, dateStrLocal]));

                const prevWordsBalance = typeof metadata.user_words_balance === 'number' ? metadata.user_words_balance : 900;
                updatedWords = Math.max(0, prevWordsBalance - cost);
                
                const prevConsumptionMetadata = Array.isArray(metadata.word_consumption_history) ? metadata.word_consumption_history : [];
                const newConsumptionMetadata = [transaction, ...prevConsumptionMetadata];
                
                await supabase.auth.updateUser({
                  data: {
                    total_words: newTotalWords,
                    transcription_dates: newDates,
                    user_words_balance: updatedWords,
                    word_consumption_history: newConsumptionMetadata
                  }
                });
                await emit("cumulative-metrics-updated", { totalWords: newTotalWords, transcriptionDates: newDates });
              } else {
                // Offline fallback
                const storedWords = await store.get("userWords");
                const prevWordsBalance = (storedWords !== undefined && storedWords !== null) ? Number(storedWords) : 900;
                updatedWords = Math.max(0, prevWordsBalance - cost);
              }

              // Update local store userWords
              await store.set("userWords", updatedWords);
              await store.save();
              await emit("user-words-updated", updatedWords);
            } catch (e) {
              console.error("Failed to save ScribePro transcript to store:", e);
            }
         })();
         
         return; // Wait for approval
      }

      console.time("Clipboard Type Text Invoke");
      await invoke("type_text", { text });
      console.timeEnd("Clipboard Type Text Invoke");

      // Fire storage updates in the background (non-blocking)
      (async () => {
        try {
          console.time("Persistent Store Update");
          const store = storeRef.current || await load("store.json");
          const rawHistory = await store.get('transcriptHistory');
          const history = (rawHistory as any[]) || [];
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          const durationMs = performance.now() - recordStartTimeRef.current;
          const durationStr = `${(durationMs / 60000).toFixed(2)}m`;
          const wordsCount = text.split(/\s+/).filter(Boolean).length;
          const speedMode = dictationSpeedRef.current;
          const capitalizedMode = speedMode === "queued" ? "Queued" : speedMode === "ultrafast" || speedMode === "ultra-fast" ? "Ultrafast" : "Fast";

          const cost = calculateWordDeduction({
            type: "Dictation",
            mode: capitalizedMode,
            duration: durationStr,
            wordsSpoken: wordsCount,
            content: text
          });

          const newHistory = [{
            time: timeStr,
            content: text,
            date: dateStr,
            type: "Dictation",
            mode: capitalizedMode,
            duration: durationStr,
            wordsSpoken: wordsCount,
            cost: cost
          }, ...history];

          const transaction = {
            id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: `${dateStr}, ${timeStr}`,
            dayName: now.toLocaleDateString('en-US', { weekday: 'short' }),
            type: "Dictation",
            mode: capitalizedMode,
            duration: durationStr,
            words: wordsCount,
            cost: cost,
            status: "Successful"
          };
          const rawConsumption = await store.get('wordConsumptionHistory');
          const consumptionHistory = (rawConsumption as any[]) || [];
          const newConsumption = [transaction, ...consumptionHistory];
          await store.set('wordConsumptionHistory', newConsumption);
          await store.set('transcriptHistory', newHistory);
          await store.save();
          
          await emit("new-transcription", newHistory);
          await emit("word-consumption-history-updated", newConsumption);
          console.timeEnd("Persistent Store Update");

          // Update cumulative stats & word balance in Supabase
          const { data: { user } } = await supabase.auth.getUser();
          let updatedWords = 900;
          if (user) {
            const metadata = user.user_metadata || {};
            const prevTotalWords = typeof metadata.total_words === 'number' ? metadata.total_words : 0;
            const newTotalWords = prevTotalWords + wordsCount;
            
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStrLocal = `${year}-${month}-${day}`;
            
            const prevDates = Array.isArray(metadata.transcription_dates) ? metadata.transcription_dates : [];
            const newDates = Array.from(new Set([...prevDates, dateStrLocal]));

            const prevWordsBalance = typeof metadata.user_words_balance === 'number' ? metadata.user_words_balance : 900;
            updatedWords = Math.max(0, prevWordsBalance - cost);
            
            const prevConsumptionMetadata = Array.isArray(metadata.word_consumption_history) ? metadata.word_consumption_history : [];
            const newConsumptionMetadata = [transaction, ...prevConsumptionMetadata];
            
            await supabase.auth.updateUser({
              data: {
                total_words: newTotalWords,
                transcription_dates: newDates,
                user_words_balance: updatedWords,
                word_consumption_history: newConsumptionMetadata
              }
            });
            await emit("cumulative-metrics-updated", { totalWords: newTotalWords, transcriptionDates: newDates });
          } else {
            // Offline fallback
            const storedWords = await store.get("userWords");
            const prevWordsBalance = (storedWords !== undefined && storedWords !== null) ? Number(storedWords) : 900;
            updatedWords = Math.max(0, prevWordsBalance - cost);
          }

          // Update local store userWords
          await store.set("userWords", updatedWords);
          await store.save();
          await emit("user-words-updated", updatedWords);
        } catch (e) {
          console.error("Failed to save transcript to store:", e);
        }
      })();
      console.timeEnd("Total Transcription Pipeline");
    } catch (err) {
      console.error("Transcription Error:", err);
      console.timeEnd("Total Transcription Pipeline");
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Main Effect ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let localAnimationFrame: number | null = null;
    let localInterval: any = null;
    const unlisteners: (() => void)[] = [];

    const init = async () => {
      const win = getCurrentWindow();
      
      const width = 210; // Increased to 210px for offline pill and horizontal headroom
      const height = 100; // Increased to 100px upwards to fit the offline pill
      if (!isMounted) return;
      await win.setSize(new LogicalSize(width, height));

      // ── Send shortcuts to Rust backend for native GetAsyncKeyState detection ──
      const sendShortcutsToRust = async (shortcutsJson?: string) => {
        let json = shortcutsJson || null;
        let loadedFromFallback = false;

        // Step 1: Try store.json
        if (!json) {
          try {
            if (!storeRef.current) {
              storeRef.current = await load("store.json");
            }
            const stored = await storeRef.current.get("sayikor_shortcuts") as string;
            if (stored) {
              json = typeof stored === 'string' ? stored : JSON.stringify(stored);
              console.log("Shortcuts loaded from store.json");
            }
          } catch (_) {}
        }

        // Step 2: Try cached Supabase user metadata in localStorage
        if (!json) {
          try {
            const cachedUserStr = localStorage.getItem("sayikor_user");
            if (cachedUserStr) {
              const user = JSON.parse(cachedUserStr);
              const metaShortcuts = user?.user_metadata?.shortcuts;
              if (metaShortcuts && Array.isArray(metaShortcuts) && metaShortcuts.length > 0) {
                json = JSON.stringify(metaShortcuts);
                loadedFromFallback = true;
                console.log("Shortcuts loaded from cached Supabase user metadata");
              }
            }
          } catch (_) {}
        }

        // Step 3: Fall back to hardcoded defaults
        if (!json) {
          json = JSON.stringify([
            { id: "dictation", keys: ["Left Ctrl", "Left Alt"] },
            { id: "scribe", keys: ["Left Ctrl", "Left Win", "Z"] },
            { id: "handsFree", keys: ["Left Ctrl", "Left Win", "Space"] },
            { id: "paste", keys: [] },
            { id: "mcp", keys: ["Left Ctrl", "Left Win", "M"] }
          ]);
          loadedFromFallback = true;
          console.log("Shortcuts using hardcoded defaults");
        }

        // Persist to store.json if loaded from a fallback source
        if (loadedFromFallback) {
          try {
            if (!storeRef.current) {
              storeRef.current = await load("store.json");
            }
            await storeRef.current.set("sayikor_shortcuts", json);
            await storeRef.current.save();
            console.log("Shortcuts persisted to store.json from fallback");
          } catch (e) {
            console.warn("Failed to persist shortcuts to store.json:", e);
          }
        }

        try {
          await invoke("update_shortcuts", { shortcutsJson: json });
          console.log("Shortcuts sent to Rust backend:", json);
        } catch (e) {
          console.error("Failed to send shortcuts to Rust:", e);
        }
      };

      // Send initial shortcuts to Rust immediately so they are registered instantly
      sendShortcutsToRust().catch(e => console.error("Failed to send initial shortcuts on boot:", e));

      // WebView2 Media Pipeline pre-warming is removed to prevent browser mic activation popups.

      // Pre-load store.json to eliminate disk read latency during transcriptions
      try {
        storeRef.current = await load("store.json");
        const speed = (await storeRef.current.get("dictationSpeed")) as string;
        const hideIcon = await storeRef.current.get("hideFocusedAppIcon");
        if (hideIcon !== undefined) {
          setHideFocusedAppIcon(!!hideIcon);
        }
        const showBar = await storeRef.current.get("showIkorBar");
        if (showBar !== undefined) {
          setShowIkorBar(!!showBar);
        }
        const contextAware = await storeRef.current.get("contextAwareness");
        if (contextAware !== undefined) {
          contextAwarenessRef.current = !!contextAware;
        }
        const systemAud = await storeRef.current.get("systemAudio");
        if (systemAud !== undefined) {
          systemAudioRef.current = !!systemAud;
        }
        const interactSounds = await storeRef.current.get("interactionSounds");
        if (interactSounds !== undefined) {
          interactionSoundsRef.current = !!interactSounds;
        } else {
          interactionSoundsRef.current = localStorage.getItem("sayikor_interaction_sounds") !== "false";
        }
        if (speed) {
          dictationSpeedRef.current = speed;
          console.log("Loaded dictation speed preset:", speed);
        }
        const offMode = await storeRef.current.get("offlineMode");
        if (offMode !== undefined) {
          offlineModeRef.current = !!offMode;
        } else {
          offlineModeRef.current = localStorage.getItem("sayikor_offline_mode") === "true";
        }
        // Load initial userWords into ref
        const storedWords = await storeRef.current.get("userWords");
        if (storedWords !== undefined && storedWords !== null) {
          userWordsRef.current = Number(storedWords);
          console.log("Loaded userWords into ref from store:", userWordsRef.current);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const val = session.user.user_metadata?.user_words_balance;
            if (typeof val === 'number') {
              userWordsRef.current = val;
              await storeRef.current.set("userWords", val);
              await storeRef.current.save();
              console.log("Loaded userWords into ref from Supabase:", userWordsRef.current);
            }
          }
        }

        // Auto-start Monnify MCP server if credentials exist
        const mApiKey = (await storeRef.current.get("monnify_api_key")) as string || "";
        const mSecretKey = (await storeRef.current.get("monnify_secret_key")) as string || "";
        const mContractCode = (await storeRef.current.get("monnify_contract_code")) as string || "";
        const mIsSandbox = (await storeRef.current.get("monnify_mode_sandbox")) as boolean ?? true;

        if (mApiKey && mSecretKey && mContractCode) {
          console.log("Auto-starting Monnify MCP server on startup...");
          invoke("start_mcp_server", {
            apiKey: mApiKey,
            secretKey: mSecretKey,
            contractCode: mContractCode,
            isSandbox: mIsSandbox
          }).catch(err => {
            console.error("Failed to auto-start Monnify MCP server on startup:", err);
          });
        }

        // Check for pending voice payment
        const pending = await storeRef.current.get("pendingVoicePayment") as { transactionReference: string; paymentReference: string; amount: number } | null;
        if (pending) {
          startPaymentPolling(pending);
        }
      } catch (e) {
        console.error("Failed to pre-load store.json:", e);
      }

      // Check & setup whisper assets silently in background on startup
      invoke("check_whisper_status")
        .then((ready) => {
          if (!ready) {
            console.log("[Offline] Whisper assets missing. Starting background download...");
            invoke("setup_whisper_assets")
              .then(() => console.log("[Offline] Whisper assets downloaded successfully."))
              .catch(err => console.error("[Offline] Failed to download Whisper assets:", err));
          } else {
            console.log("[Offline] Whisper assets are ready.");
          }
        })
        .catch(err => console.error("[Offline] Failed to check Whisper status:", err));

      if (!isMounted) return;

      try {
        const monitor = await currentMonitor();
        if (monitor) {
          const workSize = monitor.workArea.size;
          const workPos = monitor.workArea.position;
          const scaleFactor = monitor.scaleFactor;
          
          const logWorkWidth = workSize.width / scaleFactor;
          const logWorkHeight = workSize.height / scaleFactor;
          const logWorkX = workPos.x / scaleFactor;
          const logWorkY = workPos.y / scaleFactor;

          const x = logWorkX + (logWorkWidth - width) / 2;
          const y = logWorkY + logWorkHeight - height - 25; // Naturally anchors to bottom

          if (!isMounted) return;
          await win.setPosition(new LogicalPosition(x, y));
          await win.setAlwaysOnTop(true);
          setIsInitialized(true);

          localInterval = setInterval(async () => {
            if (isMounted && hasSessionRef.current) {
              const isVisible = showIkorBarRef.current || modeRef.current !== 'idle';
              if (isVisible) {
                await win.setAlwaysOnTop(true);
              }
            }
          }, 5000);
        } else {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error("Positioning Error:", err);
        setIsInitialized(true);
      }

      if (!isMounted) return;

      // ── Start Recording ────────────────────────────────────────────
      const startRecording = async (windowContext: any = null, isDictation: boolean = true) => {
        // Guard against duplicate starts (React StrictMode double-mount registers two listeners)
        if (recordingLockRef.current) {
          console.log("Recording already active, skipping duplicate start.");
          return;
        }
        recordingLockRef.current = true;

        // Ensure window is visible (only if hidden) without stealing active input focus
        if (!showIkorBarRef.current) {
          try {
            await win.show();
          } catch (e) {
            console.warn("Failed to show window on recording start:", e);
          }
        }

        // Check if words are exhausted (synchronous ref to prevent hotkey race condition)
        if (userWordsRef.current <= 0) {
          console.log("No words remaining. Blocking transcription.");
          await emit("exhausted-limit-triggered", "total-exhausted");
          recordingLockRef.current = false;
          setIsActive(false);
          return;
        }

        try {
          // 1. Reload dictationSpeed from store to ensure we have the latest value
          if (storeRef.current) {
            const speed = (await storeRef.current.get("dictationSpeed")) as string;
            if (speed) {
              dictationSpeedRef.current = speed;
              console.log("Current dictation speed mode:", speed);
            }
          }

          recordStartTimeRef.current = performance.now();

          if (systemAudioRef.current) {
            invoke("mute_system_audio").catch(err => console.error("Failed to mute system audio:", err));
          }

          // 2. Native recording handles volume emission for visualizer. Reset local volume.
          currentMicVolumeRef.current = 0;

          // 3. Start audio module
          let module;
          if (offlineModeRef.current || !navigator.onLine) {
            console.log("▶ Offline mode: Starting local whisper-rs pipeline...");
            module = new QueuedLocal();
          } else {
            console.log("▶ Fast mode: Starting secure native Rust pipeline...");
            module = new FastBatch();
          }
          activeModuleRef.current = module;

          let customTermsStr: string | null = null;
          let customShortcutsStr: string | null = null;
          if (storeRef.current) {
            const dict = await storeRef.current.get("sayikor_dictionary") as any[];
            if (dict && dict.length > 0) {
              customTermsStr = dict.map(d => `${d.term}${d.correction ? ` -> ${d.correction}` : ''}`).join(", ");
            }

            const shorts = await storeRef.current.get("sayikor_text_shortcuts") as any[];
            if (shorts && shorts.length > 0) {
              customShortcutsStr = shorts.map(s => `'${s.original}' -> '${s.replacement}'`).join("\n");
            }
          }
          
          const selectedMic = localStorage.getItem("sayikor_selected_mic_id") || "system-default";

          if (isScribeModeRef.current) {
            // Scribe mode: split pipeline for two-phase approval display
            await module.start(handleRawTranscription, windowContext, {
              splitPipeline: true,
              deviceId: selectedMic,
              isDictation: false,
              customTerms: customTermsStr,
              customShortcuts: customShortcutsStr,
              contextAwareness: contextAwarenessRef.current,
              onAsrComplete: async (rawText: string) => {
                // Phase 1: Show raw ASR text in approval panel immediately
                const phaseOneRevision: Revision = { command: rawText, response: "" };
                setIsTranscribing(false);
                isTranscribingRef.current = false;
                await emit("add-revision", phaseOneRevision);
              }
            });
          } else {
            await module.start(handleRawTranscription, windowContext, { 
              deviceId: selectedMic,
              isDictation,
              customTerms: customTermsStr,
              customShortcuts: customShortcutsStr,
              contextAwareness: contextAwarenessRef.current
            });
          }

        } catch (err) {
          console.error("Audio Error:", err);
          if (systemAudioRef.current) {
            invoke("unmute_system_audio").catch(e => console.error("Failed to unmute system audio:", e));
          }
          recordingLockRef.current = false;
          setIsActive(false);
          if (activeModuleRef.current) {
            Promise.resolve(activeModuleRef.current.stop()).catch(() => {});
            activeModuleRef.current = null;
          }
        }
      };

      // ── Stop Recording ─────────────────────────────────────────────
      const stopRecording = () => {
        if (systemAudioRef.current) {
          invoke("unmute_system_audio").catch(err => console.error("Failed to unmute system audio:", err));
        }
        recordingLockRef.current = false;
        isHandsFreeRef.current = false;
        setIsHandsFree(false);

        // Short press guard
        const elapsed = performance.now() - recordStartTimeRef.current;
        if (elapsed < 1200) {
          console.log("Short press guard: recording too short, skipping.");
          setIsTranscribing(false);
          // Still need to stop the module cleanly
          if (activeModuleRef.current) {
            // For QueuedLocal, stop() is async but we don't want its callback
            const mod = activeModuleRef.current;
            activeModuleRef.current = null;
            if (mod instanceof QueuedLocal) {
              mod.stop(); // will resolve but callback returns "" due to short audio
            } else {
              mod.stop();
            }
          }
          return;
        }

        // Stop the active audio module (it will call handleRawTranscription when done)
        if (activeModuleRef.current) {
          const mod = activeModuleRef.current;
          activeModuleRef.current = null;
          mod.stop();
        }
      };



      // Fetch initial active app from Rust
      try {
        const initialApp = await invoke("get_active_app") as any;
        if (initialApp) {
          console.log("Fetched initial active app:", initialApp);
          setActiveApp(initialApp);
        }
      } catch (e) {
        console.warn("Failed to get initial active app:", e);
      }

      // Listen for active app changes from Rust background thread
      const unlistenActiveApp = await listen<any>("active-app-changed", (event) => {
        console.log("Received active-app-changed event:", event.payload);
        setActiveApp(event.payload);
      });
      if (!isMounted) { unlistenActiveApp(); return; }
      unlisteners.push(unlistenActiveApp);

      // Listen for shortcut changes from the dashboard
      const unlistenShortcuts = await listen<string>("shortcuts-updated", async (event) => {
        console.log("Received shortcuts update from dashboard, forwarding to Rust...");
        // Also persist to store for next restart
        if (storeRef.current) {
          await storeRef.current.set("sayikor_shortcuts", event.payload);
          await storeRef.current.save();
        }
        await sendShortcutsToRust(event.payload);
      });
      if (!isMounted) { unlistenShortcuts(); return; }
      unlisteners.push(unlistenShortcuts);

      // Hands-free toggle state (tracked via ref for closure access)
      const handsFreeActiveRef = { current: false };

      // ── Listen for Rust-emitted shortcut pressed/released events ──
      const unlistenPressed = await listen<string>("shortcut-pressed", async (event) => {
        if (!hasSessionRef.current) return;
        const id = event.payload;
        console.log(`[Shortcut] Pressed: ${id}`);

        if (id === "dictation") {
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          if (!isActiveRef.current && interactionSoundsRef.current) playStartRecordingSound();
          setIsActive(true);
          setIsScribeMode(false);
          setIsMcpMode(false);
          if (!navigator.onLine && !offlineModeRef.current) {
            setShowOfflineAlert(true);
          }
          startRecording(null, true);
        } else if (id === "scribe") {
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          if (!isActiveRef.current && interactionSoundsRef.current) playStartRecordingSound();
          setIsActive(true);
          setIsScribeMode(true);
          setIsMcpMode(false);
          if (!navigator.onLine && !offlineModeRef.current) {
            setShowOfflineAlert(true);
          }
          startRecording(windowContextRef.current, false);
        } else if (id === "mcp") {
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          if (!isActiveRef.current && interactionSoundsRef.current) playStartRecordingSound();
          setIsActive(true);
          setIsScribeMode(false);
          setIsMcpMode(true);
          if (!navigator.onLine && !offlineModeRef.current) {
            setShowOfflineAlert(true);
          }
          startRecording(null, true);
        } else if (id === "handsFree") {
          if (stopTimeoutRef.current) {
            console.log("Cancelling pending stop timeout due to hands-free activation");
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          if (!handsFreeActiveRef.current) {
            // Start
            handsFreeActiveRef.current = true;
            setIsHandsFree(true);
            isHandsFreeRef.current = true;
            setIsScribeMode(false);
            if (!isActiveRef.current) {
              if (interactionSoundsRef.current) playStartRecordingSound();
              setIsActive(true);
              if (!navigator.onLine && !offlineModeRef.current) {
                setShowOfflineAlert(true);
              }
              startRecording(null, true);
            } else {
              console.log("Transitioning active recording to hands-free mode.");
            }
          } else {
            // Stop
            handsFreeActiveRef.current = false;
            setIsHandsFree(false);
            isHandsFreeRef.current = false;
            if (isActiveRef.current && interactionSoundsRef.current) playStopRecordingSound();
            setIsActive(false);
            setIsTranscribing(true);
            if (!navigator.onLine) {
              setShowOfflineAlert(false);
            }
            stopRecording();
          }
        }
      });
      if (!isMounted) { unlistenPressed(); return; }
      unlisteners.push(unlistenPressed);

      const unlistenReleased = await listen<string>("shortcut-released", (event) => {
        if (!hasSessionRef.current) return;
        const id = event.payload;
        console.log(`[Shortcut] Released: ${id}`);

        if (id === "dictation" || id === "scribe" || id === "mcp") {
          // Hold-to-speak: release stops recording after a brief delay to allow transition to hands-free
          if (isActiveRef.current) {
            if (isHandsFreeRef.current) {
              console.log("Ignoring release of dictation/scribe because hands-free is active.");
              return;
            }

            if (stopTimeoutRef.current) {
              clearTimeout(stopTimeoutRef.current);
            }

            stopTimeoutRef.current = setTimeout(() => {
              stopTimeoutRef.current = null;
              // Check again inside timeout because hands-free might have been activated
              if (isActiveRef.current) {
                if (isHandsFreeRef.current) {
                  console.log("Ignoring delayed release of dictation/scribe because hands-free became active.");
                  return;
                }
                if (interactionSoundsRef.current) playStopRecordingSound();
                setIsActive(false);
                setIsTranscribing(true);
                if (!navigator.onLine) {
                  setShowOfflineAlert(false);
                }
                stopRecording();
              }
            }, 300);
          }
        }
        // handsFree is toggle-based, release is ignored
      });
      if (!isMounted) { unlistenReleased(); return; }
      unlisteners.push(unlistenReleased);

      const unlistenApprovalDone = await listen("approval-done", async () => {
         setIsScribeMode(false);
         windowContextRef.current = null;
         scribeGroupIdRef.current = null;
         changeMode('idle');
      });
      if (!isMounted) { unlistenApprovalDone(); return; }
      unlisteners.push(unlistenApprovalDone);

      const unlistenApprovalCancelled = await listen("approval-cancelled", async () => {
         setIsScribeMode(false);
         windowContextRef.current = null;
         scribeGroupIdRef.current = null;
         changeMode('idle');
      });
      if (!isMounted) { unlistenApprovalCancelled(); return; }
      unlisteners.push(unlistenApprovalCancelled);

      const unlistenApprovalClosed = await listen("approval-closed", async () => {
         setIsScribeMode(false);
         windowContextRef.current = null;
         scribeGroupIdRef.current = null;
         changeMode('idle');
      });
      if (!isMounted) { unlistenApprovalClosed(); return; }
      unlisteners.push(unlistenApprovalClosed);

      const unlistenVisibleRevisionChanged = await listen<string>("visible-revision-changed", (event) => {
        if (isScribeModeRef.current) {
          windowContextRef.current = event.payload;
          console.log("Updated context window from visible approval panel text.");
        }
      });
      if (!isMounted) { unlistenVisibleRevisionChanged(); return; }
      unlisteners.push(unlistenVisibleRevisionChanged);

      const unlistenContextAwareness = await listen<boolean>("context-awareness-changed", (event) => {
        contextAwarenessRef.current = event.payload;
        console.log("Updated contextAwareness ref in App.tsx:", event.payload);
      });
      if (!isMounted) { unlistenContextAwareness(); return; }
      unlisteners.push(unlistenContextAwareness);

      const unlistenSystemAudio = await listen<boolean>("system-audio-changed", (event) => {
        systemAudioRef.current = event.payload;
        console.log("Updated systemAudio ref in App.tsx:", event.payload);
      });
      if (!isMounted) { unlistenSystemAudio(); return; }
      unlisteners.push(unlistenSystemAudio);

      const unlistenInteractionSounds = await listen<boolean>("interaction-sounds-changed", (event) => {
        interactionSoundsRef.current = event.payload;
        console.log("Updated interactionSounds ref in App.tsx:", event.payload);
      });
      if (!isMounted) { unlistenInteractionSounds(); return; }
      unlisteners.push(unlistenInteractionSounds);

      const unlistenMicVolumeUpdate = await listen<number>("mic_volume_update", (event) => {
        currentMicVolumeRef.current = event.payload;
      });
      if (!isMounted) { unlistenMicVolumeUpdate(); return; }
      unlisteners.push(unlistenMicVolumeUpdate);

      const unlistenOfflineMode = await listen<boolean>("offline-mode-changed", (event) => {
        offlineModeRef.current = event.payload;
        console.log("Updated offlineMode ref in App.tsx:", event.payload);
      });
      if (!isMounted) { unlistenOfflineMode(); return; }
      unlisteners.push(unlistenOfflineMode);

      const unlistenHideIcon = await listen<boolean>("hide-focused-app-icon-changed", (event) => {
        setHideFocusedAppIcon(event.payload);
      });
      if (!isMounted) { unlistenHideIcon(); return; }
      unlisteners.push(unlistenHideIcon);

      const unlistenShowIkorBar = await listen<boolean>("show-ikor-bar-changed", (event) => {
        setShowIkorBar(event.payload);
      });
      if (!isMounted) { unlistenShowIkorBar(); return; }
      unlisteners.push(unlistenShowIkorBar);

      const unlistenMouseActive = await listen("mouse-active", () => {
        setIsMouseActive(true);
      });
      if (!isMounted) { unlistenMouseActive(); return; }
      unlisteners.push(unlistenMouseActive);

      const unlistenMouseIdle = await listen("mouse-idle", () => {
        setIsMouseActive(false);
      });
      if (!isMounted) { unlistenMouseIdle(); return; }
      unlisteners.push(unlistenMouseIdle);

      // Listen for user words balance updates from the dashboard
      const unlistenUserWords = await listen<number>("user-words-updated", (event) => {
        if (typeof event.payload === 'number') {
          userWordsRef.current = event.payload;
          console.log("Updated userWords ref in App.tsx:", userWordsRef.current);
        }
      });
      if (!isMounted) { unlistenUserWords(); return; }
      unlisteners.push(unlistenUserWords);

      // Listen for voice payments initiated by ApprovalPanel
      const unlistenVoicePaymentInitiated = await listen<any>("voice-payment-initiated", (event) => {
        const pending = event.payload;
        if (pending) {
          startPaymentPolling(pending);
        }
      });
      if (!isMounted) { unlistenVoicePaymentInitiated(); return; }
      unlisteners.push(unlistenVoicePaymentInitiated);

      // ── Visualizer Update Loop ─────────────────────────────────────
      const update = () => {
        if (!isMounted) return;

        if (isTranscribingRef.current) {
          changeMode('transcribing');
          setAudioData(SILENCE_ARRAY);
        } else if (!isActiveRef.current) {
          changeMode(isHoveredRef.current ? 'hover_preview' : 'idle');
          setAudioData(SILENCE_ARRAY);
          if (showOfflineAlertRef.current) {
            setShowOfflineAlert(false);
          }
        } else if (isActiveRef.current) {
          changeMode('active_speaking');
          const center = Math.floor(WAVE_LINES / 2);
          const volumes = Array.from({ length: WAVE_LINES }).map((_, i) => {
            const dist = Math.abs(i - center);
            const cleanVal = currentMicVolumeRef.current;
            const processedVal = Math.min(10, (cleanVal / 100) * 12);

            const multiplier = 1 - (dist * 0.22);
            return Math.max(SILENCE_HEIGHT, processedVal * multiplier);
          });
          setAudioData(volumes);
        }
        localAnimationFrame = requestAnimationFrame(update);
        animationFrameRef.current = localAnimationFrame;
      };

      update();
    };

    init();

    return () => {
      isMounted = false;
      if (localInterval) clearInterval(localInterval);
      unlisteners.forEach(fn => fn());
      if (localAnimationFrame) cancelAnimationFrame(localAnimationFrame);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (activeModuleRef.current) {
        Promise.resolve(activeModuleRef.current.stop()).catch(() => {});
        activeModuleRef.current = null;
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, []);

  // ── Normal Bubble UI ────────────────────────────────────────────────
  return (
    <div 
      className="flex items-end pb-1 justify-center w-full h-full bg-transparent relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-fit h-fit">
        <AnimatePresence>
          {showOfflineAlert && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="absolute left-1/2 -translate-x-1/2 -top-[37px] px-3 py-0.5 bg-[#1a0a0a]/90 backdrop-blur-md text-[#f3a9a9] text-[9px] font-bold rounded-full shadow-lg border border-red-500/30 whitespace-nowrap z-30 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>No internet connection</span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          animate={{ 
            width: (mode === 'idle') 
              ? "40px" 
              : (mode === 'transcribing' 
                ? "80px" 
                : (hideFocusedAppIcon 
                  ? (isHandsFree ? "98px" : "72px") 
                  : (isHandsFree ? "112px" : "88px")
                )
              ),
            height: (mode === 'idle') ? "10px" : (mode === 'transcribing' ? "20px" : "30px"),
            backgroundColor: (mode === 'idle' && isMouseActive) ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 1)",
            borderColor: (mode === 'idle' || mode === 'transcribing')
              ? (isMouseActive ? "rgba(168, 85, 247, 0.05)" : "rgba(168, 85, 247, 0.2)")
              : "rgba(255, 255, 255, 0.6)",
            borderWidth: "1.2px",
            paddingLeft: (mode === 'idle') ? "0px" : (isHandsFree ? "4px" : "6px"),
            paddingRight: (mode === 'idle') ? "0px" : (isHandsFree ? "4px" : "6px"),
            opacity: 1,
            scale: 1,
          }}
          transition={{ 
            type: "spring", 
            stiffness: 350, 
            damping: 28 
          }}
          className={`flex items-center justify-center gap-1.2 rounded-full border overflow-hidden ${(mode === 'idle') ? 'animate-iridescent' : mode === 'transcribing' ? 'animate-iridescent-inset' : ''}`}
        >
          <AnimatePresence>
            {mode !== 'idle' && (
              <motion.div
                key="visualizer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="flex items-center justify-center gap-1.5 w-fit"
              >
                {/* Active App Icon Container */}
                {!hideFocusedAppIcon && mode !== 'transcribing' && (
                <motion.div
                  key={activeApp.name}
                  initial={{ scale: 0.5, opacity: 0, x: -4 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.5, opacity: 0, x: -4 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 overflow-hidden"
                  style={{
                    filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.15))"
                  }}
                  title={`Active app: ${activeApp.name}`}
                >
                  <AppIcon name={activeApp.name} iconUrl={activeApp.icon} exe={activeApp.exe} title={activeApp.title} />
                </motion.div>
                )}

                <div className="flex items-center justify-center gap-1">
                  {audioData.map((height, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: height,
                        opacity: mode === 'active_speaking' ? 1 : 0.3,
                        backgroundColor: mode === 'transcribing' 
                          ? "rgba(168, 85, 247, 1)" 
                          : "#ffffff"
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 18,
                        mass: 0.5,
                        delay: mode === 'active_speaking' ? i * 0.015 : 0
                      }}
                      className={`w-[3px] bg-white rounded-full flex-shrink-0 ${mode === 'active_speaking' ? 'animate-wave' : ''}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>

                {isHandsFree && (
                  <motion.svg
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    viewBox="0 0 14 14"
                    className="w-3.5 h-3.5 text-white ml-1 flex-shrink-0"
                    fill="currentColor"
                  >
                    <path
                      d="M4.5 5.5V3.75a2.5 2.5 0 0 1 5 0V5.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <rect
                      x="2.5"
                      y="5"
                      width="9"
                      height="6.5"
                      rx="1.5"
                      fill="currentColor"
                    />
                  </motion.svg>
                )}

                {mode === 'transcribing' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      borderColor: isMouseActive ? "rgba(168, 85, 247, 0.4)" : "rgba(168, 85, 247, 0.6)",
                      borderTopColor: "transparent"
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="w-3 h-3 border-2 rounded-full animate-spin-slow flex-shrink-0"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <AnimatePresence>
          {isScribeMode && mode === 'active_speaking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="absolute z-20 flex items-center justify-center rounded-full bg-black animate-iridescent-color"
              style={{
                top: '-14.5px', // Moved 2px downward
                right: '-27px', // Positioned 2px to the right of the bubble
                width: "25px",
                height: "25px",
              }}
            >
               <Wand2 className="w-4 h-4" />
               <svg viewBox="0 0 8 8" className="sparkle sparkle-1 w-1.5 h-1.5">
                 <path d="M4 0 C4 2.2 5.8 4 8 4 C5.8 4 4 5.8 4 8 C4 5.8 2.2 4 0 4 C2.2 4 4 2.2 4 0 Z" fill="currentColor" />
               </svg>
               <svg viewBox="0 0 8 8" className="sparkle sparkle-2 w-2 h-2">
                 <path d="M4 0 C4 2.2 5.8 4 8 4 C5.8 4 4 5.8 4 8 C4 5.8 2.2 4 0 4 C2.2 4 4 2.2 4 0 Z" fill="currentColor" />
               </svg>
               <svg viewBox="0 0 8 8" className="sparkle sparkle-3 w-1.5 h-1.5">
                 <path d="M4 0 C4 2.2 5.8 4 8 4 C5.8 4 4 5.8 4 8 C4 5.8 2.2 4 0 4 C2.2 4 4 2.2 4 0 Z" fill="currentColor" />
               </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
