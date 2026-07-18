import { motion, AnimatePresence } from "framer-motion";
import { toPng } from 'html-to-image';
import { 
  Home, Book, Settings, PanelLeft, CircleUser, Minus, X,
  AlertCircle, RefreshCw, Share, Calendar, Clock, Activity,
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, MoreHorizontal, Zap, Copy, Trash2, Edit2,
  TrendingUp, Wallet, Type, Mail, MessageSquare, MessageCircle, LayoutGrid, Plus, Flag, Loader2
} from "lucide-react";
import React, { useState, useEffect, useMemo, useRef } from "react";
import EditTermModal from "./EditTermModal";
import AddTermModal from "./AddTermModal";
import EditShortcutModal from "./EditShortcutModal";
import AddShortcutModal from "./AddShortcutModal";
import SettingsModal from "./SettingsModal";
import SignOutModal from "./SignOutModal";
import Tooltip from "./Tooltip";
import DeleteModal from "./DeleteModal";
import TopUpModal from "./TopUpModal";
import UpgradeModal from "./UpgradeModal";
import ExhaustedModal from "./ExhaustedModal";
import ReportTranscriptModal from "./ReportTranscriptModal";


const videoThumb1 = "/Sayikor_video_thumbnail_1_1779665131482.png";
const videoThumb2 = "/Sayikor_video_thumbnail_2_1779665147376.jpg";
const videoThumb3 = "/Sayikor_video_thumbnail_3_1779665162763.jpg";

import { formatNumber, formatDays, formatTimeParts } from "../../lib/utils";

import { listen, emit } from '@tauri-apps/api/event';
import { load } from '@tauri-apps/plugin-store';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { supabase } from "../../lib/supabaseClient";

const isTauri = !!(window as any).__TAURI_INTERNALS__;

interface DashboardProps {
  onBack: (redirectToLogin?: boolean) => void;
  initialUser?: {
    email: string;
    firstName: string;
    lastName: string;
    totalWords?: number;
    transcriptionDates?: string[];
    sayikor_dictionary?: any[];
    userWordsBalance?: number;
    trialStartDate?: string;
    sayikor_text_shortcuts?: any[];
    wordConsumptionHistory?: any[];
  };
}

