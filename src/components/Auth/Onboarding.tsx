import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  HelpCircle, 
  FileText, 
  MessageSquare, 
  Book, 
  Mail, 
  Type, 
  LayoutGrid, 
  MessageCircle, 
  Lock, 
  Sparkles, 
  X, 
  ChevronDown, 
  CheckCircle2
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { getCurrentWindow } from "@tauri-apps/api/window";
const isTauri = !!(window as any).__TAURI_INTERNALS__;

// --- CONFETTI CELEBRATION COMPONENT FOR FINAL ONBOARDING STEP ---
const ConfettiCelebration = () => {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", 
    "#6366f1", "#8b5cf6", "#ec4899"
  ];

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const pieces = React.useMemo(() => {
    return Array.from({ length: 110 }).map((_, i) => {
      const isLeft = i % 2 === 0;
      const startX = isLeft ? dimensions.width * 0.05 : dimensions.width * 0.95;
      const startY = dimensions.height * 0.7; // Shoot from lower third

      // Left shoots up-right, Right shoots up-left
      const angle = isLeft 
        ? -Math.random() * (Math.PI / 3.5) - (Math.PI / 10) 
        : -Math.random() * (Math.PI / 3.5) - (Math.PI * 0.62);

      const velocity = Math.random() * 220 + 200; // strong burst force
      const burstX = Math.cos(angle) * velocity;
      const burstY = Math.sin(angle) * velocity;

      const size = Math.random() * 8 + 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = Math.random() > 0.6 ? "rect" : (Math.random() > 0.3 ? "circle" : "ribbon");
      const duration = Math.random() * 2.5 + 3.0; // 3.0 to 5.5s
      const delay = Math.random() * 0.25; 
      const rotation = Math.random() * 1440 - 720; 
      const dropY = dimensions.height + 150;
      const driftX = (Math.random() - 0.5) * 250;

      return {
        id: i,
        size,
        color,
        shape,
        startX,
        startY,
        burstX,
        burstY,
        dropY,
        driftX,
        duration,
        delay,
        rotation
      };
    });
  }, [dimensions.width, dimensions.height]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {pieces.map((p) => {
        const width = p.size;
        const height = p.shape === "ribbon" ? p.size * 2.8 : p.size;
        const borderRadius = p.shape === "circle" ? "50%" : "2px";

        return (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 1, 
              scale: 0.1,
              x: p.startX,
              y: p.startY,
              rotate: 0
            }}
            animate={{ 
              x: [
                p.startX, 
                p.startX + p.burstX, 
                p.startX + p.burstX + p.driftX
              ],
              y: [
                p.startY, 
                p.startY + p.burstY, 
                p.dropY
              ],
              rotate: p.rotation,
              scale: [0.1, 1.1, 1, 0.7],
              opacity: [1, 1, 0.9, 0]
            }}
            transition={{ 
              duration: p.duration, 
              delay: p.delay, 
              ease: ["easeOut", "easeIn", "linear"]
            }}
            className="absolute"
            style={{
              width,
              height,
              backgroundColor: p.color,
              borderRadius,
            }}
          />
        );
      })}
    </div>
  );
};