const WaveformPattern = ({ isDark }: { isDark: boolean }) => {
  const fillColor = isDark ? "#ffffff" : "#000000";
  
  // A beautiful soundwave set of heights to mimic audio transcription
  const barHeights = [
    25, 40, 30, 50, 35, 60, 45, 70, 40, 30, 45, 60, 75, 55, 40, 65, 85, 110, 90, 70,
    55, 80, 100, 120, 140, 115, 85, 60, 75, 90, 115, 130, 105, 80, 55, 45, 60, 70, 85,
    65, 50, 40, 55, 70, 50, 35, 45, 30, 20, 35, 40, 25, 45, 55, 40, 30, 20, 10
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes speakWave {
          0% {
            transform: scaleY(0.25);
          }
          50% {
            transform: scaleY(1.15);
          }
          100% {
            transform: scaleY(0.4);
          }
        }
        .speaking-bar {
          transform-box: fill-box;
          transform-origin: center;
          animation-name: speakWave;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        /* Pause the animation on hover on parent share-card-container */
        .share-card-container:hover .speaking-bar {
          animation-play-state: paused;
        }
      `}</style>
      <svg
        className="w-[105%] h-5/6 opacity-5 px-2"
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {barHeights.map((height, index) => {
          const width = 6;
          const gap = 4;
          const x = index * (width + gap) + 12;
          const y = 100 - height / 2;
          
          // Staggered durations and negative delays for natural speaking animation (speed reduced further by 20%)
          const duration = (0.6 + (index % 5) * 0.15) * 1.5625; // approx 0.94s to 1.88s
          const delay = (-(index % 7) * 0.18) * 1.5625; // scaled delays to maintain offset coordination

          return (
            <rect
              key={index}
              className="speaking-bar"
              x={x}
              y={y}
              width={width}
              height={height}
              rx={width / 2}
              fill={fillColor}
              style={{
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

const ShareCard = ({ color, metrics, isPreview = false, firstName, lastName }: { color: string, metrics: any, isPreview?: boolean, firstName: string, lastName: string }) => {
  const isDark = color === 'bg-[#1a1a1a]' || color === 'bg-red-500' || color === 'bg-blue-500' || color === 'bg-green-500';
  return (
    <div className={`share-card-container ${color} rounded-[32px] p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col relative overflow-hidden w-full h-full min-h-[250px] transition-colors duration-300`}>
      {/* Background Waveform Pattern */}
      <WaveformPattern isDark={isDark} />

      <div className="absolute top-8 right-8 flex items-center z-10">
        <img 
          src="/Png-black-text.png" 
          alt="Sayikor Logo" 
          className="h-8 object-contain shrink-0" 
          style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
        />
      </div>
      
      <div className={`mt-auto mb-8 relative z-10 ${isDark ? 'text-white' : 'text-black'}`}>
        <h3 className="text-3xl font-bold">{firstName} {lastName}</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4 relative z-10">
        <div className={`col-span-1 p-4 rounded-2xl border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`} style={{ borderWidth: '1.5px' }}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Words</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{formatNumber(metrics.totalWords)}</span>
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`} style={{ borderWidth: '1.5px' }}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Saved</p>
          <div className="flex items-end gap-1 flex-wrap">
            {(() => {
              const { value, unit } = formatTimeParts(metrics.timeSavedMinutes);
              return (
                <>
                  <span className="text-lg sm:text-xl font-bold leading-none">{value}</span>
                  {unit && <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">{unit}</span>}
                </>
              );
            })()}
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`} style={{ borderWidth: '1.5px' }}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Streak</p>
          <div className="flex items-end gap-1 flex-wrap">
            {(() => {
              const part = formatDays(metrics.streak).split(' ');
              return (
                <>
                  <span className="text-lg sm:text-xl font-bold leading-none">{part[0]}</span>
                  <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">{part.slice(1).join(' ')}</span>
                </>
              );
            })()}
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10'}`} style={{ borderWidth: '1.5px' }}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Speed</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{metrics.avgWpm}</span>
            <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">wpm</span>
          </div>
        </div>
      </div>
      
      {isPreview && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
          <div className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
            <Share size={16} /> Share Progress
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}

const CustomSelect = ({ value, onChange, options, disabled = false }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full mt-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left border h-[38px] ${
          disabled
            ? "bg-gray-100 border-black/5 text-gray-400 cursor-not-allowed"
            : "bg-gray-50 border-black/5 text-gray-700 hover:bg-gray-100/70 focus:outline-none focus:ring-1 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
        }`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ml-2 ${
            disabled ? "text-gray-300" : isOpen ? "transform rotate-180 text-red-500" : "text-gray-400"
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-black/5 shadow-lg rounded-xl py-1 z-30 max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-red-50/70 text-red-500 font-extrabold"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                }`}
              >
                <span className="truncate">{option}</span>
                {isSelected && <Check size={12} className="text-red-500 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function Dashboard(_props: DashboardProps) {
  const [activeSection, setActiveSection] = useState("Home");

  // Load dictate shortcut dynamically
  const [dictateShortcut, setDictateShortcut] = useState("Ctrl + Alt");

  useEffect(() => {
    const updateShortcut = () => {
      const saved = localStorage.getItem("sayikor_shortcuts");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const dictation = parsed.find((item: any) => item.id === "dictation");
            if (dictation && dictation.keys && dictation.keys.length > 0) {
              const formatted = dictation.keys
                .map((k: string) => k.replace("Left ", "").replace("Right ", ""))
                .join(" + ");
              setDictateShortcut(formatted);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      // Out of the box default matches ["Left Ctrl", "Left Alt"] from ShortsModal
      setDictateShortcut("Ctrl + Alt");
    };

    updateShortcut();
    window.addEventListener("sayikor_shortcuts_updated", updateShortcut);
    window.addEventListener("storage", updateShortcut);
    return () => {
      window.removeEventListener("sayikor_shortcuts_updated", updateShortcut);
      window.removeEventListener("storage", updateShortcut);
    };
  }, []);
  const [profileFirstName, setProfileFirstName] = useState(_props.initialUser?.firstName || "User");
  const [profileLastName, setProfileLastName] = useState(_props.initialUser?.lastName || "");
  const [profileEmail, setProfileEmail] = useState(_props.initialUser?.email || "user@example.com");
  const [currentUserPlan, setCurrentUserPlan] = useState<string>('Free Trial');
  const [userWords, setUserWords] = useState(() => {
    return typeof _props.initialUser?.userWordsBalance === 'number' ? _props.initialUser.userWordsBalance : 900;
  });

  const maxWordsCapacity = useMemo(() => {
    if (currentUserPlan === "Ikor Pro") return 120000;
    if (currentUserPlan === "Ikor Plus") return 40000;
    return 900;
  }, [currentUserPlan]);

  const wordPercentage = Math.max(0, Math.min(100, (userWords / maxWordsCapacity) * 100));
  const [proPlanDaysLeft, setProPlanDaysLeft] = useState<number | null>(30); // 30-day Free Trial of Ikor Plus
  
  // Persistent billing & subscriptions transaction history
  const [billingTransactions, setBillingTransactions] = useState<any[]>(() => {
    const cached = localStorage.getItem("ikor_billing_transactions2");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "TXN-30193",
        date: "2026-06-02 10:26 AM",
        description: "Ikor Plus 30-Day Free Trial Activated",
        words: "900 words",
        amount: "₦0.00",
        status: "Successful",
        method: "System Promotion"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("ikor_billing_transactions2", JSON.stringify(billingTransactions));
  }, [billingTransactions]);

  // Daily limit & word exhaustion tracking
  const [isExhaustedModalOpen, setIsExhaustedModalOpen] = useState(false);
  const [exhaustedReason] = useState<"daily-limit" | "total-exhausted">("daily-limit");


  const [activeDictTab, setActiveDictTab] = useState<"Terms" | "Shortcuts">("Terms");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSection]);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: any;
    const checkMaximized = async () => {
      const win = getCurrentWindow();
      const max = await win.isMaximized();
      setIsMaximized(max);
    };
    checkMaximized();
    
    getCurrentWindow().onResized(() => {
      checkMaximized();
    }).then(fn => { unlisten = fn; });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [actionFeedback, setActionFeedback] = useState<{id: string; message: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<{term: string, correction?: string}[]>(() => {
    if (_props.initialUser?.sayikor_dictionary && Array.isArray(_props.initialUser.sayikor_dictionary) && _props.initialUser.sayikor_dictionary.length > 0) {
      return _props.initialUser.sayikor_dictionary;
    }
    return [];
  });
  const [shortcuts, setShortcuts] = useState<{original: string, replacement: string}[]>(() => {
    if (_props.initialUser?.sayikor_text_shortcuts && Array.isArray(_props.initialUser.sayikor_text_shortcuts) && _props.initialUser.sayikor_text_shortcuts.length > 0) {
      return _props.initialUser.sayikor_text_shortcuts;
    }
    return [];
  });
  const [wordConsumptionHistory, setWordConsumptionHistory] = useState<any[]>(() => {
    if (_props.initialUser?.wordConsumptionHistory && Array.isArray(_props.initialUser.wordConsumptionHistory)) {
      return _props.initialUser.wordConsumptionHistory;
    }
    return [];
  });
  const [isAddTermModalOpen, setIsAddTermModalOpen] = useState(false);
  const [isEditTermModalOpen, setIsEditTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<{index: number; term: string; correction?: string} | null>(null);
  const [isAddShortcutModalOpen, setIsAddShortcutModalOpen] = useState(false);
  const [isEditShortcutModalOpen, setIsEditShortcutModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<{index: number; original: string; replacement: string} | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const store = await load("store.json");
        
        let finalDict = dictionary;
        const storedDict = await store.get("sayikor_dictionary");
        if (_props.initialUser?.sayikor_dictionary && Array.isArray(_props.initialUser.sayikor_dictionary) && _props.initialUser.sayikor_dictionary.length > 0) {
          finalDict = _props.initialUser.sayikor_dictionary;
        } else if (storedDict && Array.isArray(storedDict) && storedDict.length > 0) {
          finalDict = storedDict as any;
          setDictionary(finalDict);
        }
        await store.set("sayikor_dictionary", finalDict);
        
        let finalShortcuts = shortcuts;
        const storedShortcuts = await store.get("sayikor_text_shortcuts");
        if (_props.initialUser?.sayikor_text_shortcuts && Array.isArray(_props.initialUser.sayikor_text_shortcuts) && _props.initialUser.sayikor_text_shortcuts.length > 0) {
          finalShortcuts = _props.initialUser.sayikor_text_shortcuts;
        } else if (storedShortcuts && Array.isArray(storedShortcuts) && storedShortcuts.length > 0) {
          finalShortcuts = storedShortcuts as any;
          setShortcuts(finalShortcuts);
        }
        await store.set("sayikor_text_shortcuts", finalShortcuts);
        
        let finalConsumption = wordConsumptionHistory;
        const storedConsumption = await store.get("wordConsumptionHistory");
        if (_props.initialUser?.wordConsumptionHistory && Array.isArray(_props.initialUser.wordConsumptionHistory) && _props.initialUser.wordConsumptionHistory.length > 0) {
          finalConsumption = _props.initialUser.wordConsumptionHistory;
          setWordConsumptionHistory(finalConsumption);
        } else if (storedConsumption && Array.isArray(storedConsumption) && storedConsumption.length > 0) {
          finalConsumption = storedConsumption as any;
          setWordConsumptionHistory(finalConsumption);
        }
        await store.set("wordConsumptionHistory", finalConsumption);
        
        const storedWords = await store.get("userWords");
        if (storedWords !== undefined && storedWords !== null) {
          setUserWords(Number(storedWords));
        } else if (typeof _props.initialUser?.userWordsBalance === 'number') {
          setUserWords(_props.initialUser.userWordsBalance);
          await store.set("userWords", _props.initialUser.userWordsBalance);
        }

        const storedSpeed = await store.get("dictationSpeed");
        if (storedSpeed) {
          setDictationSpeed(String(storedSpeed));
        }

        await store.save();
      } catch (e) {
        console.warn("Failed to load dictionary/shortcuts/consumption", e);
      }
    })();
  }, []);

  const isFirstRenderDict = useRef(true);
  useEffect(() => {
    if (isFirstRenderDict.current) {
      isFirstRenderDict.current = false;
      return;
    }
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("sayikor_dictionary", dictionary);
        await store.save();
        
        if (navigator.onLine) {
          await supabase.auth.updateUser({
            data: {
              sayikor_dictionary: dictionary
            }
          });
        }
      } catch (e) {
        console.error("Failed to sync dictionary to Supabase:", e);
      }
    })();
  }, [dictionary]);

  const isFirstRenderShortcuts = useRef(true);
  useEffect(() => {
    if (isFirstRenderShortcuts.current) {
      isFirstRenderShortcuts.current = false;
      return;
    }
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("sayikor_text_shortcuts", shortcuts);
        await store.save();
        
        if (navigator.onLine) {
          await supabase.auth.updateUser({
            data: {
              sayikor_text_shortcuts: shortcuts
            }
          });
        }
      } catch (e) {
        console.error("Failed to sync text shortcuts to Supabase:", e);
      }
    })();
  }, [shortcuts]);

  // Load saved transcript history and listen for new ones
  useEffect(() => {
    let isMounted = true;
    let unlistenTranscription: (() => void) | undefined;

    const initHistory = async () => {
      try {
        const store = await load("store.json");
        const history = await store.get<any[]>('transcriptHistory');
        if (isMounted && history) {
          const normalizedHistory = history.map((item, index) => ({
            ...item,
            id: item.id || `loaded-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }));
          setTranscriptHistory(normalizedHistory);
        }
      } catch (e) {
        console.warn("Failed to load transcriptHistory:", e);
      }

      try {
        const unlisten = await listen<any[]>("new-transcription", (event) => {
          if (isMounted && event.payload) {
            const normalized = event.payload.map((item, index) => ({
              ...item,
              id: item.id || `new-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));
            setTranscriptHistory(normalized);
          }
        });
        unlistenTranscription = unlisten;
      } catch (e) {
        console.warn("Failed to listen for new-transcription:", e);
      }
    };

    initHistory();

    return () => {
      isMounted = false;
      if (unlistenTranscription) {
        unlistenTranscription();
      }
    };
  }, []);

  // --- Report Transcript Feedback states ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);

  // --- Re-transcription states ---
  const [reTranscribingMap, setReTranscribingMap] = useState<Record<string, boolean>>({});



  // --- Style Guide State ---
  const [styleGuideTab, setStyleGuideTab] = useState<"Email" | "Work Messages" | "Casual Messages" | "Other">("Email");
  const [selectedTones, setSelectedTones] = useState<Record<string, string>>({
    "Email": "Excited",
    "Work Messages": "Formal",
    "Casual Messages": "Casual",
    "Other": "Formal"
  });
  const [selectedLengths, setSelectedLengths] = useState<Record<string, string>>({
    "Email": "Natural",
    "Work Messages": "Natural",
    "Casual Messages": "Natural",
    "Other": "Natural"
  });
  const [styleHabits, setStyleHabits] = useState<Record<string, string[]>>({
    "Email": ["sign off with 'Thanks, Allan'"],
    "Work Messages": ["break lines more often", "avoid filler words"],
    "Casual Messages": ["don't use emojis"],
    "Other": ["keep notes formatted with bullet points"]
  });
  const [habitInput, setHabitInput] = useState("");

  const [transcriptHistory, setTranscriptHistory] = useState<{
    id: string;
    time: string;
    content: string;
    date?: string;
    type?: string;
    mode?: string;
    duration?: string;
    words?: number | null;
    cost?: number;
    status?: string;
    highlightedChars?: number;
    isQuickMessage?: boolean;
    wordsSpoken?: number;
    groupId?: string;
    command?: string;
  }[]>([]);

  const [cumulativeWords, setCumulativeWords] = useState<number>(_props.initialUser?.totalWords || 0);
  const [transcriptionDates, setTranscriptionDates] = useState<string[]>(_props.initialUser?.transcriptionDates || []);

  useEffect(() => {
    let isMounted = true;
    let unlistenMetrics: (() => void) | undefined;
    
    const setupMetricsListener = async () => {
      try {
        const unlisten = await listen<any>("cumulative-metrics-updated", (event) => {
          if (isMounted && event.payload) {
            if (typeof event.payload.totalWords === 'number') {
              setCumulativeWords(event.payload.totalWords);
            }
            if (Array.isArray(event.payload.transcriptionDates)) {
              setTranscriptionDates(event.payload.transcriptionDates);
            }
          }
        });
        unlistenMetrics = unlisten;
      } catch (e) {
        console.error("Failed to listen for cumulative-metrics-updated:", e);
      }
    };
    
    let unlistenWords: (() => void) | undefined;
    let unlistenExhausted: (() => void) | undefined;
    let unlistenConsumption: (() => void) | undefined;

    const setupWordsListener = async () => {
      try {
        const unlisten = await listen<number>("user-words-updated", (event) => {
          if (isMounted && typeof event.payload === 'number') {
            setUserWords(event.payload);
          }
        });
        unlistenWords = unlisten;
      } catch (e) {
        console.error("Failed to listen for user-words-updated:", e);
      }
    };

    const setupExhaustedListener = async () => {
      try {
        const unlisten = await listen("exhausted-limit-triggered", () => {
          if (isMounted) {
            setIsExhaustedModalOpen(true);
            getCurrentWindow().show().then(() => {
              getCurrentWindow().setFocus().catch(() => {});
            }).catch(() => {});
          }
        });
        unlistenExhausted = unlisten;
      } catch (e) {
        console.error("Failed to listen for exhausted-limit-triggered:", e);
      }
    };

    const setupConsumptionListener = async () => {
      try {
        const unlisten = await listen<any[]>("word-consumption-history-updated", (event) => {
          if (isMounted && Array.isArray(event.payload)) {
            setWordConsumptionHistory(event.payload);
          }
        });
        unlistenConsumption = unlisten;
      } catch (e) {
        console.error("Failed to listen for word-consumption-history-updated:", e);
      }
    };

    let unlistenVoicePayment: (() => void) | undefined;
    const setupVoicePaymentListener = async () => {
      try {
        const unlisten = await listen<any>("voice-payment-success", (event) => {
          if (isMounted && event.payload) {
            const { amount, wordsAdded, paymentReference } = event.payload;
            
            // Format dynamic date
            const dateStr = new Date().toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            }).replace(",", ""); // e.g. "2026-07-18 01:23 PM"

            const newTxn = {
              id: paymentReference || `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
              date: dateStr,
              description: `Voice Top-Up (${wordsAdded.toLocaleString()} words)`,
              words: `+${wordsAdded.toLocaleString()} words`,
              amount: `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              status: "Successful",
              method: "Monnify (Agentic Checkout)"
            };

            setBillingTransactions(prev => [newTxn, ...prev]);
          }
        });
        unlistenVoicePayment = unlisten;
      } catch (e) {
        console.error("Failed to listen for voice-payment-success:", e);
      }
    };

    setupMetricsListener();
    setupWordsListener();
    setupExhaustedListener();
    setupConsumptionListener();
    setupVoicePaymentListener();

    return () => {
      isMounted = false;
      if (unlistenMetrics) unlistenMetrics();
      if (unlistenWords) unlistenWords();
      if (unlistenExhausted) unlistenExhausted();
      if (unlistenConsumption) unlistenConsumption();
      if (unlistenVoicePayment) unlistenVoicePayment();
    };
  }, []);

  const isFirstRenderUserWords = useRef(true);
  // 30-day trial reload checker and userWords storage sync
  useEffect(() => {
    if (isFirstRenderUserWords.current) {
      isFirstRenderUserWords.current = false;
      return;
    }
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("userWords", userWords);
        await store.save();
      } catch (e) {
        console.error("Failed to save userWords to store:", e);
      }
    })();
  }, [userWords]);

  useEffect(() => {
    (async () => {
      // If we are offline, don't attempt to connect to Supabase
      if (!navigator.onLine) {
        if (_props.initialUser?.trialStartDate) {
          const startDate = new Date(_props.initialUser.trialStartDate);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const daysLeft = Math.max(0, 30 - diffDays);
          setProPlanDaysLeft(daysLeft);
        }
        return;
      }

      try {
        // Use a race to prevent hanging if Supabase is paused or unresponsive
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error("Supabase timeout")), 4000)
        );

        const result = await Promise.race([userPromise, timeoutPromise]) as any;
        const user = result?.data?.user;

        if (user) {
          const metadata = user.user_metadata || {};
          let trialStart = metadata.trial_start_date;
          if (!trialStart) {
            trialStart = new Date().toISOString();
            await supabase.auth.updateUser({
              data: {
                ...metadata,
                trial_start_date: trialStart
              }
            });
          }
          
          const startDate = new Date(trialStart);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const daysLeft = Math.max(0, 30 - diffDays);
          setProPlanDaysLeft(daysLeft);
          
          if (diffDays >= 30) {
            // Reload free words back to 900
            setUserWords(900);
            const store = await load("store.json");
            await store.set("userWords", 900);
            await store.save();
            
            const newTrialStart = new Date().toISOString();
            await supabase.auth.updateUser({
              data: {
                ...metadata,
                trial_start_date: newTrialStart,
                user_words_balance: 900
              }
            });
            
            setProPlanDaysLeft(30);
            
            // Log reload billing transaction
            const txnId = "TXN-" + Math.floor(10000 + Math.random() * 90000);
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const reloadTxn = {
              id: txnId,
              date: `${dateStr} ${timeStr}`,
              description: "Monthly Free Words Reload",
              words: "900 words",
              amount: "₦0.00",
              status: "Successful",
              method: "System Auto-Renewal"
            };
            setBillingTransactions((prev: any[]) => [reloadTxn, ...prev]);
          }
        }
      } catch (e) {
        console.warn("Failed to check free trial reload tracker:", e);
        // Fallback to local calculations if we fail to fetch
        if (_props.initialUser?.trialStartDate) {
          const startDate = new Date(_props.initialUser.trialStartDate);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const daysLeft = Math.max(0, 30 - diffDays);
          setProPlanDaysLeft(daysLeft);
        }
      }
    })();
  }, []);

  const [dictationSpeed, setDictationSpeed] = useState<string>("fast");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupPageIndices, setGroupPageIndices] = useState<Record<string, number>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("bg-[#1a1a1a]");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const handleSignOutConfirm = async () => {
    // Clear local store files
    try {
      const store = await load("store.json");
      await store.delete("transcriptHistory");
      await store.delete("dictationSpeed");
      await store.delete("hideFocusedAppIcon");
      await store.delete("contextAwareness");
      await store.delete("sayikor_shortcuts");
      await store.delete("sayikor_dictionary");
      await store.delete("sayikor_text_shortcuts");
      await store.delete("showIkorBar");
      await store.delete("wordConsumptionHistory");
      
      // Clear Monnify credentials
      await store.delete("monnify_api_key");
      await store.delete("monnify_secret_key");
      await store.delete("monnify_contract_code");
      await store.delete("monnify_mode_sandbox");
      await store.save();

      // Stop Monnify MCP process
      try {
        await invoke("stop_mcp_server");
      } catch (err) {
        console.warn("Failed to stop Monnify MCP server on signout:", err);
      }

      // Notify other windows/components to reset the setting immediately
      await emit("hide-focused-app-icon-changed", false);
      await emit("context-awareness-changed", true);
      await emit("show-ikor-bar-changed", true);
    } catch (e) {
      console.error("Failed to clear local store on signout:", e);
    }

    // Clear local storage keys
    localStorage.removeItem("sayikor_privacy_mode");
    localStorage.removeItem("sayikor_context_awareness");
    localStorage.removeItem("sayikor_selected_mic_id");
    localStorage.removeItem("sayikor_hide_focused_app_icon");
    localStorage.removeItem("sayikor_show_ikor_bar");
    localStorage.removeItem("sayikor_shortcuts");
    localStorage.removeItem("sayikor_onboarding_completed");
    localStorage.removeItem("sayikor_celebration_shown");

    // Clear state
    setTranscriptHistory([]);
    setCumulativeWords(0);
    setTranscriptionDates([]);
    setWordConsumptionHistory([]);
    setProfileFirstName("User");
    setProfileLastName("");
    
    // Close modals
    setIsSettingsModalOpen(false);
    setIsSignOutModalOpen(false);
    
    // Trigger sign-in redirect by signing out of supabase
    await supabase.auth.signOut();
  };
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeCurrency, setUpgradeCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [topUpCurrency, setTopUpCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [topUpIsPro, setTopUpIsPro] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<string>("");
  const [settingsModalTab, setSettingsModalTab] = useState("General");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'single' | 'all'; transcriptId?: string }>({ isOpen: false, type: 'single' });

  // Word usage filter states
  const [wordDateRange, setWordDateRange] = useState<string>("May 18 - 25, 2026");
  const [wordType, setWordType] = useState<string>("All types");
  const [wordSpeedMode, setWordSpeedMode] = useState<string>("All modes");
  const [wordBucketBy, setWordBucketBy] = useState<string>("Day");

  const planInfo = useMemo(() => {
     if (currentUserPlan && currentUserPlan !== "Free Trial") {
         return { name: currentUserPlan, days: proPlanDaysLeft ?? 30 };
     }
     return { name: "Free Trial", days: null };
  }, [currentUserPlan, proPlanDaysLeft]);



  // Word Deduction Formulas & Calculation Logic:
  // (Left in code as a detailed note reference for any backend team members)
  /*
    BACKEND RULE VERIFICATION MATRIX:
    
    1. Base standard speed mode (Fast Mode):
       - 1 word dictated = 1 word deducted (Standard rate).
       Deduction = wordsSpoken
       
    2. Speed Mode Multipliers/Adjustments:
       - Ultrafast mode: charged 2 extra words per second of duration.
         Deduction = wordsSpoken + (durationSeconds * 2)
       - Queued mode: gain 0.5 extra word per second of duration (saved/discounted).
         Deduction = Math.max(0, wordsSpoken - (durationSeconds * 0.5))
       
    3. ScribePro Command Formulas (not "smart polishing"):
       - With Highlighted Context Window > 2,000 characters:
         Deduction = wordsSpoken + (contextCharacters / 50)
       - For Quick Messages, Email replies, or Slack responses (Flat Thread Rate):
         Deduction = wordsSpoken + 150
  */



  // Word usage transaction data derived from persistent history
  const wordTransactions = useMemo(() => {
    return wordConsumptionHistory;
  }, [wordConsumptionHistory]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return wordTransactions.filter(t => {
      // Date Range Filter
      if (wordDateRange !== "All Time") {
        if (t.date) {
          const dateObj = new Date(t.date);
          if (wordDateRange === "May 18 - 25, 2026") {
            const start = new Date("2026-05-18");
            const end = new Date("2026-05-25T23:59:59");
            if (dateObj < start || dateObj > end) return false;
          } else if (wordDateRange === "May 11 - 17, 2026") {
            const start = new Date("2026-05-11");
            const end = new Date("2026-05-17T23:59:59");
            if (dateObj < start || dateObj > end) return false;
          } else if (wordDateRange === "May 04 - 10, 2026") {
            const start = new Date("2026-05-04");
            const end = new Date("2026-05-10T23:59:59");
            if (dateObj < start || dateObj > end) return false;
          }
        }
      }
      // Type Filter
      if (wordType !== "All types") {
        if (wordType === "Dictation" && t.type !== "Dictation") return false;
        if (wordType === "ScribePro" && t.type !== "ScribePro") return false;
        if (wordType === "MCP" && t.type !== "MCP") return false;
      }
      // Speed Mode Filter
      if (wordSpeedMode !== "All modes") {
        const reqMode = wordSpeedMode.replace(" mode", ""); // 'Queued', 'Fast', 'Ultrafast'
        if (t.mode !== reqMode) return false;
      }
      return true;
    });
  }, [wordTransactions, wordType, wordSpeedMode, wordDateRange]);

  // Total word consumption for filtered items
  const totalConsumed = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (typeof t.cost === 'number' && !isNaN(t.cost) ? t.cost : 0), 0);
  }, [filteredTransactions]);

  // Dynamic statistics calculated
  const statsOverview = useMemo(() => {
    const consumedVal = typeof totalConsumed === 'number' && !isNaN(totalConsumed) ? totalConsumed : 0;
    const consumed = consumedVal.toFixed(1);

    let currentMode = "Fast";
    if (wordSpeedMode === "Ultrafast mode") {
      currentMode = "Ultrafast";
    } else if (wordSpeedMode === "Queued mode") {
      currentMode = "Queued";
    }

    let estVal = "";
    let estSub = "";

    if (currentMode === "Ultrafast") {
      const mins = Math.max(0, Math.floor(userWords / 235));
      estVal = `~${mins.toLocaleString()} mins`;
      estSub = "At standard Ultrafast Mode";
    } else if (currentMode === "Queued") {
      const mins = Math.max(0, Math.floor(userWords / 85));
      estVal = `~${mins.toLocaleString()} mins`;
      estSub = "At standard Queued Mode";
    } else {
      const mins = Math.max(0, Math.floor(userWords / 115));
      estVal = `~${mins.toLocaleString()} mins`;
      estSub = "At standard Fast Mode";
    }

    const rateVal = planInfo.name === "Ikor Pro" || planInfo.name === "Pro plan" 
      ? "₦25/1k words" 
      : planInfo.name === "Ikor Plus" 
        ? "₦50/1k words" 
        : "₦100/1k words";
    const rateSub = planInfo.name;

    return [
      {"label": "Word Balance", "value": `${userWords.toLocaleString()} words`, "subtext": "Words remaining", "color": "text-[#34a853]"},
      {"label": "Words Consumed", "value": `${parseFloat(consumed).toLocaleString()} words`, "subtext": "Words consumed in range", "color": "text-amber-600"},
      {"label": "Estimated Duration", "value": estVal, "subtext": estSub, "color": "text-blue-600"},
      {"label": "Active Plan Rate", "value": rateVal, "subtext": "Based on " + rateSub, "color": "text-red-500"}
    ];
  }, [totalConsumed, wordSpeedMode, planInfo, userWords]);

  // Daily points logic for stacked bar chart representation
  const dailyPoints = useMemo(() => {
    let daysList: { day: string; fullDay: string; dateStr: string }[] = [];
    
    if (wordDateRange === "May 11 - 17, 2026") {
      daysList = [
        { day: "Mon", fullDay: "Monday, May 11", dateStr: "May 11, 2026" },
        { day: "Tue", fullDay: "Tuesday, May 12", dateStr: "May 12, 2026" },
        { day: "Wed", fullDay: "Wednesday, May 13", dateStr: "May 13, 2026" },
        { day: "Thu", fullDay: "Thursday, May 14", dateStr: "May 14, 2026" },
        { day: "Fri", fullDay: "Friday, May 15", dateStr: "May 15, 2026" },
        { day: "Sat", fullDay: "Saturday, May 16", dateStr: "May 16, 2026" },
        { day: "Sun", fullDay: "Sunday, May 17", dateStr: "May 17, 2026" }
      ];
    } else if (wordDateRange === "May 04 - 10, 2026") {
      daysList = [
        { day: "Mon", fullDay: "Monday, May 04", dateStr: "May 4, 2026" },
        { day: "Tue", fullDay: "Tuesday, May 05", dateStr: "May 5, 2026" },
        { day: "Wed", fullDay: "Wednesday, May 06", dateStr: "May 6, 2026" },
        { day: "Thu", fullDay: "Thursday, May 07", dateStr: "May 7, 2026" },
        { day: "Fri", fullDay: "Friday, May 08", dateStr: "May 8, 2026" },
        { day: "Sat", fullDay: "Saturday, May 09", dateStr: "May 9, 2026" },
        { day: "Sun", fullDay: "Sunday, May 10", dateStr: "May 10, 2026" }
      ];
    } else if (wordDateRange === "All Time") {
      if (wordBucketBy === "Week") {
        daysList = [
          { day: "Wk 1", fullDay: "Week of May 04 - 10", dateStr: "Wk1" },
          { day: "Wk 2", fullDay: "Week of May 11 - 17", dateStr: "Wk2" },
          { day: "Wk 3", fullDay: "Week of May 18 - 25", dateStr: "Wk3" },
        ];
      } else {
        daysList = [
          { day: "May 6", fullDay: "Wednesday, May 06", dateStr: "May 6, 2026" },
          { day: "May 11", fullDay: "Monday, May 11", dateStr: "May 11, 2026" },
          { day: "May 12", fullDay: "Tuesday, May 12", dateStr: "May 12, 2026" },
          { day: "May 15", fullDay: "Friday, May 15", dateStr: "May 15, 2026" },
          { day: "May 18", fullDay: "Monday, May 18", dateStr: "May 18, 2026" },
          { day: "May 19", fullDay: "Tuesday, May 19", dateStr: "May 19, 2026" },
          { day: "May 20", fullDay: "Wednesday, May 20", dateStr: "May 20, 2026" },
          { day: "May 22", fullDay: "Friday, May 22", dateStr: "May 22, 2026" },
          { day: "May 24", fullDay: "Sunday, May 24", dateStr: "May 24, 2026" },
          { day: "May 25", fullDay: "Monday, May 25 (Today)", dateStr: "May 25, 2026" }
        ];
      }
    } else {
      daysList = [
        { day: "Mon", fullDay: "Monday, May 18", dateStr: "May 18, 2026" },
        { day: "Tue", fullDay: "Tuesday, May 19", dateStr: "May 19, 2026" },
        { day: "Wed", fullDay: "Wednesday, May 20", dateStr: "May 20, 2026" },
        { day: "Thu", fullDay: "Thursday, May 21", dateStr: "May 21, 2026" },
        { day: "Fri", fullDay: "Friday, May 22", dateStr: "May 22, 2026" },
        { day: "Sat", fullDay: "Saturday, May 23", dateStr: "May 23, 2026" },
        { day: "Sun", fullDay: "Sunday, May 24", dateStr: "May 24, 2026" },
        { day: "Mon ", fullDay: "Monday, May 25 (Today)", dateStr: "May 25, 2026" }
      ];
    }

    return daysList.map(d => {
      let matchingTransactions = filteredTransactions;
      if (d.dateStr === "Wk1") {
        matchingTransactions = filteredTransactions.filter(t => t.date && new Date(t.date) >= new Date("2026-05-04") && new Date(t.date) <= new Date("2026-05-10T23:59:59"));
      } else if (d.dateStr === "Wk2") {
        matchingTransactions = filteredTransactions.filter(t => t.date && new Date(t.date) >= new Date("2026-05-11") && new Date(t.date) <= new Date("2026-05-17T23:59:59"));
      } else if (d.dateStr === "Wk3") {
        matchingTransactions = filteredTransactions.filter(t => t.date && new Date(t.date) >= new Date("2026-05-18") && new Date(t.date) <= new Date("2026-05-25T23:59:59"));
      } else {
        matchingTransactions = filteredTransactions.filter(t => t.date && t.date.includes(d.dateStr));
      }

      const dictWords = matchingTransactions
        .filter(t => t.type === "Dictation")
        .reduce((sum, t) => sum + (t.cost || 0), 0);

      const editWords = matchingTransactions
        .filter(t => t.type === "ScribePro" || t.type === "Text Editing")
        .reduce((sum, t) => sum + (t.cost || 0), 0);

      const mcpWords = matchingTransactions
        .filter(t => t.type === "MCP")
        .reduce((sum, t) => sum + (t.cost || 0), 0);

      const total = dictWords + editWords + mcpWords;

      return {
        day: d.day,
        fullDay: d.fullDay,
        filteredDict: dictWords,
        filteredEdit: editWords,
        filteredMcp: mcpWords,
        filteredTotal: total
      };
    });
  }, [wordTransactions, filteredTransactions, wordDateRange, wordBucketBy]);

  const [onboardingTasks, setOnboardingTasks] = useState([
    { id: 'dictation', name: 'Try your first dictation', completed: true, desc: 'Experience real-time voice-to-text dictation by speaking clearly after activating the recorder to generate your first draft perfectly.' },
    { id: 'personal-term', name: 'Add a personal term', completed: false, desc: 'Go to Keywords and add custom vocabulary, names, or brand terms so Ikor learns how to spell them perfectly.' },
    { id: 'personal-shortcut', name: 'Add a personal shortcut', completed: true, desc: 'Create a custom shortcut that replaces a spoken phrase with long text blocks like emails or canned responses.' },
  ]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isOnboardingExpanded, setIsOnboardingExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const cardColors = [
    { id: 'light', class: 'bg-[#f8f7f0]' },
    { id: 'dark', class: 'bg-[#1a1a1a]' },
    { id: 'red', class: 'bg-red-500' },
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'green', class: 'bg-green-500' }
  ];

  const metrics = useMemo(() => {
    const totalWords = cumulativeWords;
    
    // Calculate actual average WPM from transaction history
    let totalDurationMinutes = 0;
    let totalWordsSpoken = 0;

    if (Array.isArray(wordConsumptionHistory)) {
      wordConsumptionHistory.forEach(t => {
        if (t.duration && typeof t.words === 'number') {
          const mins = parseFloat(t.duration);
          if (!isNaN(mins) && mins > 0) {
            totalDurationMinutes += mins;
            totalWordsSpoken += t.words;
          }
        }
      });
    }

    const avgWpm = totalDurationMinutes > 0 
      ? Math.round(totalWordsSpoken / totalDurationMinutes) 
      : (totalWords > 0 ? 115 : 0);

    const timeSavedMinutes = totalWords > 0 ? Math.round(totalWords * (1/35 - 1/115)) : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatLocalDate(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);
    
    const datesSet = new Set(transcriptionDates || []);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    if (!datesSet.has(todayStr) && !datesSet.has(yesterdayStr)) {
      streak = 0;
    } else {
      if (!datesSet.has(todayStr) && datesSet.has(yesterdayStr)) {
        checkDate = new Date(yesterday);
      }
      
      for (let i = 0; i < 365; i++) {
        const dateStr = formatLocalDate(checkDate);
        if (datesSet.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return { totalWords, timeSavedMinutes, streak, avgWpm };
  }, [cumulativeWords, transcriptionDates, wordConsumptionHistory]);

  const groupedHistory = useMemo(() => {
    // 1. Group ScribePro history items by groupId
    const groups: Record<string, any[]> = {};
    const processed: any[] = [];
    const seenGroups = new Set<string>();

    transcriptHistory.forEach((item) => {
      if (item.type === "ScribePro" && item.groupId) {
        if (!groups[item.groupId]) {
          groups[item.groupId] = [];
        }
        groups[item.groupId].push(item);
      }
    });

    transcriptHistory.forEach((item) => {
      if (item.type === "ScribePro" && item.groupId) {
        if (!seenGroups.has(item.groupId)) {
          seenGroups.add(item.groupId);
          // Sort items chronologically: oldest first (Turn 1, Turn 2...)
          // Since transcriptHistory is newest-first, reversing gives oldest-first
          const groupItems = [...groups[item.groupId]].reverse();
          processed.push({
            isGroup: true,
            id: item.groupId,
            groupId: item.groupId,
            date: item.date,
            type: "ScribePro",
            items: groupItems
          });
        }
      } else {
        processed.push(item);
      }
    });

    // 2. Filter based on searchQuery
    if (!searchQuery.trim()) return processed;

    const query = searchQuery.toLowerCase();
    return processed.filter((item) => {
      if (item.isGroup) {
        return item.items.some(
          (subItem: any) =>
            subItem.content.toLowerCase().includes(query) ||
            (subItem.command && subItem.command.toLowerCase().includes(query))
        );
      } else {
        return (
          item.content.toLowerCase().includes(query) ||
          (item.command && item.command.toLowerCase().includes(query))
        );
      }
    });
  }, [transcriptHistory, searchQuery]);

  const handleSpeedChange = async (speed: string) => {
    setDictationSpeed(speed);
    try {
      const store = await load("store.json");
      await store.set("dictationSpeed", speed);
      await store.save();
    } catch (e) {
      console.error("Failed to save dictationSpeed:", e);
    }
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById('share-card-element');
    if (!node) {
      setErrorMessage('Could not find card element');
      return;
    }
    try {
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2, cacheBust: true });
      
      if (isTauri) {
        const filePath = await save({
          filters: [{ name: 'Image', extensions: ['png'] }],
          defaultPath: 'sayikor-progress.png',
        });
        
        if (filePath) {
          // Strip the data:image/png;base64, prefix to get raw base64
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const savedPath = await invoke<string>('save_image_file', { base64Data, filePath });
          
          // Open the containing folder in Explorer/Finder
          const folderPath = savedPath.substring(0, Math.max(savedPath.lastIndexOf('\\'), savedPath.lastIndexOf('/')));
          await openPath(folderPath);
        }
      } else {
        // Browser fallback
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'sayikor-progress.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || String(err) || 'Failed to export image');
      console.error('Failed to export image', err);
    }
  };

  return (
    <div className="flex w-full h-screen bg-[#f8f7f0] text-black font-sans overflow-hidden">
      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 right-4 z-[10000] bg-red-50 text-red-600 px-4 py-3 rounded-2xl shadow-xl border border-red-100 flex items-center gap-3 max-w-sm"
          >
            <AlertCircle className="shrink-0" size={20} />
            <p className="text-sm font-medium leading-tight">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="shrink-0 w-6 h-6 rounded-full hover:bg-red-100 flex items-center justify-center transition-all ml-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsShareModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <X size={16} className="text-gray-600" />
              </button>
              
              <h2 className="text-2xl font-bold mb-6">Share your progress</h2>
              
              <div id="share-card-element" className="mb-8 h-[300px] overflow-hidden rounded-[32px]">
                <ShareCard color={selectedColor} metrics={metrics} firstName={profileFirstName} lastName={profileLastName} />
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 mr-2">Theme:</span>
                  {cardColors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColor(c.class)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c.class ? 'border-black scale-110' : 'border-transparent hover:scale-105'}`}
                    >
                      <div className={`w-full h-full rounded-full ${c.class} border border-black/10`} />
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={handleDownloadImage}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Share size={18} /> Download Image
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col border-r border-black/5 bg-[#f2f0e4]/50 backdrop-blur-md overflow-visible transition-all duration-300 shrink-0 z-50`}>
        <div className={`p-6 pb-2 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          <div className={`flex items-center mb-8 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 overflow-hidden">
               <img src={isSidebarCollapsed ? "/png icon logo Orange.png" : "/Png-Orange-text.png"} alt="Sayikor" className="h-8 object-contain" />
              {!isSidebarCollapsed && (
                <>
                  <span className="px-2.5 py-0.5 bg-accent-orange text-white text-[10px] font-extrabold rounded-full ml-1.5 whitespace-nowrap tracking-wide select-none shadow-xs">
                    BETA
                  </span>
                </>
              )}
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { icon: Home, label: "Home" },
              { icon: Book, label: "Keywords", action: () => setActiveSection("Dictionary") },
              { icon: Type, label: "Style Guide", action: () => setActiveSection("Style Guide") },
            ].map((item) => (
              <Tooltip key={item.label} content={item.label} enabled={isSidebarCollapsed}>
                <button
                  onClick={item.action || (() => setActiveSection(item.label))}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeSection === (item.label === 'Keywords' ? 'Dictionary' : item.label)
                      ? "bg-red-500/15 text-red-500" 
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
              </Tooltip>
            ))}
          </nav>
        </div>

        <div className={`mt-auto p-6 space-y-2 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          {isSidebarCollapsed ? (
            <Tooltip content="Top up words" enabled={isSidebarCollapsed}>
                <button 
                    onClick={() => {
                       setSettingsModalTab("Plans and Billing");
                       setIsSettingsModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center p-3 rounded-xl bg-black text-white hover:opacity-90 transition-all" 
                >
                  <Wallet size={18} />
                </button>
            </Tooltip>
          ) : (
            <div className="bg-[#d4edda]/30 border border-[#d4edda] rounded-2xl p-4 relative overflow-hidden mb-4 animate-fade-in animate-duration-300">
              <div className="relative z-10">
                <p className="text-xs font-bold text-gray-800 mb-1">
                <span className="text-[#34a853] font-black">{userWords.toLocaleString()} </span> words left.
                </p>
                {/* Visual Progress Bar for Word Balance Deduction */}
                <div className="w-full h-1.5 bg-black/5 rounded-full my-2 overflow-hidden" title={`${wordPercentage.toFixed(1)}% remaining`}>
                  <div 
                    className="h-full bg-[#34a853] rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${wordPercentage}%` }} 
                  />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight mb-4">Add more words to your balance to continue dictating seamlessly and save hours of typing.</p>
                <button 
                  onClick={() => {
                    setTopUpCurrency('NGN');
                    setTopUpIsPro(false);
                    setIsTopUpModalOpen(true);
                  }}
                  className="w-full bg-black text-white py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  Top up words
                </button>
              </div>
            </div>
          )}


          {[
            { icon: TrendingUp, label: "Word Consumption", action: () => setActiveSection("Word Consumption") },
            { icon: Zap, label: "Speed Mode", action: () => setActiveSection("Speed Mode") },
            { icon: Settings, label: "Settings", action: () => { setSettingsModalTab("General"); setIsSettingsModalOpen(true); } },
            { icon: RefreshCw, label: "Check for Updates", action: () => { alert("Updates not yet implemented"); } },
          ].map((item) => (
            <Tooltip key={item.label} content={item.label} enabled={isSidebarCollapsed}>
                <button
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeSection === item.label
                      ? "bg-red-500/15 text-red-500" 
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
            </Tooltip>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Title Bar Simulation */}
        <header data-tauri-drag-region className="relative h-12 flex items-center justify-between px-6 border-b border-black/5 cursor-move z-[60]">
          <div className="flex items-center gap-4">
            <Tooltip content="Toggle Sidebar" enabled={true} direction="bottom-left">
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PanelLeft size={18} />
              </button>
            </Tooltip>
            <Tooltip content="Account" enabled={true} direction="bottom">
              <button 
                onClick={() => {
                  setSettingsModalTab("Account");
                  setIsSettingsModalOpen(true);
                }}
                className="flex items-center gap-1 text-gray-400 hover:text-black transition-colors"
              >
                <CircleUser size={18} />
                <span className={`px-2 py-0.5 ${planInfo.name === 'Free Trial' ? 'bg-red-500/15 text-red-500' : 'bg-green-500/15 text-green-500'} text-[10px] font-bold rounded-md whitespace-nowrap tracking-wide`}>
                   {planInfo.name}
                </span>
                {planInfo.days !== null && (
                  <span className="text-[10px] text-black whitespace-nowrap">
                    {planInfo.days > 1 
                       ? <>ends in <b className="font-bold">{planInfo.days}</b> days</> 
                       : planInfo.days === 1 ? "ends tomorrow" : "ends today"}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-4">
               <button onClick={() => getCurrentWindow().minimize()} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6"><Minus size={16} /></button>
               <button onClick={async () => {
                 await getCurrentWindow().toggleMaximize();
               }} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6">
                 {isMaximized ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                     <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                     <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                     <rect x="4" y="4" width="16" height="16" rx="1.5" />
                   </svg>
                 )}
               </button>
               <button onClick={() => getCurrentWindow().close()} className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center w-6 h-6"><X size={16} /></button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 w-full custom-scrollbar">
          {activeSection === "Home" && (
            <div className={`mx-auto w-full transition-all duration-300 relative ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-8 font-sans flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center flex-wrap gap-x-2 gap-y-3 text-gray-900 leading-relaxed">
                  <span className="text-gray-550 font-semibold text-lg md:text-xl">Hold</span>
                  {(() => {
                    const keys = dictateShortcut ? dictateShortcut.split(" + ") : ["Ctrl", "Alt"];
                    return (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        {keys.map((key, index) => (
                          <React.Fragment key={index}>
                            {index > 0 && <span className="text-gray-400 font-bold px-0.5 text-xs">+</span>}
                            <span className="inline-flex items-center justify-center min-w-[56px] px-3.5 py-1 bg-accent-orange/15 text-black font-extrabold text-xs md:text-sm border-2 border-accent-orange rounded-xl shadow-[2.5px_2.5px_0px_#ef4444] tracking-wide font-sans select-none hover:-translate-y-0.5 transition-transform duration-100">
                              {key}
                            </span>
                          </React.Fragment>
                        ))}
                      </span>
                    );
                  })()}
                  <span className="text-gray-550 font-semibold text-lg md:text-xl">to dictate anywhere</span>
                </h1>
                <Tooltip content="Share Progress" enabled={true} direction="left">
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-8 h-8 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <Share size={14} className="text-red-500" />
                  </button>
                </Tooltip>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-6 mb-12 animate-fade-in">
                <div 
                  className="cursor-pointer group h-full min-h-[250px]"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <ShareCard color={selectedColor} metrics={metrics} isPreview={true} firstName={profileFirstName} lastName={profileLastName} />
                </div>

                <div 
                  onClick={() => alert("Ikor learning hub coming soon!")}
                  className="bg-[#f4f3ec] rounded-[32px] p-8 flex flex-col justify-between overflow-hidden h-full min-h-[250px] border border-black/[0.04] relative group cursor-pointer hover:shadow-md transition-all ease-out"
                >
                  <div className="flex justify-between items-center z-40 gap-4">
                    <div className="select-none">
                      <h3 className="text-2xl font-bold text-gray-800 leading-tight tracking-tight">Learn how to use Ikor</h3>
                      <p className="text-sm text-gray-400 font-medium mt-1">5 videos</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        alert("Ikor learning hub coming soon!");
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-sm transition-all shrink-0 z-50 cursor-pointer"
                    >
                      Learn more
                    </button>
                  </div>

                  {/* Overlapping rotated video views */}
                  <div className="relative w-full h-[160px] mt-4 flex justify-center items-end select-none pointer-events-none">
                    {/* 3rd (Back) Waveform Card */}
                    <div className="absolute left-[62%] bottom-[-50px] z-10 transform rotate-[18deg] w-[180px] h-[110px] rounded-[24px] border-[3px] border-white shadow-lg overflow-hidden transition-all duration-300 group-hover:-translate-y-4 group-hover:rotate-[22deg]">
                      <img 
                        src={videoThumb3} 
                        alt="Audio Speech wave preview" 
                        className="w-full h-full object-cover animate-fade-in" 
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* 2nd (Middle) Wall Collage Card */}
                    <div className="absolute left-[40%] bottom-[-35px] z-20 transform rotate-[8deg] w-[190px] h-[115px] rounded-[24px] border-[3px] border-white shadow-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-5 group-hover:rotate-[4deg]">
                      <img 
                        src={videoThumb2} 
                        alt="Studio workspace preview" 
                        className="w-full h-full object-cover animate-fade-in" 
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* 1st (Front) Ginger man with Beanie Card */}
                    <div className="absolute left-[12%] bottom-[-20px] z-30 transform -rotate-[14deg] w-[200px] h-[120px] rounded-[24px] border-[3.5px] border-white shadow-[0_15px_30px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 group-hover:-translate-y-4 group-hover:-rotate-[-10deg] group-hover:scale-[1.03]">
                      <img 
                        src={videoThumb1} 
                        alt="Ginger Creator beanie laptop preview" 
                        className="w-full h-full object-cover animate-fade-in" 
                        referrerPolicy="no-referrer"
                      />
                      {/* Play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-40">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-800 ml-0.5 animate-pulse">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mb-24">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">History</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={dropdownRef}>
                      <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                      >
                        <MoreHorizontal size={16} className="text-gray-600" />
                      </button>
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50"
                          >
                            <button 
                              onClick={() => {
                                setIsDropdownOpen(false);
                                alert("Export not fully implemented yet");
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
                            >
                              Export transcripts
                            </button>
                            <button 
                              onClick={() => {
                                setDeleteModal({ isOpen: true, type: 'all' });
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-black/5"
                            >
                              Delete all transcripts
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full">
                      <Search size={14} className="text-gray-500" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transcripts..." 
                        className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
                
                {groupedHistory.length === 0 ? (
                  <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-12 text-center">
                    {searchQuery.trim() ? (
                      <p className="text-sm text-gray-400 italic">No results for &ldquo;{searchQuery}&rdquo;</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No transcripts yet. Sync or import files to see transcripts here.</p>
                    )}
                  </div>
                ) : (
                  (Object.entries(
                    groupedHistory.reduce((acc, item: any) => {
                      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const dateStr = item.date === todayStr ? 'Today' : (item.date || 'Today');
                      if (!acc[dateStr]) acc[dateStr] = [];
                      acc[dateStr].push(item);
                      return acc;
                    }, {} as Record<string, typeof groupedHistory>)
                  ) as [string, any[]][]).map(([date, items]) => (
                    <div key={date} className="mb-8">
                      <h3 className="text-xs font-bold text-gray-400 mb-4">{date}</h3>
                      <div className="bg-white rounded-[32px] shadow-sm border border-black/5 divide-y divide-black/5">
                        {items.map((activity, index) => {
                          const isGroup = !!activity.isGroup;
                          const activeIndex = isGroup ? Math.min(groupPageIndices[activity.groupId] ?? 0, activity.items.length - 1) : 0;
                          const activeItem = isGroup ? activity.items[activeIndex] : activity;
                          const itemKey = isGroup ? `${activity.groupId}-${activeIndex}` : `${date}-${index}`;
                          const trimmedContent = activeItem.content.trim();
                          const linesCount = trimmedContent.split('\n').filter((line: string) => line.trim().length > 0).length;
                          const isLong = trimmedContent.length > 150 || linesCount > 3;
                          const isExpanded = expandedItems[itemKey];

                          return (
                            <div key={index} className="p-6 flex gap-6 group relative hover:bg-black/[0.02] transition-colors first:rounded-t-[32px] last:rounded-b-[32px]">
                              {/* Icons on hover or during re-transcription */}
                              <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${reTranscribingMap[activeItem.id] ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                <Tooltip content="Report Transcript" enabled={true} direction="bottom-right">
                                  <button 
                                    onClick={() => {
                                      setSelectedTranscriptId(activeItem.id);
                                      setIsReportModalOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-black/10 rounded-md text-gray-400 hover:text-black transition-colors relative cursor-pointer"
                                  >
                                    <Flag size={14} />
                                  </button>
                                </Tooltip>
                                <Tooltip content="Copy" enabled={true} direction="bottom-right">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(activeItem.content);
                                      setActionFeedback({id: activeItem.id, message: 'Copied!'});
                                      setTimeout(() => setActionFeedback(null), 2000);
                                    }}
                                    className="p-1.5 hover:bg-black/10 rounded-md text-gray-400 hover:text-black transition-colors relative"
                                  >
                                    <Copy size={14} />
                                    {actionFeedback?.id === activeItem.id && actionFeedback?.message === 'Copied!' && (
                                      <span className="absolute -top-8 right-0 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap animate-pulse">{actionFeedback.message}</span>
                                    )}
                                  </button>
                                </Tooltip>
                                <Tooltip content="Redo" enabled={true} direction="bottom-right">
                                  <button 
                                    disabled={reTranscribingMap[activeItem.id]}
                                    onClick={() => {
                                      if (reTranscribingMap[activeItem.id]) return;
                                      setReTranscribingMap(prev => ({ ...prev, [activeItem.id]: true }));
                                      
                                      setTimeout(() => {
                                        setReTranscribingMap(prev => ({ ...prev, [activeItem.id]: false }));
                                        setActionFeedback({id: activeItem.id, message: 'Re-transcribed!'});
                                        setTimeout(() => setActionFeedback(null), 2000);
                                      }, 2000);
                                    }}
                                    className={`p-1.5 rounded-md transition-colors relative ${reTranscribingMap[activeItem.id] ? "text-[#dc3545] bg-[#dc3545]/10 cursor-not-allowed" : "text-gray-400 hover:text-black hover:bg-black/10 cursor-pointer"}`}
                                  >
                                    {reTranscribingMap[activeItem.id] ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <RefreshCw size={14} />
                                    )}
                                    {actionFeedback?.id === activeItem.id && actionFeedback?.message === 'Re-transcribed!' && (
                                      <span className="absolute -top-8 right-0 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap animate-pulse">{actionFeedback.message}</span>
                                    )}
                                  </button>
                                </Tooltip>
                                <Tooltip content="Delete" enabled={true} direction="bottom-right">
                                  <button 
                                    onClick={() => setDeleteModal({ isOpen: true, type: 'single', transcriptId: activeItem.id })}
                                    className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors relative"
                                  >
                                    <Trash2 size={14} />
                                    {actionFeedback?.id === activeItem.id && actionFeedback?.message === 'Deleted!' && (
                                      <span className="absolute -top-8 right-0 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap animate-pulse">{actionFeedback.message}</span>
                                    )}
                                  </button>
                                </Tooltip>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 w-32">
                                <span className="text-xs font-bold tabular-nums text-gray-400">{activeItem.time}</span>
                                {isGroup && activity.items.length > 1 && (
                                  <div className="inline-flex items-center gap-0.5 bg-black/[0.03] hover:bg-black/[0.05] px-1.5 py-0.5 rounded-lg transition-colors select-none">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newIdx = Math.max(0, activeIndex - 1);
                                        setGroupPageIndices(prev => ({ ...prev, [activity.groupId]: newIdx }));
                                      }}
                                      disabled={activeIndex === 0}
                                      className="p-0.5 text-gray-400 hover:text-black disabled:opacity-20 transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                      <ChevronLeft size={11} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] font-bold tabular-nums text-gray-500 min-w-[20px] text-center select-none">{activeIndex + 1}/{activity.items.length}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newIdx = Math.min(activity.items.length - 1, activeIndex + 1);
                                        setGroupPageIndices(prev => ({ ...prev, [activity.groupId]: newIdx }));
                                      }}
                                      disabled={activeIndex === activity.items.length - 1}
                                      className="p-0.5 text-gray-400 hover:text-black disabled:opacity-20 transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                      <ChevronRight size={11} strokeWidth={3} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                {reTranscribingMap[activeItem.id] ? (
                                  <div className="space-y-2.5 animate-pulse py-1 max-w-lg select-none">
                                    <div className="h-3 bg-gray-200 rounded-full w-full" />
                                    <div className="h-3 bg-gray-200 rounded-full w-2/5" />
                                  </div>
                                ) : (
                                  <>
                                    {activeItem.type === "ScribePro" && activeItem.command ? (
                                      <>
                                        <p className={`text-sm leading-relaxed text-black whitespace-pre-line mb-1 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                          {activeItem.command}
                                        </p>
                                        <p className={`text-sm leading-relaxed text-gray-500 whitespace-pre-line mb-2 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                          {activeItem.content}
                                        </p>
                                      </>
                                    ) : (
                                      <p className={`text-sm leading-relaxed text-gray-800 whitespace-pre-line mb-2 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                        {activeItem.content}
                                      </p>
                                    )}
                                    {isLong && (
                                      <button 
                                        onClick={() => setExpandedItems(prev => ({...prev, [itemKey]: !prev[itemKey]}))}
                                        className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline mt-1"
                                      >
                                        {isExpanded ? "Show less" : "Show more"}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </section>

              {isOnboardingExpanded ? (
                <div className="fixed bottom-6 right-8 bg-white border border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[28px] p-6 w-[340px] z-50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-sans font-bold text-gray-800">Onboarding Tasks</span>
                    <button 
                      onClick={() => setIsOnboardingExpanded(false)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Horizontal discrete progress segments */}
                  <div className="flex gap-1.5 w-full mt-3 mb-5">
                    {onboardingTasks.map((_, idx) => {
                      const completedCount = onboardingTasks.filter(t => t.completed).length;
                      return (
                        <div 
                          key={idx} 
                          className={`h-[6px] flex-1 rounded-full transition-all duration-300 ${
                            idx < completedCount ? 'bg-red-500' : 'bg-red-100'
                          }`} 
                        />
                      );
                    })}
                  </div>

                  {/* Onboarding Tasks list */}
                  <div className="flex flex-col gap-3 py-1">
                    {onboardingTasks.map((task) => {
                      const isCompleted = task.completed;
                      const isTaskExpanded = expandedTaskId === task.id;
                      return (
                        <div key={task.id} className="flex flex-col border-b border-black/[0.02] last:border-b-0 pb-1.5 last:pb-0">
                          <div 
                            onClick={() => setExpandedTaskId(isTaskExpanded ? null : task.id)}
                            className="flex items-start justify-between gap-3 py-1 cursor-pointer group/row"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-red-500 border-red-500 text-white shadow-sm' 
                                    : 'border-gray-300 group-hover/row:border-red-400 bg-white'
                                }`}
                              >
                                {isCompleted && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span className={`text-[13.5px] font-sans truncate select-none text-left leading-none ${
                                isCompleted 
                                  ? 'text-gray-400 line-through' 
                                  : 'text-gray-700 font-medium group-hover/row:text-red-500'
                              }`}>
                                {task.name}
                              </span>
                            </div>
                            <button className="pt-0.5 text-gray-400 group-hover/row:text-red-500 transition-colors">
                              <ChevronDown size={15} className={`transform transition-transform duration-300 ${isTaskExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          <AnimatePresence initial={false}>
                            {isTaskExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-xs text-gray-500 pl-[32px] pr-2 pb-2 pt-1.5 text-left leading-relaxed">
                                  {task.desc}
                                </p>
                                {!isCompleted && (task.id === 'personal-term' || task.id === 'personal-shortcut') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (task.id === 'personal-term') setIsAddTermModalOpen(true);
                                      if (task.id === 'personal-shortcut') setIsAddShortcutModalOpen(true);
                                    }}
                                    className="ml-[32px] mb-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors"
                                  >
                                    {task.id === 'personal-term' ? 'Add term' : 'Add shortcut'}
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsOnboardingExpanded(true)}
                  className="fixed bottom-6 right-8 bg-white border border-black/5 shadow-2xl rounded-2xl flex items-center justify-between px-5 py-4 min-w-[260px] z-50 hover:shadow-xl transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-gray-800">
                    Onboarding Tasks 
                    <span className="text-red-500 font-extrabold ml-2">
                      {onboardingTasks.filter(t => t.completed).length}/{onboardingTasks.length}
                    </span>
                  </span>
                  <button className="w-6 h-6 rounded-full group-hover:bg-red-50 flex items-center justify-center transition-colors text-red-500">
                    <ChevronUp size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === "Speed Mode" && (
            <div className={`mx-auto w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-8">
                <h2 className="text-3xl font-sans font-bold mb-2">Processing Speed</h2>
                <p className="text-gray-500">Select a speed option that matches your workflow and budget.</p>
              </header>

              <div className="space-y-8">
                <section className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          id: "ultra-fast",
                          name: "Ultrafast",
                          desc: "Near-instant transcription for short dictations, quick email replies, and rapid text editing.",
                          badge: "Costs 2 extra words/second"
                        },
                        {
                          id: "fast",
                          name: "Fast",
                          desc: "Standard speed for long-form dictations, deep text editing, and detailed document improvements.",
                          badge: "Standard word rate"
                        },
                        {
                          id: "queued",
                          name: "Queued",
                          desc: "Optimized for offline dictation, non-urgent transcriptions, and flexible background processing.",
                          badge: "Lowest word rate"
                        }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleSpeedChange(opt.id)}
                          className={`flex flex-col text-left p-5 rounded-[24px] border-2 transition-all hover:scale-[1.01] ${
                            dictationSpeed === opt.id
                              ? "border-green-500 bg-green-50 shadow-sm"
                              : "border-black/5 hover:border-black/10 bg-[#fbfbf8]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <span className="font-bold text-sm">{opt.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              dictationSpeed === opt.id
                                ? "bg-green-500 text-white"
                                : "bg-black/5 text-gray-500"
                            }`}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-normal flex-1">
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                </section>
              </div>
            </div>
          )}

          {activeSection === "Word Consumption" && (
            <div className={`mx-auto w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-8">
                <h2 className="text-3xl font-sans font-bold mb-2">Word Consumption</h2>
                <p className="text-gray-500">Monitor your word consumption across speed modes, transcription history, and Pro features.</p>
              </header>

              <div className="space-y-8 animate-fade-in">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statsOverview.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                      <div className="mt-2">
                        <span className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</span>
                        <div className="text-[11px] text-gray-500 font-medium mt-1">{stat.subtext}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smart Habit Insights */}
                <div className="bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-all duration-300 rounded-[28px] border border-black/[0.04] p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5 pl-1">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                      <Activity size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Smart Habit Insights</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Automated observations and predictions derived from your historical usage</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Insight 1: Average Session Length */}
                    <div className="bg-white p-5 rounded-2xl border border-black/[0.03] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-blue-50/75 text-blue-600 shrink-0">
                        <Clock size={16} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Average Session Length</span>
                        <div className="text-sm font-semibold text-gray-800">4.5 minutes</div>
                        <p className="text-xs text-gray-500 leading-relaxed">Your typical dictation session lasts 4.5 minutes.</p>
                      </div>
                    </div>

                    {/* Insight 2: Peak Usage Window */}
                    <div className="bg-white p-5 rounded-2xl border border-black/[0.03] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-purple-50/75 text-purple-600 shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Peak Usage Window</span>
                        <div className="text-sm font-semibold text-gray-800">Monday Mornings</div>
                        <p className="text-xs text-gray-500 leading-relaxed">You consume 65% of your words on Monday mornings.</p>
                      </div>
                    </div>

                    {/* Insight 3: Burn Rate Predictor */}
                    <div className="bg-white p-5 rounded-2xl border border-black/[0.03] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-[#dc3545]/10 text-[#dc3545] shrink-0">
                        <TrendingUp size={16} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Burn Rate Predictor</span>
                        <div className="text-sm font-semibold text-gray-800">~{Math.max(1, Math.round(userWords / 1818))} Days Remaining</div>
                        <p className="text-xs text-gray-500 leading-relaxed">Based on this week's usage, your remaining {userWords.toLocaleString()} words will last approximately 22 days.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters above the chart */}
                <section className="bg-white rounded-[32px] border border-black/5 p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Date range */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date range</span>
                      <CustomSelect
                        value={wordDateRange}
                        onChange={(val) => {
                          setWordDateRange(val);
                          if (val === "All Time") {
                            setWordBucketBy("Week");
                          } else {
                            setWordBucketBy("Day");
                          }
                        }}
                        options={["May 18 - 25, 2026", "May 11 - 17, 2026", "May 04 - 10, 2026", "All Time"]}
                      />
                    </div>

                    {/* Filter by Type */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter: Type of charge</span>
                      <CustomSelect
                        value={wordType === "Text Editing" ? "ScribePro" : wordType}
                        onChange={(val) => setWordType(val === "Text Editing" ? "ScribePro" : val)}
                        options={["All types", "Dictation", "ScribePro", "MCP"]}
                      />
                    </div>

                    {/* Speed Mode Filter */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter: Speed Mode</span>
                      <CustomSelect
                        value={wordSpeedMode}
                        onChange={setWordSpeedMode}
                        options={["All modes", "Fast mode", "Ultrafast mode", "Queued mode"]}
                      />
                    </div>

                    {/* Bucket by */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bucket by</span>
                      <CustomSelect
                        value={wordBucketBy}
                        onChange={setWordBucketBy}
                        options={wordDateRange === "All Time" ? ["Week", "Day"] : ["Day"]}
                        disabled={wordDateRange !== "All Time"}
                      />
                    </div>
                  </div>
                </section>

                {/* Daily usage stacked bar chart */}
                <section className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Weekly Consumption Intensity</h3>
                      <p className="text-xs text-gray-400 mt-1">Hover over bar elements to inspect charges breakdown</p>
                    </div>
                    {/* Top total spend info */}
                    <div className="bg-gray-50 border border-black/5 rounded-xl px-4 py-2 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <TrendingUp size={14} className="text-red-500" /> Filtered Consumption:
                      </div>
                      <span className="text-sm font-mono font-bold text-red-500">{totalConsumed.toFixed(1)} words</span>
                    </div>
                  </div>

                  <div className="h-56 flex items-end justify-between gap-3 px-4 pt-10 border-b border-black/5">
                    {dailyPoints.map((item, idx) => {
                      const maxDayVal = 1000; // Adjusted limit representation for visual scaling with word deductions
                      const dictHeightPercentage = Math.min(100, (item.filteredDict / maxDayVal) * 100);
                      const editHeightPercentage = Math.min(100, (item.filteredEdit / maxDayVal) * 100);
                      const mcpHeightPercentage = Math.min(100, ((item.filteredMcp || 0) / maxDayVal) * 100);

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="relative w-full h-full flex flex-col justify-end items-center">
                            
                            {/* Detailed dynamic tooltip container */}
                            <div className="absolute bottom-full mb-3 bg-black/95 text-white p-3.5 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none text-left border border-white/10 min-w-[190px]">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{item.fullDay}</div>
                              <div className="space-y-1.5 mb-2.5">
                                <div className="flex items-center justify-between text-xs gap-6">
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-[#dc3545]" /> Dictation
                                  </span>
                                  <b className="font-mono font-bold text-white">{(item.filteredDict || 0).toFixed(1)} words</b>
                                </div>
                                <div className="flex items-center justify-between text-xs gap-6">
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" /> ScribePro
                                  </span>
                                  <b className="font-mono font-bold text-white">{(item.filteredEdit || 0).toFixed(1)} words</b>
                                </div>
                                <div className="flex items-center justify-between text-xs gap-6">
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" /> MCP Mode
                                  </span>
                                  <b className="font-mono font-bold text-white">{((item.filteredMcp || 0)).toFixed(1)} words</b>
                                </div>
                              </div>
                              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs font-bold">
                                <span className="text-gray-300">Total Consumption</span>
                                <span className="font-mono text-red-500 text-sm font-extrabold">{(item.filteredTotal || 0).toFixed(1)} words</span>
                              </div>
                            </div>

                            {/* Stacked Interactive Bar */}
                            {item.filteredTotal > 0 ? (
                              <div className="w-full max-w-[40px] flex flex-col justify-end h-full hover:brightness-110 transition-all select-none rounded-t-lg overflow-hidden">
                                {/* MCP Element (Blue block layout) */}
                                {item.filteredMcp > 0 && (
                                  <div 
                                    style={{ height: `${mcpHeightPercentage}%` }}
                                    className="w-full bg-blue-500"
                                  />
                                )}
                                {/* ScribePro Element (Amber block layout) */}
                                {item.filteredEdit > 0 && (
                                  <div 
                                    style={{ height: `${editHeightPercentage}%` }}
                                    className="w-full bg-amber-500 transition-all duration-300"
                                  />
                                )}
                                {/* Dictation Element (Red block layout) */}
                                {item.filteredDict > 0 && (
                                  <div 
                                    style={{ height: `${dictHeightPercentage}%` }}
                                    className="w-full bg-[#dc3545]"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full max-w-[40px] h-[3px] bg-gray-100 rounded-full" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 pt-2">{item.day}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chart Legend displaying consumption variables */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mt-6 pt-4 border-t border-black/5 text-gray-500">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <span className="w-3 h-3 rounded-full bg-[#dc3545]" />
                      Dictation (Standard word deductions with mode-based speed options)
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      ScribePro (Integrated messaging formatting & command actions)
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      MCP Mode (Financial operations via voice commands)
                    </div>
                  </div>
                </section>

                {/* Detailed Logs representing exact transactions filtered */}
                <section className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Usage Logs</h3>
                      <p className="text-xs text-gray-400 mt-1">Showing {filteredTransactions.length} items matching criteria</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {filteredTransactions.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-black/5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <th className="pb-3 font-semibold">Date & Time</th>
                            <th className="pb-3 font-semibold">Description</th>
                            <th className="pb-3 font-semibold">Mode</th>
                            <th className="pb-3 font-semibold">Meter / Metric</th>
                            <th className="pb-3 font-semibold">Status</th>
                            <th className="pb-3 font-semibold text-right">Word usage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 text-sm">
                          {filteredTransactions.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 text-gray-400 text-xs font-semibold">{row.date}</td>
                              <td className="py-4">
                                <div className="font-bold text-gray-900">{row.type}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {row.type === "ScribePro" || row.type === "Text Editing" ? "ScribePro smart formatting & context actions" : row.type === "MCP" ? "Financial operations via voice commands" : "Real-time voice-to-text dictation"}
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                  row.mode === "Ultrafast" 
                                    ? "bg-purple-500/10 text-purple-700 border-purple-200/50" 
                                    : row.mode === "Fast"
                                      ? "bg-green-500/10 text-green-700 border-green-200/50"
                                      : "bg-blue-500/10 text-blue-700 border-blue-200/50"
                                }`}>
                                  {row.mode}
                                </span>
                              </td>
                              <td className="py-4 font-medium text-gray-500 text-xs font-mono">
                                {row.type === "ScribePro" || row.type === "Text Editing" ? `${row.words} words` : `${row.duration} clip`}
                              </td>
                              <td className="py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status === "Successful"
                                    ? "bg-[#34a853]/10 text-[#34a853]"
                                    : "bg-red-500/10 text-red-600"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${
                                    row.status === "Successful" ? "bg-[#34a853]" : "bg-red-500"
                                  }`} />
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-4 font-mono font-bold text-gray-900 text-right">{(row.cost || 0).toFixed(1)} words</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-12 text-center text-gray-400 text-sm font-medium">
                        No transactions found matching the selected filters.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

           <SettingsModal 
            isOpen={isSettingsModalOpen} 
            onClose={() => setIsSettingsModalOpen(false)} 
            initialTab={settingsModalTab} billingTransactions={billingTransactions}
            currentPlanName={planInfo.name}
            proPlanDaysLeft={proPlanDaysLeft}
            onOpenTopUp={(curr, isPro) => {
              setTopUpCurrency(curr);
              setTopUpIsPro(isPro);
              setIsTopUpModalOpen(true);
            }}
            onOpenUpgrade={(curr, plan) => {
              setUpgradeCurrency(curr);
              setUpgradePlan(plan);
              setIsUpgradeModalOpen(true);
            }}
            firstName={profileFirstName}
            lastName={profileLastName}
            setFirstName={setProfileFirstName}
            setLastName={setProfileLastName}
            email={profileEmail}
            setEmail={setProfileEmail}
            isActualPro={planInfo.name !== "Free Trial"}
            onSignOut={() => setIsSignOutModalOpen(true)}
            onDeleteAllTranscripts={() => {
              setDeleteModal({ isOpen: true, type: 'all' });
            }}
          />
          <SignOutModal
            isOpen={isSignOutModalOpen}
            onClose={() => setIsSignOutModalOpen(false)}
            onConfirm={handleSignOutConfirm}
          />
          <TopUpModal 
            isOpen={isTopUpModalOpen} 
            onClose={() => setIsTopUpModalOpen(false)}
            email={profileEmail}
            currency={topUpCurrency}
            isActualPro={planInfo.name !== "Free Trial"}
            currentPlanName={planInfo.name}
            selectedProInSettings={topUpIsPro}
            proPlanDaysLeft={proPlanDaysLeft}
            onTopUpSuccess={async (wordsAdded, upgradedPlanName, priceString) => {
              // React states update
              setUserWords(prev => {
                const newWordsVal = prev + wordsAdded;
                
                // Update Supabase if online
                if (navigator.onLine) {
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                      const metadata = user.user_metadata || {};
                      supabase.auth.updateUser({
                        data: {
                          ...metadata,
                          user_words_balance: newWordsVal,
                          ...(upgradedPlanName ? { plan_name: upgradedPlanName, trial_start_date: new Date().toISOString() } : {})
                        }
                      }).catch(e => console.error("Failed to update user words in Supabase:", e));
                    }
                  }).catch(e => console.error("Failed to get user in Supabase:", e));
                }

                // Emit to Tauri event system to notify App.tsx immediately
                emit("user-words-updated", newWordsVal).catch(e => console.error("Failed to emit user-words-updated:", e));
                
                return newWordsVal;
              });

              if (upgradedPlanName) {
                setCurrentUserPlan(upgradedPlanName);
                setProPlanDaysLeft(30);
              }

              // Append to billing transaction history State
              const txnId = "TXN-" + Math.floor(10000 + Math.random() * 90000);
              const now = new Date();
              const dateStr = now.getFullYear() + "-" + 
                              String(now.getMonth() + 1).padStart(2, "0") + "-" + 
                              String(now.getDate()).padStart(2, "0") + " " + 
                              String(now.getHours() % 12 || 12).padStart(2, "0") + ":" + 
                              String(now.getMinutes()).padStart(2, "0") + " " + 
                              (now.getHours() >= 12 ? "PM" : "AM");

              const creditCardNum = Math.floor(1000 + Math.random() * 9000);
              const methodStr = `Monnify Card ending in ${creditCardNum}`;
              
              const isPlusOrPro = upgradedPlanName === "Ikor Plus" || upgradedPlanName === "Ikor Pro";
              const description = isPlusOrPro 
                ? `Word Top-Up Package & Upgrade to ${upgradedPlanName}` 
                : "Word Balance Top-Up (Pay-As-You-Go)";

              const newTxn = {
                id: txnId,
                date: dateStr,
                description: description,
                words: `+${wordsAdded.toLocaleString()} words`,
                amount: priceString || "₦1,500.00",
                status: "Successful",
                method: methodStr
              };

              setBillingTransactions(prev => [newTxn, ...prev]);
            }}
            mode="topup"
          />
          <UpgradeModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
            email={profileEmail}
            currency={upgradeCurrency}
            planName={upgradePlan}
            onUpgradeSuccess={(plan, priceString) => {
              setCurrentUserPlan(plan);
              let wordsVal = 0;
              if (plan === "Ikor Pro") {
                setUserWords(120000);
                setProPlanDaysLeft(30);
                wordsVal = 120000;
              } else if (plan === "Ikor Plus") {
                setUserWords(40000);
                setProPlanDaysLeft(30);
                wordsVal = 40000;
              } else {
                setUserWords(900);
                setProPlanDaysLeft(null);
                wordsVal = 900;
              }

              // Update Supabase if online
              if (navigator.onLine) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    const metadata = user.user_metadata || {};
                    supabase.auth.updateUser({
                      data: {
                        ...metadata,
                        user_words_balance: wordsVal,
                        plan_name: plan,
                        trial_start_date: new Date().toISOString()
                      }
                    }).catch(e => console.error("Failed to update user plan in Supabase:", e));
                  }
                }).catch(e => console.error("Failed to get user in Supabase:", e));
              }

              // Emit to Tauri event system to notify App.tsx immediately
              emit("user-words-updated", wordsVal).catch(e => console.error("Failed to emit user-words-updated:", e));

              // Append to billing transaction history State
              const txnId = "TXN-" + Math.floor(10000 + Math.random() * 90000);
              const now = new Date();
              const dateStr = now.getFullYear() + "-" + 
                              String(now.getMonth() + 1).padStart(2, "0") + "-" + 
                              String(now.getDate()).padStart(2, "0") + " " + 
                              String(now.getHours() % 12 || 12).padStart(2, "0") + ":" + 
                              String(now.getMinutes()).padStart(2, "0") + " " + 
                              (now.getHours() >= 12 ? "PM" : "AM");

              const creditCardNum = Math.floor(1000 + Math.random() * 9000);
              const methodStr = `Monnify Card ending in ${creditCardNum}`;

              const newTxn = {
                id: txnId,
                date: dateStr,
                description: `Ikor ${plan === "Ikor Pro" ? "Pro" : "Plus"} Monthly Subscription Upgrade`,
                words: `+${wordsVal.toLocaleString()} words`,
                amount: priceString || "₦3,000.00",
                status: "Successful",
                method: methodStr
              };

              setBillingTransactions(prev => [newTxn, ...prev]);
            }}
          />
          <ExhaustedModal
            isOpen={isExhaustedModalOpen}
            onClose={() => setIsExhaustedModalOpen(false)}
            reason={exhaustedReason}
            onTopUp={() => {
              setTopUpCurrency('NGN');
              setTopUpIsPro(false);
              setIsTopUpModalOpen(true);
            }}
            onUpgrade={() => {
              setUpgradeCurrency('NGN');
              setUpgradePlan(currentUserPlan === "Ikor Plus" ? "Ikor Pro" : "Ikor Plus");
              setIsUpgradeModalOpen(true);
            }}
          />
          <AddTermModal
            isOpen={isAddTermModalOpen}
            onClose={() => setIsAddTermModalOpen(false)}
            onAdd={(term, correction) => {
              setDictionary([...dictionary, { term, correction }]);
              setOnboardingTasks(prev => prev.map(t => t.id === 'personal-term' ? { ...t, completed: true } : t));
            }}
          />
          <EditTermModal
            isOpen={isEditTermModalOpen}
            onClose={() => setIsEditTermModalOpen(false)}
            onEdit={(index, term, correction) => {
              const newDict = [...dictionary];
              newDict[index] = { term, correction };
              setDictionary(newDict);
            }}
            index={editingTerm?.index ?? -1}
            initialTerm={editingTerm?.term ?? ""}
            initialCorrection={editingTerm?.correction}
          />
          <AddShortcutModal
            isOpen={isAddShortcutModalOpen}
            onClose={() => setIsAddShortcutModalOpen(false)}
            onAdd={(original, replacement) => {
              setShortcuts([...shortcuts, { original, replacement }]);
              setOnboardingTasks(prev => prev.map(t => t.id === 'personal-shortcut' ? { ...t, completed: true } : t));
            }}
          />
          <EditShortcutModal
            isOpen={isEditShortcutModalOpen}
            onClose={() => setIsEditShortcutModalOpen(false)}
            onEdit={(index, original, replacement) => {
              const newShortcuts = [...shortcuts];
              newShortcuts[index] = { original, replacement };
              setShortcuts(newShortcuts);
            }}
            index={editingShortcut?.index ?? -1}
            initialOriginal={editingShortcut?.original ?? ""}
            initialReplacement={editingShortcut?.replacement ?? ""}
          />
          <DeleteModal 
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal(prev => ({...prev, isOpen: false}))}
            type={deleteModal.type}
            onConfirm={async () => {
                let updatedHistory: any[] = [];
                if (deleteModal.type === 'single' && deleteModal.transcriptId) {
                    updatedHistory = transcriptHistory.filter(i => i.id !== deleteModal.transcriptId);
                    setTranscriptHistory(updatedHistory);
                    setActionFeedback({id: deleteModal.transcriptId, message: 'Deleted!'});
                    setTimeout(() => setActionFeedback(null), 2000);
                } else if (deleteModal.type === 'all') {
                    setTranscriptHistory([]);
                    updatedHistory = [];
                }
                try {
                    const store = await load("store.json");
                    await store.set("transcriptHistory", updatedHistory);
                    await store.save();
                } catch (e) {
                    console.error("Failed to save transcriptHistory after deletion:", e);
                }
            }}
          />
          <ReportTranscriptModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            onSubmit={(category, note) => {
              setIsReportModalOpen(false);
              console.log(`Submitted transcript report for ${selectedTranscriptId}: category=${category}, note=${note}`);
              
              // Show toast feedback with custom bottom-center toast
              setShowFeedbackToast(true);
              
              // Automatically hide after 4 seconds
              setTimeout(() => {
                setShowFeedbackToast(false);
              }, 4000);
            }}
          />

           {activeSection === "Dictionary" && (
            <div className={`mx-auto w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-8">
                <h2 className="text-3xl font-sans font-bold mb-2">Keywords</h2>
                <p className="text-gray-500">Help Ikor know when to use the words that matter to you.</p>
                
                <div className="inline-flex p-1 bg-black/[0.04] rounded-2xl gap-1 mt-6">
                  <button 
                    onClick={() => {
                      setActiveDictTab("Terms");
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeDictTab === "Terms" ? "bg-white text-black shadow-sm border border-black/[0.03]" : "text-gray-500 hover:text-black hover:bg-black/[0.02]"}`}
                  >
                    <Book size={14} /> Personal Terms
                  </button>
                  <button 
                    onClick={() => {
                      setActiveDictTab("Shortcuts");
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeDictTab === "Shortcuts" ? "bg-white text-black shadow-sm border border-black/[0.03]" : "text-gray-500 hover:text-black hover:bg-black/[0.02]"}`}
                  >
                    <Zap size={14} /> Personal Shortcuts
                  </button>
                </div>
              </header>

              <div className="space-y-6">
                <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <div className="flex gap-3 mb-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-[#f8f7f0] pl-12 pr-6 py-3 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm text-gray-800 placeholder-text-gray-400"
                      />
                    </div>
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="p-3 bg-[#f8f7f0] hover:bg-black/5 text-gray-500 rounded-2xl transition-all"
                      title="Clear Search"
                    >
                       <RefreshCw size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (activeDictTab === "Terms") {
                          setIsAddTermModalOpen(true);
                        } else {
                          setIsAddShortcutModalOpen(true);
                        }
                      }}
                      className="bg-red-500 text-white px-8 py-3 rounded-2xl font-bold hover:opacity-90 transition-all text-sm shrink-0"
                    >
                      + Add {activeDictTab === "Terms" ? "Term" : "Shortcut"}
                    </button>
                  </div>
                  
                  {activeDictTab === "Terms" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(() => {
                        const filtered = dictionary.filter(entry => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return entry.term.toLowerCase().includes(q) || (entry.correction && entry.correction.toLowerCase().includes(q));
                        });
                        
                        if (filtered.length === 0) {
                          return <div className="col-span-full py-8 text-center text-sm text-gray-400 italic">No matching words found.</div>;
                        }

                        return filtered.map((entry, index) => {
                          const originalIndex = dictionary.findIndex(d => d.term === entry.term && d.correction === entry.correction);
                          return (
                            <div 
                              key={index} 
                              className="bg-white border border-black/5 text-gray-800 px-5 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-between gap-4 group hover:border-black/10 hover:shadow-sm transition-all"
                            >
                              <span className="truncate">
                                {entry.term} {entry.correction && <span className="text-gray-400 font-normal mx-1 font-mono">→</span>} {entry.correction && <span className="text-red-500 font-bold">{entry.correction}</span>}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button 
                                  onClick={() => {
                                    setEditingTerm({index: originalIndex !== -1 ? originalIndex : index, term: entry.term, correction: entry.correction});
                                    setIsEditTermModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-black/5 rounded-lg transition-colors"
                                  title="Edit Term"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const indexToRemove = originalIndex !== -1 ? originalIndex : index;
                                    setDictionary(dictionary.filter((_, i) => i !== indexToRemove));
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-black/5 rounded-lg transition-colors"
                                  title="Delete Term"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {activeDictTab === "Shortcuts" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const filtered = shortcuts.filter(s => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return s.original.toLowerCase().includes(q) || s.replacement.toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return <div className="col-span-full py-8 text-center text-sm text-gray-400 italic">No matching shortcuts found.</div>;
                        }

                        return filtered.map((s, idx) => (
                          <div 
                            key={idx} 
                            className="bg-[#f8f7f0]/40 border border-black/[0.04] p-6 rounded-[24px] flex flex-col justify-between min-h-[120px] group hover:bg-white hover:border-black/10 hover:shadow-xs transition-all relative"
                          >
                            <div className="pr-10">
                              <span className="text-gray-400 font-semibold text-xs tracking-wider uppercase block mb-1">Shortcut Phrase</span>
                              <div className="text-gray-800 font-bold text-base leading-snug" title={s.original}>{s.original}</div>
                              <div className="flex items-start gap-1.5 text-gray-650 mt-3 pt-3 border-t border-black/[0.03] text-sm/relaxed font-medium">
                                <span className="text-gray-300 font-mono text-base -mt-0.5 select-none">↳</span>
                                <span className="break-words text-gray-700 select-all">{s.replacement}</span>
                              </div>
                            </div>
                            
                            <div className="absolute bottom-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingShortcut({ index: idx, original: s.original, replacement: s.replacement });
                                  setIsEditShortcutModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-black/5 rounded-lg transition-all"
                                title="Edit Shortcut"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setShortcuts(shortcuts.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-black/5 rounded-lg transition-all"
                                title="Delete Shortcut"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Style Guide" && (
            <div className={`mx-auto w-full transition-all duration-300 relative ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-8">
                <h2 className="text-3xl font-sans font-bold mb-2 text-gray-900">Style Guide</h2>
                <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
                  Ikor learns from your writing style and preferences to improve your dictation and editing experience. 
                  Tone applies globally. Writing style and personal tweaks apply to <span className="font-bold text-gray-800">ScribePro</span>.
                </p>

                {/* Categories Tabs Selector */}
                <div className="flex flex-wrap gap-2 mt-8">
                  {[
                    { id: "Email" as const, icon: Mail, label: "Email" },
                    { id: "Work Messages" as const, icon: MessageSquare, label: "Work Messages" },
                    { id: "Casual Messages" as const, icon: MessageCircle, label: "Casual Messages" },
                    { id: "Other" as const, icon: LayoutGrid, label: "Other" }
                  ].map((tab) => {
                    const isActive = styleGuideTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setStyleGuideTab(tab.id);
                          setHabitInput(""); // reset input field
                        }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all ${
                          isActive 
                            ? "bg-black text-white shadow-sm" 
                            : "bg-[#f2f0e4]/50 border border-black/5 text-gray-500 hover:text-black hover:bg-black/5"
                        }`}
                      >
                        <tab.icon size={14} className={isActive ? "text-white" : "text-gray-400"} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </header>

              {/* Dynamic Tab Content with framer-motion */}
              <motion.div 
                key={styleGuideTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* 1. App Integration Block */}
                <div className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm flex items-center gap-4">
                  {/* App Bubbles Column */}
                  <div className="flex -space-x-2 shrink-0">
                    {styleGuideTab === "Email" && (
                      <>
                        {/* Gmail Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-30">
                          <img src="/app-logos/gmail.png" className="w-5.5 h-5.5 object-contain" alt="Gmail" />
                        </div>
                        {/* Microsoft Outlook Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-20">
                          <img src="/app-logos/outlook.png" className="w-5.5 h-5.5 object-contain" alt="Outlook" />
                        </div>
                        {/* Apple Mail Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-10">
                          <img src="/app-logos/applemail.png" className="w-5.5 h-5.5 object-contain" alt="Apple Mail" />
                        </div>
                      </>
                    )}

                    {styleGuideTab === "Work Messages" && (
                      <>
                        {/* Slack Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-20">
                          <img src="/app-logos/slack.png" className="w-6 h-6 object-contain" alt="Slack" />
                        </div>
                        {/* Microsoft Teams Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-10">
                          <img src="/app-logos/teams.png" className="w-5.5 h-5.5 object-contain" alt="Teams" />
                        </div>
                      </>
                    )}

                    {styleGuideTab === "Casual Messages" && (
                      <>
                        {/* WhatsApp Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-30">
                          <img src="/app-logos/whatsapp.png" className="w-5.5 h-5.5 object-contain" alt="WhatsApp" />
                        </div>
                        {/* Facebook Messenger Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-20">
                          <img src="/app-logos/messenger.png" className="w-5.5 h-5.5 object-contain" alt="Messenger" />
                        </div>
                        {/* Apple iMessage Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-10">
                          <img src="/app-logos/imessage.png" className="w-5.5 h-5.5 object-contain" alt="iMessage" />
                        </div>
                      </>
                    )}

                    {styleGuideTab === "Other" && (
                      <>
                        {/* OpenAI / ChatGPT Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-30">
                          <img src="/app-logos/openai.png" className="w-5.5 h-5.5 object-contain" alt="OpenAI" />
                        </div>
                        {/* Apple Notes Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-20">
                          <img src="/app-logos/applenotes.png" className="w-5.5 h-5.5 object-contain" alt="Apple Notes" />
                        </div>
                        {/* Notion Logo */}
                        <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-xs shrink-0 relative z-10">
                          <img src="/app-logos/notion.png" className="w-5.5 h-5.5 object-contain" alt="Notion" />
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <h4 className="font-sans font-bold text-sm text-gray-900 leading-tight">
                      {styleGuideTab === "Email" && "This style applies in email applications"}
                      {styleGuideTab === "Work Messages" && "This style applies in work messengers"}
                      {styleGuideTab === "Casual Messages" && "This style applies in personal messengers"}
                      {styleGuideTab === "Other" && "This style applies in all other apps"}
                    </h4>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      We'll use this information to match your writing style when you dictate. No personal training logs are ever leaked.
                    </p>
                  </div>
                </div>

                {/* 2. Tone selection grid */}
                <div className="space-y-4">
                  <span className="text-xs uppercase font-black tracking-wider text-gray-400 block pb-1 border-b border-black/[0.03]">Tone</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      let tonesList: Array<{ id: string; label: string; sub: string; preview: React.ReactNode }> = [];
                      
                      if (styleGuideTab === "Email") {
                        tonesList = [
                          {
                            id: "Formal",
                            label: "Formal",
                            sub: "Professional (default)",
                            preview: (
                              <div className="bg-gray-50 border border-black/5 rounded-2xl p-4 space-y-2 mt-4 text-[11px] font-sans text-gray-700 leading-relaxed text-left">
                                <span className="font-bold text-gray-400 font-mono block text-[9px] uppercase tracking-wider">Recipient: Mark Watson</span>
                                <p className="font-bold text-gray-900 border-b border-black/5 pb-1">Hi Mark,</p>
                                <p>Hope you're doing well. I wanted to update you here. Let me know your thoughts.</p>
                                <div className="pt-2 border-t border-dashed border-black/5 mt-2">
                                  <p className="font-bold">Best,</p>
                                  <p className="text-gray-500">Alex</p>
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Excited",
                            label: "Excited",
                            sub: "More exclamation marks",
                            preview: (
                              <div className="bg-emerald-50/25 border border-emerald-100/50 rounded-2xl p-4 space-y-2 mt-4 text-[11px] font-sans text-gray-750 leading-relaxed text-left">
                                <span className="font-bold text-emerald-600 font-mono block text-[9px] uppercase tracking-wider">Recipient: Mark Watson</span>
                                <p className="font-bold text-emerald-800 border-b border-emerald-100/50 pb-1">Hi Mark!</p>
                                <p className="text-gray-800">Hope you're doing well! I wanted to update you here. Let me know your thoughts!</p>
                                <div className="pt-2 border-t border-dashed border-emerald-100/30 mt-2">
                                  <p className="font-bold text-emerald-850">Best,</p>
                                  <p className="text-emerald-600 font-bold">Alex</p>
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Casual",
                            label: "Casual",
                            sub: "Less punctuation",
                            preview: (
                              <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl p-4 space-y-2 mt-4 text-[11px] font-sans text-gray-700 leading-relaxed text-left">
                                <span className="font-bold text-amber-500 font-mono block text-[9px] uppercase tracking-wider">Recipient: Mark Watson</span>
                                <p className="font-bold text-amber-800 border-b border-amber-100/30 pb-1">Hi Mark,</p>
                                <p className="text-gray-750">Hope you're doing well - I wanted to update you here, let me know your thoughts.</p>
                                <div className="pt-2 border-t border-dashed border-amber-105/30 mt-2">
                                  <p className="font-bold text-amber-800">Best,</p>
                                  <p className="text-gray-500">Alex</p>
                                </div>
                              </div>
                            )
                          }
                        ];
                      } else if (styleGuideTab === "Work Messages") {
                        tonesList = [
                          {
                            id: "Formal",
                            label: "Formal",
                            sub: "Professional (default)",
                            preview: (
                              <div className="bg-gray-50 border border-black/5 rounded-2xl p-4 mt-4 text-[11px] space-y-2 text-left">
                                <div className="flex items-center gap-1 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Slack
                                </div>
                                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-black/[0.03]">
                                  <div className="w-6 h-6 rounded-full bg-gray-250 flex items-center justify-center font-bold text-gray-655 text-[10px] shrink-0">JK</div>
                                  <div>
                                    <span className="font-black text-gray-900 block text-[10px]">Jason Kim</span>
                                    <span className="text-gray-600 block mt-0.5 leading-tight">Hey, how's it going? Just checking in.</span>
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Excited",
                            label: "Excited",
                            sub: "More exclamation marks",
                            preview: (
                              <div className="bg-[#FAF8F5] border border-emerald-50 rounded-2xl p-4 mt-4 text-[11px] space-y-2 text-left">
                                <div className="flex items-center gap-1 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Slack
                                </div>
                                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-black/[0.03]">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-[10px] shrink-0">JK</div>
                                  <div>
                                    <span className="font-black text-gray-900 block text-[10px]">Jason Kim</span>
                                    <span className="text-gray-700 block mt-0.5 leading-tight font-medium">Hey, how's it going?! Just checking in! 🌟</span>
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Casual",
                            label: "Casual",
                            sub: "Less punctuation",
                            preview: (
                              <div className="bg-gray-50 border border-black/5 rounded-2xl p-4 mt-4 text-[11px] space-y-2 text-left">
                                <div className="flex items-center gap-1 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Slack
                                </div>
                                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-black/[0.03]">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-[10px] shrink-0">JK</div>
                                  <div>
                                    <span className="font-black text-gray-900 block text-[10px]">Jason Kim</span>
                                    <span className="text-gray-655 block mt-0.5 leading-tight">hey, how's it going? just checking in</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        ];
                      } else if (styleGuideTab === "Casual Messages") {
                        tonesList = [
                          {
                            id: "Formal",
                            label: "Formal",
                            sub: "Professional (default)",
                            preview: (
                              <div className="mt-4 flex flex-col items-end gap-1 font-sans text-xs">
                                <span className="text-[8px] font-mono text-gray-400 self-start">Personal Chat Thread</span>
                                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[90%] text-left leading-normal font-sans text-[11px] font-medium mt-2">
                                  Hey, are we still on for dinner? Thinking 7 works, unless you need to change it.
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Casual",
                            label: "Casual",
                            sub: "Less punctuation",
                            preview: (
                              <div className="mt-4 flex flex-col items-end gap-1 font-sans text-xs">
                                <span className="text-[8px] font-mono text-gray-400 self-start">Personal Chat Thread</span>
                                <div className="bg-[#128C7E] text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[90%] text-left leading-normal font-sans text-[11px] font-medium mt-2">
                                  Hey are we still on for dinner later? Thinking 7 works unless you need to change it
                                </div>
                              </div>
                            )
                          },
                          {
                            id: "Extremely Casual",
                            label: "Extremely Casual",
                            sub: "Less punctuation & no caps",
                            preview: (
                              <div className="mt-4 flex flex-col items-end gap-1 font-sans text-xs">
                                <span className="text-[8px] font-mono text-gray-400 self-start">Personal Chat Thread</span>
                                <div className="bg-gray-600 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[90%] text-left leading-normal font-mono text-[11px] mt-2">
                                  hey are we still on for dinner later? thinking 7 works unless u need to change it
                                </div>
                              </div>
                            )
                          }
                        ];
                      } else {
                        // Other applications (ChatGPT, Notes, Notion)
                        tonesList = [
                          {
                            id: "Formal",
                            label: "Formal",
                            sub: "Professional (default)",
                            preview: (
                              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 mt-4 space-y-1 text-left text-[11px]">
                                <span className="font-bold text-amber-800 text-[10px] block border-b border-amber-100 pb-1">📝 Notes</span>
                                <p className="text-gray-700 italic pt-1">In all honesty, super excited to talk to you tomorrow. Let me know when works.</p>
                              </div>
                            )
                          },
                          {
                            id: "Excited",
                            label: "Excited",
                            sub: "More exclamation marks",
                            preview: (
                              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 mt-4 space-y-1 text-left text-[11px]">
                                <span className="font-bold text-amber-800 text-[10px] block border-b border-amber-100 pb-1">📝 Notes</span>
                                <p className="text-emerald-705 font-bold pt-1">In all honesty, super excited to talk to you tomorrow. Let me know when works!!! ✨</p>
                              </div>
                            )
                          },
                          {
                            id: "Casual",
                            label: "Casual",
                            sub: "Less punctuation",
                            preview: (
                              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 mt-4 space-y-1 text-left text-[11px]">
                                <span className="font-bold text-amber-800 text-[10px] block border-b border-amber-100 pb-1">📝 Notes</span>
                                <p className="text-gray-600 pt-1 font-medium">In all honesty, super excited to talk to you tomorrow. Let me know when works</p>
                              </div>
                            )
                          }
                        ];
                      }

                      return tonesList.map((tone) => {
                        const isSelected = selectedTones[styleGuideTab] === tone.id;
                        return (
                          <div
                            key={tone.id}
                            onClick={() => {
                              setSelectedTones(prev => ({ ...prev, [styleGuideTab]: tone.id }));
                            }}
                            className={`p-6 bg-white rounded-[24px] border transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected 
                                ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10" 
                                : "border-black/5 hover:border-black/10 hover:shadow-xs"
                            }`}
                          >
                            <div className="absolute top-5 left-5">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 border border-emerald-600 flex items-center justify-center">
                                  <Check size={12} className="text-white stroke-[3.5]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-gray-300" />
                              )}
                            </div>

                            <div className="pt-2 text-left mb-3">
                              <h5 className="font-sans font-black text-sm text-gray-900 block pl-7">{tone.label}</h5>
                              <p className="text-xs text-gray-400 font-semibold block pl-7 mt-0.5">{tone.sub}</p>
                            </div>

                            {tone.preview}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3. Writing Length selection section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-black/[0.03]">
                    <span className="text-xs uppercase font-black tracking-wider text-gray-400 block">Writing length</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                      ScribePro
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      let lengths: Array<{ id: string; label: string; desc: string }> = [];
                      if (styleGuideTab === "Email") {
                        lengths = [
                          { id: "Direct", label: "Direct", desc: "Quick reply, no fluff." },
                          { id: "Natural", label: "Natural", desc: "Standard email length." },
                          { id: "Thorough", label: "Thorough", desc: "Adds context and sign-off." }
                        ];
                      } else if (styleGuideTab === "Work Messages") {
                        lengths = [
                          { id: "Direct", label: "Direct", desc: "Quick reply, no fluff." },
                          { id: "Natural", label: "Natural", desc: "Default message length." },
                          { id: "Thorough", label: "Thorough", desc: "Adds context when useful." }
                        ];
                      } else if (styleGuideTab === "Casual Messages") {
                        lengths = [
                          { id: "Direct", label: "Direct", desc: "Just the reply. A few words." },
                          { id: "Natural", label: "Natural", desc: "Default chat length. Conversational." },
                          { id: "Thorough", label: "Thorough", desc: "Adds details when useful." }
                        ];
                      } else {
                        lengths = [
                          { id: "Direct", label: "Direct", desc: "Short note, no extra context." },
                          { id: "Natural", label: "Natural", desc: "Default note length." },
                          { id: "Thorough", label: "Thorough", desc: "Adds detail and references." }
                        ];
                      }

                      return lengths.map((len) => {
                        const isSelected = selectedLengths[styleGuideTab] === len.id;
                        return (
                          <div
                            key={len.id}
                            onClick={() => {
                              setSelectedLengths(prev => ({ ...prev, [styleGuideTab]: len.id }));
                            }}
                            className={`p-5 bg-white rounded-2xl border text-left transition-all cursor-pointer relative flex items-center gap-3.5 ${
                              isSelected 
                                ? "border-emerald-500 shadow-sm ring-2 ring-emerald-500/5 bg-emerald-50/10" 
                                : "border-black/5 hover:border-black/10 bg-[#FAF8F5]/30"
                            }`}
                          >
                            {isSelected ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <Check size={10} className="text-white stroke-[4]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                            )}
                            <div>
                              <h6 className="font-sans font-bold text-xs text-gray-900">{len.label}</h6>
                              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{len.desc}</p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 4. Add small specific habits */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-black/[0.03]">
                    <span className="text-xs uppercase font-black tracking-wider text-gray-400 block leading-tight">
                      Add small, specific habits like sign-offs, words you avoid, or names ScribePro should know
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 shrink-0">
                      ScribePro
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-black/5 space-y-4">
                    {/* Add-habit mini form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!habitInput.trim()) return;
                        
                        setStyleHabits(prev => ({
                          ...prev,
                          [styleGuideTab]: [...(prev[styleGuideTab] || []), habitInput.trim()]
                        }));
                        setHabitInput("");
                      }}
                      className="flex gap-3"
                    >
                      <input 
                        type="text"
                        value={habitInput}
                        onChange={(e) => setHabitInput(e.target.value)}
                        placeholder={
                          styleGuideTab === "Email" ? `e.g. sign off with "Thanks, Allan"` :
                          styleGuideTab === "Work Messages" ? `e.g. break lines more often, avoid filler words` :
                          styleGuideTab === "Casual Messages" ? `e.g. don't use emojis, keep text single-lined` :
                          `e.g. keep notes formatted with bullet points`
                        }
                        className="flex-1 bg-white border border-black/5 rounded-2xl px-5 py-3.5 text-xs text-gray-850 font-medium outline-none shadow-xs focus:border-red-500/30 focus:ring-2 focus:ring-red-500/10 transition-all font-sans"
                      />
                      <button
                        type="submit"
                        disabled={!habitInput.trim()}
                        className="bg-black text-white px-6 py-3.5 rounded-2xl text-xs font-black tracking-wide hover:bg-black/80 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        Add Rule
                      </button>
                    </form>

                    {/* Active Rules List */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 uppercase font-black font-sans tracking-wide block">Active style rules for {styleGuideTab}:</span>
                      {(!styleHabits[styleGuideTab] || styleHabits[styleGuideTab].length === 0) ? (
                        <p className="text-xs text-gray-400 italic font-medium">No custom rules added yet for this application context. Rules customize how ScribePro transcribes and styles dictate actions.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {styleHabits[styleGuideTab].map((habit, hIdx) => (
                            <div 
                              key={hIdx} 
                              className="px-3.5 py-1.5 bg-white text-gray-800 border border-black/5 rounded-xl text-xs font-semibold flex items-center gap-2 hover:border-black/10 transition-all shadow-2xs"
                            >
                              <span>{habit}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setStyleHabits(prev => ({
                                    ...prev,
                                    [styleGuideTab]: prev[styleGuideTab].filter((_, idx) => idx !== hIdx)
                                  }));
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-md hover:bg-black/5 cursor-pointer"
                                title="Remove Rule"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Center Success Toast */}
      <AnimatePresence>
        {showFeedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10020] bg-neutral-900/95 backdrop-blur-md text-white px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl border border-neutral-800"
          >
            <div className="w-5 h-5 rounded-full bg-[#dc3545]/20 border border-[#dc3545]/40 flex items-center justify-center">
              <Check size={12} className="text-[#ff4d5a]" strokeWidth={3} />
            </div>
            <span className="text-xs font-bold leading-none pr-1.5 tracking-tight text-white/95 font-sans">
              Thank you for helping us improve Ikor
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