// --- WAVEFORM PATTERN FROM DASHBOARD FOR UPGRADE CARD ---
const WaveformPattern = ({ isDark }: { isDark: boolean }) => {
  const fillColor = isDark ? "#ffffff" : "#000000";
  
  const barHeights = [
    25, 40, 30, 50, 35, 60, 45, 70, 40, 30, 45, 60, 75, 55, 40, 65, 85, 110, 90, 70,
    55, 80, 100, 120, 140, 115, 85, 60, 75, 90, 115, 130, 105, 80, 55, 45, 60, 70, 85,
    65, 50, 40, 55, 70, 50, 35, 45, 30, 20, 35, 40, 25, 45, 55, 40, 30, 20, 10
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes speakWaveOnboarding {
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
        .speaking-bar-onb {
          transform-box: fill-box;
          transform-origin: center;
          animation-name: speakWaveOnboarding;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
      `}</style>
      <svg
        className="w-[105%] h-5/6 opacity-10 px-2"
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
          
          const duration = (0.6 + (index % 5) * 0.15) * 1.5625;
          const delay = (-(index % 7) * 0.18) * 1.5625;

          return (
            <rect
              key={index}
              className="speaking-bar-onb"
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

interface OnboardingProps {
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  onComplete: (selections: OnboardingSelections) => void;
  onBackToAuth: () => void;
  onStepChange?: (step: number) => void;
}

export interface OnboardingSelections {
  hearAboutUs: string | null;
  youtubeChannel?: string | null;
  workType: string | null;
  roleType: string | null;
  spendingTypingAreas: string[];
  dataMode: "improve" | "privacy";
  selectedMicrophone: string;
  customShortcut: string;
  firstUseCategory: string;
}

export default function Onboarding({ user, onComplete, onBackToAuth, onStepChange }: OnboardingProps) {
  // Steps list:
  // 1. WELCOME_SURVEY (Where did you hear about us?)
  // 2. WORK_SURVEY (Tell us about yourself)
  // 3. TYPING_SURVEY (Where do you spend time typing)
  // 4. DATA_CONTROL (You control your data)
  // 5. MIC_TEST (Test your microphone)
  // [REMOVED STEP 6: Keyboard shortcut text is bypassed directly to allow seamless user adoption]
  // 6. PRO_WELCOME (Upgraded card / Ikor Plus and wave animations)
  // 7. FIRST_USE (Goal selections choice)
  
  const [step, setStepInternal] = useState<number>(1);
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

  // Wrap setStep to notify parent of step changes
  const setStep = (updater: number | ((prev: number) => number)) => {
    setStepInternal((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onStepChange?.(next);
      return next;
    });
  };
  const [hearAboutUs, setHearAboutUs] = useState<string | null>(null);
  const [youtubeChannel, setYoutubeChannel] = useState<string | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  const [typingAreas, setTypingAreas] = useState<string[]>([]);
  
  // Default selection mode of data page is Privacy Mode
  const [dataMode, setDataMode] = useState<"improve" | "privacy">("privacy");
  
  // Specify custom input states for "Other" choices
  const [customHearAboutUs, setCustomHearAboutUs] = useState<string>("");
  const [customWorkType, setCustomWorkType] = useState<string>("");

  // Microphone screen controls
  const [micState, setMicState] = useState<"not_tested" | "detecting" | "success" | "error">("not_tested");
  const [selectedMic, setSelectedMic] = useState<string>("auto-detect");
  const [isMicDropdownOpen, setIsMicDropdownOpen] = useState(false);
  const [voicesBars, setVoicesBars] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  // First Use screen
  const [selectedFirstUse, setSelectedFirstUse] = useState<string>("Take a note");

  const [microphoneDevices, setMicrophoneDevices] = useState<{id: string, label: string}[]>([
    { id: "auto-detect", label: "Auto-detect (Array)" }
  ]);
  const micDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (micDropdownRef.current && !micDropdownRef.current.contains(event.target as Node)) {
        setIsMicDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let isActive = true;

    const startMicTesting = async () => {
      try {
        const response: {default_id: string | null, devices: {id: string, label: string}[]} = await invoke("get_audio_devices");
        const uniqueMics = Array.from(new Map(response.devices.map(m => [m.id, m])).values());
        
        if (!isActive) return;

        // Build dropdown list: Auto-detect + detected physical mics + System Default
        const dropdownDevices: {id: string, label: string}[] = [
          { id: "auto-detect", label: "Auto-detect (Recommended)" },
          ...uniqueMics,
          { id: "system-default", label: "System Default" }
        ];
        setMicrophoneDevices(dropdownDevices);
        
        let targetMic = selectedMic;
        if (uniqueMics.length > 0 && selectedMic === "auto-detect") {
          targetMic = response.default_id || uniqueMics[0].id;
          setSelectedMic(targetMic);
        }

        unlisten = await listen<number>("mic_volume_update", (event) => {
          setVoicesBars(prev => {
             return [...prev.slice(1), Math.floor(event.payload / 100 * 8) + 1];
          });
        });

        await invoke("start_mic_test", { deviceId: targetMic === "auto-detect" ? "system-default" : targetMic });
      } catch (err) {
        console.warn("Failed to start native mic test:", err);
      }
    };

    if (step === 5) {
      startMicTesting();
    } else {
      invoke("stop_mic_test").catch(() => {});
    }

    return () => {
      isActive = false;
      if (unlisten) unlisten();
      invoke("stop_mic_test").catch(() => {});
    };
  }, [step, selectedMic]);

  const displayName = user?.lastName || "User";

  // (Native volume listener handles voicesBars now)

  // Auto-hide success toast after 3 seconds
  useEffect(() => {
    if (micState === "success") {
      const timer = setTimeout(() => {
        setMicState("not_tested");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [micState]);

  const handleToggleTypingArea = (area: string) => {
    setTypingAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleNext = () => {
    if (step < 7) {
      setStep(prev => prev + 1);
    } else {
      // Resolve final submission strings
      const finalHearAbout = hearAboutUs === "Other" && customHearAboutUs.trim() ? customHearAboutUs.trim() : hearAboutUs;
      const finalWork = workType === "Other" && customWorkType.trim() ? customWorkType.trim() : workType;

      onComplete({
        hearAboutUs: finalHearAbout,
        youtubeChannel,
        workType: finalWork,
        roleType: null,
        spendingTypingAreas: typingAreas,
        dataMode,
        selectedMicrophone: selectedMic,
        customShortcut: "Ctrl + Win",
        firstUseCategory: selectedFirstUse
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      onBackToAuth();
    }
  };

  // Status mapping to top progress bar (4 sections matching updated flow path elements)
  const getProgressSectionIndex = () => {
    if (step <= 1) return 1; // SIGN UP
    if (step <= 4) return 2; // PERMISSIONS (Work, Typing place, Data toggle)
    if (step === 5) return 3; // SET UP (Mic verify checks)
    return 4; // PERSONALIZE (Bonus card, goals selections)
  };

  const currentSection = getProgressSectionIndex();
  const isEndStep = step >= 6;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (isEndStep && e.target === e.currentTarget) {
      onComplete({
        hearAboutUs: hearAboutUs || "Skip",
        workType: workType || "Skip",
        roleType: null,
        spendingTypingAreas: typingAreas,
        dataMode,
        selectedMicrophone: selectedMic,
        customShortcut: "Ctrl + Win",
        firstUseCategory: selectedFirstUse
      });
    }
  };

  return (
    <div 
      id="onboarding-root" 
      onClick={handleBackdropClick}
      className={isEndStep 
        ? "fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans select-none antialiased text-gray-800"
        : "min-h-screen w-full bg-warm-bg flex flex-col font-sans select-none overflow-x-hidden antialiased text-gray-800"
      }
    >
      {step === 6 && <ConfettiCelebration />}
      
      {/* Native Window Controls */}
      {isTauri && (
        <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-12 flex items-center justify-end px-6 gap-4 z-[60] select-none">
          <button onClick={() => getCurrentWindow().minimize()} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-[60]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button onClick={async () => await getCurrentWindow().toggleMaximize()} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-[60]">
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
          <button onClick={() => getCurrentWindow().close()} className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-[60]">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 
        FIXED ONBOARDING HEADER:
        Ensures perfect static layout at top with a beautiful high contrast border-b line.
      */}
      {!isEndStep && (
        <div className="w-full bg-white border-b border-black/5 fixed top-0 left-0 right-0 h-20 z-[50] px-6 py-4 flex items-center justify-between">
          
          {/* Left Side: Brand Logo replaces plain text SAYIKOR SYSTEM BUILD */}
          <div className="flex items-center gap-2 relative z-10">
            <img src="/Png-Orange-text.png" alt="Sayikor" className="h-7 object-contain" />
          </div>

          {/* Steps display - uses brand active highlight color instead of purple */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-400 pointer-events-auto">
              <span className={`transition-all duration-350 ${currentSection >= 1 ? "text-accent-green font-black border-b-2 border-accent-green pb-0.5" : "text-gray-400"}`}>SIGN UP</span>
              <ChevronRight size={12} className="text-gray-300" />
              <span className={`transition-all duration-350 ${currentSection >= 2 ? "text-accent-green font-black border-b-2 border-accent-green pb-0.5" : "text-gray-400"}`}>PERMISSIONS</span>
              <ChevronRight size={12} className="text-gray-300" />
              <span className={`transition-all duration-350 ${currentSection >= 3 ? "text-accent-green font-black border-b-2 border-accent-green pb-0.5" : "text-gray-400"}`}>SET UP</span>
              <ChevronRight size={12} className="text-gray-300" />
              <span className={`transition-all duration-350 ${currentSection >= 4 ? "text-accent-green font-black border-b-2 border-accent-green pb-0.5" : "text-gray-400"}`}>PERSONALIZE</span>
            </div>
          </div>
        </div>
      )}

      {/* spacer to offset the fixed onboarding header properly */}
      {!isEndStep && <div className="h-20 w-full" />}

      {/* Main Core Frame container */}
      <div className={isEndStep ? "flex items-center justify-center w-full max-w-[1200px]" : "flex-1 flex items-center justify-center p-4 md:p-8"}>
        <div 
          id="onboarding-main-container" 
          className="w-full bg-white rounded-[40px] border border-black/[0.04] shadow-[0_24px_70px_rgba(6,78,59,0.03)] overflow-hidden flex flex-col md:flex-row relative transition-all min-h-[585px] md:h-[75vh] md:min-h-[610px] md:max-h-[850px] no-scrollbar"
        >
          {/* Close icon button at top-right of main container when isEndStep */}
          {isEndStep && (
            <button 
              onClick={() => {
                onComplete({
                  hearAboutUs: hearAboutUs || "Skip",
                  workType: workType || "Skip",
                  roleType: null,
                  spendingTypingAreas: typingAreas,
                  dataMode,
                  selectedMicrophone: selectedMic,
                  customShortcut: "Ctrl + Win",
                  firstUseCategory: selectedFirstUse
                });
              }}
              aria-label="Close onboarding modal"
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all z-50 cursor-pointer"
            >
              <X size={20} />
            </button>
          )}

          {/* LEFT PANEL: Questions & selectors */}
          <div className="w-full md:w-[50%] p-8 md:p-14 flex flex-col justify-between z-10 overflow-y-auto custom-scrollbar">
            {/* Back action */}
            {!isEndStep && step > 1 && (
              <div className="mb-6">
                <button 
                  onClick={handleBack}
                  className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-black transition-colors uppercase tracking-wider group cursor-pointer"
                >
                  <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-black" />
                  Back
                </button>
              </div>
            )}

            {/* Dynamic Step Contents Container */}
            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Survey (Where did you hear about us?) */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-4xl font-serif font-black text-gray-900 tracking-tight leading-tight">
                        Welcome, {displayName}!
                      </h2>
                      <h3 className="text-xl font-bold text-thin text-gray-500 tracking-tight">
                        Where did you hear about us?
                      </h3>
                    </div>

                    {/* Source selection choices uses brand accent orange borders */}
                    <div className="flex flex-wrap gap-2.5 max-w-lg">
                      {[
                        "Newsletter", "Radio", "Friend", "Event", "Search engine", 
                        "Product Hunt", "Podcast", "YouTube", "AI chat", "Article", 
                        "Colleague", "Billboard", "Social media", "Other"
                      ].map((source) => {
                        const isSelected = hearAboutUs === source;
                        return (
                          <button
                            key={source}
                            onClick={() => {
                              setHearAboutUs(source);
                              if (source !== "YouTube") {
                                setYoutubeChannel(null);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-full text-sm font-semibold tracking-wide border transition-all cursor-pointer select-none ${
                              isSelected 
                                ? "bg-accent-orange/15 text-black border-accent-orange ring-2 ring-accent-orange/15 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-accent-orange/45 hover:bg-gray-50"
                            }`}
                          >
                            {source}
                          </button>
                        );
                      })}
                    </div>

                    {/* Specify input field conditionally when "Other" is chosen */}
                    <AnimatePresence>
                      {hearAboutUs === "Other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 pt-2"
                        >
                          <p className="text-xs font-bold text-accent-green uppercase tracking-widest">
                            Please specify
                          </p>
                          <input 
                            id="custom-hear-about-us-input"
                            type="text"
                            value={customHearAboutUs}
                            onChange={(e) => setCustomHearAboutUs(e.target.value)}
                            placeholder="Tell us where you heard about us..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/10 rounded-2xl text-sm font-medium focus:outline-none transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Extra context conditional based on screenshots */}
                    <AnimatePresence>
                      {hearAboutUs === "YouTube" && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3 pt-2"
                        >
                          <p className="text-xs font-bold text-accent-green uppercase tracking-widest">
                            Which YouTuber?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "Diary of a CEO", "Chris Raroque", "Daniel | Tech & Data",
                              "Samantha Kasbrick", "TechWithTim", "Matt Wolfe", "Other"
                            ].map((chan) => {
                              const isChanSelected = youtubeChannel === chan;
                              return (
                                <button
                                  key={chan}
                                  onClick={() => setYoutubeChannel(chan)}
                                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                                    isChanSelected
                                      ? "bg-accent-orange text-black font-semibold border-transparent"
                                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                  }`}
                                >
                                  {chan}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation Continue button */}
                    <div className="pt-4">
                      <button
                        onClick={handleNext}
                        disabled={
                          !hearAboutUs || 
                          (hearAboutUs === "YouTube" && !youtubeChannel) ||
                          (hearAboutUs === "Other" && !customHearAboutUs.trim())
                        }
                        className="px-8 py-3.5 bg-black hover:bg-gray-900 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold tracking-wide text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Tell us about yourself */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                        What do you do?
                      </h2>
                      <p className="text-sm font-semibold text-gray-400">
                        Pick the role that fits you best — we'll customize your experience.
                      </p>
                    </div>

                    {/* Pills work profiles with brand orange highlight borders */}
                    <div className="flex flex-wrap gap-2.5 max-w-lg">
                      {[
                        "Marketing", "Developer", "Writer", "Recruiting", 
                        "Educator", "Legal", "Customer Support", "Founder/CEO", 
                        "Sales", "Data Analysis", "Healthcare", "Creator", 
                        "Student", "Consultant", "Product", "Operations", "Other"
                      ].map((work) => {
                        const isSelected = workType === work;
                        return (
                          <button
                            key={work}
                            onClick={() => setWorkType(work)}
                            className={`px-4 py-2.5 rounded-full text-sm font-semibold tracking-wide border transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-accent-orange/15 text-black border-accent-orange ring-2 ring-accent-orange/15 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-accent-orange/45 hover:bg-gray-50"
                            }`}
                          >
                            {work}
                          </button>
                        );
                      })}
                    </div>

                    {/* Input field if profession "Other" work profile is selected */}
                    <AnimatePresence>
                      {workType === "Other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 pt-2"
                        >
                          <p className="text-xs font-bold text-accent-green uppercase tracking-widest">
                            What is your work field called?
                          </p>
                          <input 
                            id="custom-work-type-input"
                            type="text"
                            value={customWorkType}
                            onChange={(e) => setCustomWorkType(e.target.value)}
                            placeholder="e.g. Architect, Researcher, Designer..."
                            className="w-full px-4 py-3 bg-white border border-gray-205 focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/10 rounded-2xl text-sm font-medium focus:outline-none transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation Continue button */}
                    <div className="pt-4">
                      <button
                        onClick={handleNext}
                        disabled={
                          !workType || 
                          (workType === "Other" && !customWorkType.trim())
                        }
                        className="px-8 py-3.5 bg-black hover:bg-gray-900 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold tracking-wide text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Where do you spend time typing */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                        Where do you want to dictate?
                      </h2>
                      <p className="text-sm font-semibold text-gray-500">
                        This helps us personalize Sayikor where you work. Select all that apply.
                      </p>
                    </div>

                    {/* Area selectors selection pills with brand colored highlights */}
                    <div className="flex flex-col gap-2.5 max-w-sm">
                      {[
                        { name: "Writing documents", icon: FileText },
                        { name: "Sending messages", icon: MessageSquare },
                        { name: "Taking notes", icon: Book },
                        { name: "Drafting emails", icon: Mail },
                        { name: "Writing posts or comments", icon: Type },
                        { name: "Coding with AI", icon: LayoutGrid },
                        { name: "Chatting with AI", icon: MessageCircle },
                        { name: "Something else", icon: Sparkles }
                      ].map((item) => {
                        const isSelected = typingAreas.includes(item.name);
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={() => handleToggleTypingArea(item.name)}
                            className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border text-left font-bold text-sm transition-all focus:outline-none cursor-pointer ${
                              isSelected
                                ? "bg-accent-orange/15 text-black border-accent-orange translate-x-1"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-accent-orange/45"
                            }`}
                          >
                            <IconComponent size={18} className={isSelected ? "text-accent-orange" : "text-gray-400"} />
                            <span className="flex-1">{item.name}</span>
                            {isSelected && (
                              <div className="w-5 h-5 bg-accent-green rounded-full flex items-center justify-center shrink-0">
                                <Check size={11} className="text-white font-bold" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation Continue button */}
                    <div className="pt-4">
                      <button
                        onClick={handleNext}
                        disabled={typingAreas.length === 0}
                        className="px-8 py-3.5 bg-black hover:bg-gray-900 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold tracking-wide text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: You control your data */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        You control your data
                      </h2>
                    </div>

                    {/* double cards for control modes with brand styling colors */}
                    <div className="space-y-4 max-w-md">
                      {/* Control Card A: Improve */}
                      <div 
                        onClick={() => setDataMode("improve")}
                        className={`p-5 rounded-3xl border text-left cursor-pointer transition-all flex items-start gap-4 ${
                          dataMode === "improve"
                            ? "bg-accent-green-light/45 text-black border-accent-green/30 shadow-sm"
                            : "bg-white text-gray-700 border-gray-150 hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${
                          dataMode === "improve" ? "border-accent-green bg-accent-green" : "border-gray-300"
                        }`}>
                          {dataMode === "improve" && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-gray-855">Help improve Sayikor</h4>
                          <p className="text-xs leading-relaxed text-gray-500 font-semibold">
                            To make Sayikor understand you better, this option lets us collect limited audio, transcriptions, and edits to evaluate, train, and improve Sayikor's performance.
                          </p>
                        </div>
                      </div>

                      {/* Control Card B: Privacy Mode (Defaults to this option!) */}
                      <div 
                        onClick={() => setDataMode("privacy")}
                        className={`p-5 rounded-3xl border text-left cursor-pointer transition-all flex items-start gap-4 ${
                          dataMode === "privacy"
                            ? "bg-accent-green-light/45 text-black border-accent-green/30 shadow-sm"
                            : "bg-white text-gray-700 border-gray-150 hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${
                          dataMode === "privacy" ? "border-accent-green bg-accent-green" : "border-gray-300"
                        }`}>
                          {dataMode === "privacy" && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-gray-855">Privacy Mode</h4>
                            <Lock size={12} className="text-accent-green" />
                          </div>
                          <p className="text-xs leading-relaxed text-gray-500 font-semibold">
                            If you enable Privacy Mode, none of your dictation data will be stored or used for model training by us or any third party.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 font-bold space-y-1">
                      <p>You can always change this later in settings.</p>
                      <a href="#" className="underline text-gray-500 hover:text-black transition-colors block">Read more here.</a>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2">
                      <button
                        onClick={handleNext}
                        className="px-8 py-3.5 bg-black hover:bg-gray-900 active:scale-98 text-white rounded-2xl font-bold tracking-wide text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Test your microphone */}
                {step === 5 && (
                  <motion.div
                    key="step-5"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Test your microphone
                      </h2>
                      <p className="text-sm font-semibold leading-relaxed text-gray-500 max-w-sm">
                        Your computer's built-in mic will ensure optimal transcription.
                      </p>
                    </div>

                    {/* Microphone status checklist */}
                    <div className="space-y-3.5 max-w-md">
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-150">
                        <CheckCircle2 size={18} className="text-accent-green mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">Connection Standard</p>
                          <p className="text-[11px] text-gray-400 font-semibold">{selectedMic === "auto-detect" ? "Active primary microphone array is responsive." : `${microphoneDevices.find(d => d.id === selectedMic)?.label || selectedMic} is responsive.`}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-150">
                        <CheckCircle2 size={18} className="text-accent-green mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">Noise reduction active</p>
                          <p className="text-[11px] text-gray-400 font-semibold">Ready to test dictation accuracy.</p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic test control button changed continue keyword details */}
                    <div className="pt-2">
                      <button
                        onClick={handleNext}
                        className="px-10 py-4 bg-black hover:bg-gray-900 text-white rounded-2xl font-black tracking-wide text-sm shadow-md transition-all cursor-pointer"
                      >
                        Continue to upgrade screen
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 6: Upgraded pro announcement (Trial) */}
                {step === 6 && (
                  <motion.div
                    key="step-6"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-orange/10 border border-accent-orange/40 rounded-full text-[11px] font-bold text-black uppercase tracking-widest animate-pulse">
                        <span>30-Day Free Trial</span>
                      </div>
                      
                      <h2 className="text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
                        You've earned 900 <br/>free words on <span className="text-accent-orange font-black italic">Ikor Plus!</span>
                      </h2>
                      
                      <p className="text-sm font-semibold text-gray-500 max-w-sm leading-relaxed">
                        Enjoy 30 days of Ikor Plus premium features with 900 free dictation words. No credit card required.
                      </p>
                    </div>

                    {/* Ikor Plus features preview list */}
                    <div className="space-y-2.5 max-w-sm">
                      {[
                        "Real-time dictation engine",
                        "Unlimited audio dictionary terms",
                        "Custom macro shortcuts keys",
                        "Full transcription export via cloud models"
                      ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-gray-700">
                          <Check size={14} className="text-accent-orange shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Navigation Great! Button */}
                    <div className="pt-4">
                      <button
                        onClick={handleNext}
                        className="w-full max-w-xs py-4 bg-black hover:bg-gray-900 text-white font-black rounded-2xl text-sm transition-all shadow-md active:scale-98 cursor-pointer"
                      >
                        Great!
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 7: Goal choice (Take a note, Write a message) */}
                {step === 7 && (
                  <motion.div
                    key="step-7"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-3xl font-serif font-black text-gray-900 leading-tight tracking-tight">
                        How would you like <br/>to use Sayikor first?
                      </h2>
                    </div>

                    {/* List of use categories with nice brand color active configurations */}
                    <div className="flex flex-wrap gap-2.5 max-w-md pt-2">
                      {[
                        { label: "Take a note", icon: FileText },
                        { label: "Write a message", icon: MessageSquare },
                        { label: "Write a document", icon: Book },
                        { label: "Prompt Cursor or Windsurf", icon: LayoutGrid },
                        { label: "Chat with AI", icon: Sparkles },
                        { label: "Draft an email", icon: Mail },
                        { label: "Write a post or comment", icon: Type }
                      ].map((item) => {
                        const isChosen = selectedFirstUse === item.label;
                        const ComponentIcon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => setSelectedFirstUse(item.label)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              isChosen
                                ? "bg-accent-orange/15 text-black border-accent-orange ring-2 ring-accent-orange/10"
                                : "bg-white text-gray-600 border-gray-150 hover:bg-gray-50"
                            }`}
                          >
                            <ComponentIcon size={14} className={isChosen ? "text-accent-orange" : "text-gray-400"} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation final "Try it now" */}
                    <div className="pt-6">
                      <button
                        onClick={handleNext}
                        className="w-full max-w-xs py-4 bg-black hover:bg-gray-900 text-white font-bold rounded-2xl text-sm transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Try it now</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT PANEL: High-end interactive illustration / previews (50% Desktop) */}
          <div className="w-full md:w-[50%] bg-[#fcfcf9] border-t md:border-t-0 md:border-l border-gray-100 flex items-center justify-center p-8 relative overflow-hidden bg-dot-grid">
            
            {/* Dynamic visual representation */}
            <AnimatePresence mode="wait">
              
              {/* SURVEY 1: Fishing vector keyboard keys */}
              {step === 1 && (
                <motion.div
                  key="right-s1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[360px] flex flex-col justify-center items-center text-center space-y-6"
                >
                  <svg viewBox="0 0 400 350" fill="none" className="w-[102%] h-auto">
                    {/* Aquatic pond scene */}
                    <rect x="20" y="240" width="360" height="90" rx="30" fill="#064e3b" opacity="0.1" className="animate-pulse" />
                    <line x1="100" y1="240" x2="300" y2="240" stroke="#064e3b" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
                    
                    {/* Fisherman */}
                    <path d="M260,250 C260,190 320,180 320,250" stroke="#f43f5e" strokeWidth="3" fill="none" />
                    <circle cx="320" cy="180" r="16" fill="#fbcfe8" />
                    <rect x="305" y="196" width="30" height="50" rx="10" fill="#ef4444" />
                    
                    {/* Fishing line to keyboard letter keys */}
                    <path d="M220,170 C160,80 180,240 100,220" stroke="#f97316" strokeWidth="2.5" strokeDasharray="5,5" fill="none" className="animate-dash" />
                    
                    {/* Floating keys */}
                    <g transform="translate(80, 200) rotate(-10)">
                      <rect width="40" height="40" rx="10" fill="white" stroke="#ef4444" strokeWidth="3" />
                      <text x="14" y="26" fill="#064e3b" fontSize="18" fontWeight="bold" fontFamily="sans-serif">A</text>
                    </g>
                    <g transform="translate(140, 230) rotate(15)">
                      <rect width="40" height="40" rx="10" fill="white" stroke="#eaeaea" strokeWidth="2" />
                      <text x="14" y="26" fill="#a3a3a3" fontSize="18" fontWeight="bold" fontFamily="sans-serif">S</text>
                    </g>
                  </svg>
                  <p className="text-xs font-semibold text-gray-400 capitalize">Unlock a new level of productivity—type 5x faster using just your voice.</p>
                </motion.div>
              )}

              {/* SURVEY 2: Polaroid snapshot vectors */}
              {step === 2 && (
                <motion.div
                  key="right-s2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[360px] flex flex-col justify-center items-center text-center space-y-4"
                >
                  <svg viewBox="0 0 400 320" fill="none" className="w-[95%] h-auto">
                    {/* Polaroid A */}
                    <g transform="translate(40, 40) rotate(-12)">
                      <rect width="130" height="150" rx="8" fill="white" stroke="#e5e5e5" strokeWidth="1" className="shadow-sm" />
                      <rect x="10" y="10" width="110" height="100" rx="4" fill="#fef08a" />
                      {/* Avatar shape */}
                      <circle cx="65" cy="50" r="18" fill="#ca8a04" />
                      <path d="M40,95 Q65,70 90,95" fill="#ca8a04" />
                      <rect x="25" y="125" width="80" height="8" rx="4" fill="#e5e5e5" />
                    </g>

                    {/* Polaroid B */}
                    <g transform="translate(220, 60) rotate(15)">
                      <rect width="130" height="150" rx="8" fill="white" stroke="#e5e5e5" strokeWidth="1" className="shadow-sm" />
                      <rect x="10" y="10" width="110" height="100" rx="4" fill="#a7f3d0" />
                      {/* Avatar shape */}
                      <circle cx="65" cy="50" r="18" fill="#059669" />
                      <path d="M40,95 Q65,70 90,95" fill="#059669" />
                      <rect x="25" y="125" width="80" height="8" rx="4" fill="#e5e5e5" />
                    </g>

                    {/* Polaroid C */}
                    <g transform="translate(130, 110) rotate(-4)">
                      <rect width="130" height="150" rx="8" fill="white" stroke="#ef4444" strokeWidth="2" className="shadow-md" />
                      <rect x="10" y="10" width="110" height="100" rx="4" fill="#fcfcf9" />
                      {/* Avatar shape */}
                      <circle cx="65" cy="50" r="18" fill="#064e3b" />
                      <path d="M40,95 Q65,70 90,95" fill="#064e3b" />
                      <rect x="25" y="125" width="80" height="10" rx="5" fill="#ef4444" />
                    </g>
                  </svg>
                  <p className="text-xs font-semibold text-gray-400">Sayikor matches your vocabulary and terminology to your field.</p>
                </motion.div>
              )}

              {/* SURVEY 3: Graphic workstation mock */}
              {step === 3 && (
                <motion.div
                  key="right-s3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[360px] flex flex-col justify-center items-center text-center space-y-4"
                >
                  <svg viewBox="0 0 400 320" fill="none" className="w-[98%] h-auto">
                    {/* Table surface */}
                    <line x1="40" y1="240" x2="360" y2="240" stroke="#e5e5e5" strokeWidth="6" strokeLinecap="round" />
                    
                    {/* Monitor frame */}
                    <rect x="110" y="60" width="180" height="130" rx="12" fill="#171717" />
                    <rect x="120" y="70" width="160" height="110" rx="6" fill="#fafafa" />
                    {/* Stand */}
                    <rect x="185" y="190" width="30" height="40" fill="#525252" />
                    <ellipse cx="200" cy="230" rx="40" ry="8" fill="#404040" />

                    {/* Cozy mug and desk light layouts */}
                    <rect x="75" y="200" width="20" height="30" rx="4" fill="#ef4444" />
                    <path d="M95,208 C102,208 102,220 95,220" stroke="#ef4444" strokeWidth="3" />

                    {/* Mock desktop text windows elements */}
                    <rect x="135" y="85" width="130" height="15" rx="3" fill="#ef4444" opacity="0.3" />
                    <rect x="135" y="110" width="110" height="8" rx="2" fill="#eaeaea" />
                    <rect x="135" y="125" width="85" height="8" rx="2" fill="#eaeaea" />
                    
                    {/* Cozy details */}
                    <circle cx="310" cy="110" r="12" fill="#ef4444" opacity="0.1" />
                    <circle cx="310" cy="110" r="4" fill="#ef4444" />
                  </svg>
                  <p className="text-xs font-semibold text-gray-400 font-sans">Sayikor works wherever your cursor blinks.</p>
                </motion.div>
              )}

              {/* SURVEY 4: Folder controls secure view */}
              {step === 4 && (
                <motion.div
                  key="right-s4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[360px] flex flex-col justify-center items-center text-center space-y-4"
                >
                  <svg viewBox="0 0 400 320" fill="none" className="w-[95%] h-auto">
                    {/* Folder rear face */}
                    <rect x="60" y="100" width="280" height="160" rx="24" fill="#f2f2ee" stroke="#e5e5e5" strokeWidth="4" />
                    
                    {/* Inner Paper sheets inside */}
                    <motion.g animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                      <rect x="90" y="50" width="220" height="170" rx="12" fill="white" stroke="#e5e5e5" strokeWidth="2" className="shadow-sm" />
                      <line x1="120" y1="85" x2="280" y2="85" stroke="#eaeaea" strokeWidth="4" strokeLinecap="round" />
                      <line x1="120" y1="105" x2="250" y2="105" stroke="#eaeaea" strokeWidth="4" strokeLinecap="round" />
                      <line x1="120" y1="125" x2="270" y2="125" stroke="#eaeaea" strokeWidth="4" strokeLinecap="round" />
                    </motion.g>

                    {/* Folder front face with tab cutout */}
                    <path d="M60,135 L120,135 C135,135 145,120 160,120 L310,120 C325,120 340,135 340,150 L340,260 C340,275 325,280 310,280 L90,280 C75,280 60,265 60,250 Z" fill="#ef4444" opacity="0.9" />

                    {/* Lock vector badge with shadow */}
                    <circle cx="270" cy="190" r="32" fill="#064e3b" className="shadow-xl" />
                    <rect x="255" y="180" width="30" height="22" rx="4" fill="white" />
                    <path d="M261,180 L261,172 C261,165 279,165 279,172 L279,180" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                  
                </motion.div>
              )}

              {/* SURVEY 5: Interactive Microphone device selection */}
              {step === 5 && (
                <motion.div
                  key="right-s5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[400px] flex flex-col justify-center items-center text-center space-y-6"
                >
                  <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-xl w-full max-w-[380px] text-left relative">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                      Do you see orange bars while you speak?
                    </p>

                    {/* Animated speech meter pill group in volume staircase shape */}
                    <div className="flex items-end justify-center gap-1.5 h-16 bg-gray-50/50 rounded-2xl border border-gray-100/60 p-4 mb-4">
                      {voicesBars.map((val, idx) => {
                        const minHeight = 25;
                        const maxH = minHeight + ((100 - minHeight) / (voicesBars.length - 1)) * idx;
                        return (
                          <div key={idx} className="w-1.5 bg-gray-200/80 rounded-full flex items-end justify-center overflow-hidden" style={{ height: `${maxH}%` }}>
                            <motion.div 
                              className="bg-accent-orange w-full rounded-full"
                              animate={{ height: `${val * 10 + 10}%` }}
                              transition={{ ease: "easeInOut", duration: 0.1 }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* wrapped mic selection in drop down container with Yes button beneath to prevent overflow */}
                    <div className="space-y-3" ref={micDropdownRef}>
                      <div className="w-full">
                        <button 
                          onClick={() => setIsMicDropdownOpen(!isMicDropdownOpen)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 hover:bg-gray-100/50 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <span className="truncate pr-2">{selectedMic === "auto-detect" ? "Auto-detect (Array)" : (microphoneDevices.find(d => d.id === selectedMic)?.label || selectedMic)}</span>
                          <ChevronDown size={14} className="text-gray-400 shrink-0" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2.5 pt-1">
                        <span className="text-[11px] text-gray-400 font-bold">Ready to record?</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setMicState("error")}
                            className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                          >
                            No
                          </button>
                          <button 
                            onClick={() => setMicState("success")}
                            className="py-2.5 px-6 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shrink-0"
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dropdown menu portal container in absolute container positions */}
                    <AnimatePresence>
                      {isMicDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute left-6 right-6 bottom-16 bg-white border border-gray-200 rounded-2xl p-2.5 shadow-2xl z-20 space-y-1"
                        >
                          {microphoneDevices.map((dev) => {
                            const isCh = selectedMic === dev.id || (selectedMic === "auto-detect" && dev.id === "auto-detect");
                            return (
                              <button
                                key={dev.id}
                                onClick={() => {
                                  setSelectedMic(dev.id);
                                  setIsMicDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isCh 
                                    ? "bg-accent-orange/15 text-black border-l-4 border-accent-orange" 
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span className="truncate">{dev.label}</span>
                                {isCh && <Check size={12} className="text-accent-orange shrink-0" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Success state message popup */}
                  <AnimatePresence>
                    {micState === "success" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5 mt-3"
                      >
                        <Check size={14} className="bg-accent-green text-white rounded-full p-0.5" />
                        Microphone audio verified successfully!
                      </motion.div>
                    )}
                    {micState === "error" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-semibold text-red-800 flex flex-col items-start gap-3 mt-3 w-full"
                      >
                        <div className="flex items-start gap-2.5">
                          <HelpCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed text-left text-red-700">
                            Ensure your microphone is plugged in and enabled in Windows Settings.
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setMicState("not_tested");
                            if (step === 5) {
                              invoke("stop_mic_test").then(() => {
                                // Simulate refresh delay
                                setTimeout(() => {
                                  // startMicTesting logic runs natively if we flip states or we can just trigger it manually
                                  // For now, setting selectedMic to auto-detect will re-trigger the useEffect
                                  setSelectedMic("auto-detect");
                                }, 300);
                              });
                            }
                          }}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start"
                        >
                          Refresh Devices
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* 
                STEP 6: Beautiful Black Card with Share Card Wave animations (from dashboard)
                Sayikor logos and label text are fully stripped, background set to pure solid black.
              */}
              {step === 6 && (
                <motion.div
                  key="right-s6-upgrade"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[420px] h-[360px] bg-black rounded-[32px] p-8 flex flex-col justify-between text-white relative shadow-2xl overflow-hidden"
                >
                  {/* wave animation matching dashboard progress card */}
                  <WaveformPattern isDark={true} />

                  {/* Top line banner - aligned left */}
                  <div className="flex items-center justify-start relative z-10 w-full">
                    <div className="px-3.5 py-1.5 bg-white/10 border border-white/10 rounded-full text-[10px] font-black tracking-widest text-white">
                      Ikor Plus
                    </div>
                  </div>

                  {/* Copy context details */}
                  <div className="space-y-4 relative z-10 text-left">
                    <h3 className="text-3xl font-black leading-tight text-white font-sans whitespace-nowrap">
                      Loaded with 900 words
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                      Afterwards, you can continue to use Ikor for <span className="font-bold underline text-white">free</span>, with 900 words monthly, or <span className="font-bold underline text-white">top-up</span> at just ₦50/1,000 words.
                    </p>
                  </div>

                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black relative z-10 text-left">
                    No credit card payment needed.
                  </div>
                </motion.div>
              )}

              {/* STEP 7: Beautiful Simulated Desktop active editor */}
              {step === 7 && (
                <motion.div
                  key="right-s7-desktop"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[430px] h-[370px] bg-black rounded-[32px] p-6 flex flex-col justify-between relative shadow-2xl text-left font-sans text-gray-800"
                >
                  {/* Top screen task title bar */}
                  <div className="w-full flex items-center justify-end border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500/80" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                      <div className="w-2 h-2 rounded-full bg-green-500/80" />
                    </div>
                  </div>

                  {/* Simulated writing pad workspace */}
                  <div className="my-auto">
                    <div className="bg-white rounded-2xl p-5 border border-white/20 shadow-xl space-y-3.5 max-w-sm mx-auto">
                      <div className="flex items-center justify-between border-b border-gray-150 pb-2.5">
                        <span className="text-[11px] font-bold text-gray-400 capitalize">Desktop Pad Active</span>
                        <span className="text-[10px] text-gray-400">June 2, 2026 • 9:14 AM</span>
                      </div>

                      <div className="space-y-1 text-left">
                        <h4 className="text-base font-black tracking-tight text-gray-850">
                          Tasks &amp; Notes
                        </h4>
                        
                        <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                          Sayikor translates your thoughts into written prose here.
                        </p>
                      </div>

                      <div className="p-3 bg-accent-orange/10 rounded-xl border border-accent-orange/30 text-xs text-black leading-normal flex items-start gap-2 font-semibold">
                        <Sparkles size={14} className="text-accent-orange shrink-0 mt-0.5 animate-pulse" />
                        <span>Ready to capture and dictated for <strong className="font-extrabold">{selectedFirstUse}</strong>.</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-2" />
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
