import { motion, AnimatePresence } from "framer-motion";
import { toPng } from 'html-to-image';
import { 
  Home, 
  Book, 
  Settings, 
  HelpCircle,
  PanelLeft,
  CircleUser,
  Minus,
  X,
  Mic,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Share,
  Calendar,
  Clock,
  Activity,
  Search,
  ChevronUp,
  MoreHorizontal,
  Zap
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import SettingsModal from "./SettingsModal";

const isTauri = !!(window as any).__TAURI_INTERNALS__;

interface DashboardProps {
  onBack: () => void;
}

const ShareCard = ({ color, metrics, isPreview = false }: { color: string, metrics: any, isPreview?: boolean }) => {
  const isDark = color === 'bg-[#1a1a1a]' || color === 'bg-red-500' || color === 'bg-blue-500' || color === 'bg-green-500';
  return (
    <div className={`${color} rounded-[32px] p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col relative overflow-hidden w-full h-full min-h-[250px] transition-colors duration-300`}>
      <div className="absolute top-8 right-8 flex items-center">
        <img src="/Png-Orange-text.png" alt="Sayikor Logo" className="h-8 object-contain" />
      </div>
      
      <div className={`mt-auto mb-8 ${isDark ? 'text-white' : 'text-black'}`}>
        <h3 className="text-3xl font-bold">Sayikor User</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <div className={`col-span-1 p-4 rounded-2xl ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Words</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{metrics.totalWords}</span>
            <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">words</span>
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Saved</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{metrics.timeSavedMinutes}</span>
            <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">mins</span>
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Streak</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{metrics.streak}</span>
            <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">days</span>
          </div>
        </div>
        <div className={`col-span-1 p-4 rounded-2xl ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
          <p className="text-[10px] font-semibold opacity-60 mb-1 uppercase tracking-wider">Speed</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-bold leading-none">{metrics.avgWpm}</span>
            <span className="text-[10px] sm:text-xs opacity-80 mb-0.5">wpm</span>
          </div>
        </div>
      </div>
      
      {isPreview && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
            <Share size={16} /> Share Progress
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard(_props: DashboardProps) {
  const [activeSection, setActiveSection] = useState("Home");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [testText, setTestText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<string[]>(["Sayikor", "MCP", "Tauri", "Ctrl", "Alt", "Shift", "Windows"]);
  const [newWord, setNewWord] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState<{ title: string; body: string; url: string } | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<{time: string; content: string; date?: string}[]>([]);
  const [dictationSpeed, setDictationSpeed] = useState<string>("fast");
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("bg-[#1a1a1a]");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const cardColors = [
    { id: 'light', class: 'bg-[#f8f7f0]' },
    { id: 'dark', class: 'bg-[#1a1a1a]' },
    { id: 'red', class: 'bg-red-500' },
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'green', class: 'bg-green-500' }
  ];

  // ── Computed Metrics (derived from transcriptHistory) ──────────────
  const metrics = useMemo(() => {
    const totalWords = transcriptHistory.reduce((sum, item) => {
      return sum + item.content.split(/\s+/).filter(Boolean).length;
    }, 0);

    // Average typing speed is ~40 WPM; dictation is ~150 WPM.
    // Time saved = words * (1/40 - 1/150) minutes
    const timeSavedMinutes = Math.round(totalWords * (1/40 - 1/150));

    // Day streak: count consecutive days with at least one transcript
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesWithTranscripts = new Set<string>();
    transcriptHistory.forEach(item => {
      if (item.date) {
        datesWithTranscripts.add(item.date);
      } else {
        // If no date field, assume today
        datesWithTranscripts.add(today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      }
    });
    let streak = 0;
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const shortDateStr = checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (datesWithTranscripts.has(dateStr) || datesWithTranscripts.has(shortDateStr) || datesWithTranscripts.has('Today') && i === 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Average WPM: estimate based on total words / total dictation count
    // Assume ~5 seconds average per dictation
    const dictationCount = transcriptHistory.length;
    const avgWpm = dictationCount > 0 ? Math.round(totalWords / (dictationCount * (5/60))) : 0;

    return { totalWords, timeSavedMinutes, streak: streak || (dictationCount > 0 ? 1 : 0), avgWpm };
  }, [transcriptHistory]);

  // ── Filtered History (search) ─────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return transcriptHistory;
    const query = searchQuery.toLowerCase();
    return transcriptHistory.filter(item => 
      item.content.toLowerCase().includes(query)
    );
  }, [transcriptHistory, searchQuery]);

  const handleSpeedChange = async (speed: string) => {
    setDictationSpeed(speed);
    if (isTauri) {
      try {
        const store = await load('store.json');
        await store.set('dictationSpeed', speed);
        await store.save();
      } catch (err) {
        console.error("Failed to save dictationSpeed:", err);
      }
    }
  };

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    if (isTauri) {
      // Check initial maximized state
      getCurrentWindow().isMaximized().then(setIsMaximized);
      
      // Listen for resize events
      let unlistenResize: () => void;
      getCurrentWindow().onResized(async () => {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      }).then(unlisten => {
        unlistenResize = unlisten;
        cleanups.push(unlistenResize);
      });

      // Load saved transcript history
      load('store.json').then(async store => {
        const history = await store.get<{time: string; content: string}[]>('transcriptHistory');
        if (history) {
          setTranscriptHistory(history);
        }
        const speed = await store.get<string>('dictationSpeed');
        if (speed) {
          setDictationSpeed(speed);
        }
      }).catch(err => console.error("Failed to load store:", err));

      // Listen for new transcriptions from the Bubble
      let unlistenTranscription: () => void;
      listen<{time: string; content: string}[]>("new-transcription", async (event) => {
        if (event.payload) {
          setTranscriptHistory(event.payload);
        } else {
          const store = await load('store.json');
          const history = await store.get<{time: string; content: string}[]>('transcriptHistory');
          if (history) {
            setTranscriptHistory([...history]);
          }
        }
      }).then(unlisten => {
        unlistenTranscription = unlisten;
        cleanups.push(unlistenTranscription);
      });

      // BROADCAST SYSTEM
      fetch("https://raw.githubusercontent.com/thecoachakpan/ikor/main/broadcast.json")
        .then(res => res.json())
        .then(async (data) => {
          if (data && data.active) {
            const currentVersion = await getVersion();
            if (!data.fixedInVersion || currentVersion !== data.fixedInVersion) {
              setBroadcastMessage({
                title: data.title || "Important Update",
                body: data.body || "A new version is available. Please download it manually.",
                url: data.url || "https://github.com/thecoachakpan/ikor/releases"
              });
            }
          }
        })
        .catch(() => { /* Silent fail */ });

      const win = getCurrentWindow();
      win.unmaximize().catch(console.error);
      win.unminimize().catch(console.error);
      win.show().catch(console.error);
      win.setFocus().catch(console.error);
    }

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, []);

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
          
          // Open the containing folder in Explorer
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
      <AnimatePresence>
        {broadcastMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-accent-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="text-accent-orange" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-4">{broadcastMessage.title}</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                {broadcastMessage.body}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    if (isTauri) await openUrl(broadcastMessage.url);
                    else window.open(broadcastMessage.url, "_blank");
                  }}
                  className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Download Now
                </button>
                <button 
                  onClick={() => setBroadcastMessage(null)}
                  className="w-full py-4 text-gray-500 font-medium hover:text-black transition-all"
                >
                  Remind me later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



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
                <ShareCard color={selectedColor} metrics={metrics} />
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
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col border-r border-black/5 bg-[#f2f0e4]/50 backdrop-blur-md overflow-hidden transition-all duration-300 shrink-0`}>
        <div className={`p-6 pb-2 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={isSidebarCollapsed ? "/Sayikor-app-icon-1.png" : "/Png-Orange-text.png"} alt="Sayikor Logo" className="h-8 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="px-2 py-0.5 bg-accent-orange/15 text-accent-orange text-[10px] font-bold rounded-md ml-1 whitespace-nowrap tracking-wide">
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
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action || (() => setActiveSection(item.label))}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeSection === (item.label === 'Keywords' ? 'Dictionary' : item.label)
                    ? "bg-accent-orange/15 text-accent-orange" 
                    : "text-gray-500 hover:bg-black/5 hover:text-black"
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className={`mt-auto p-6 space-y-2 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          {/* Upgrade to Pro card */}
          {!isSidebarCollapsed && (
            <div className="bg-accent-green-light/30 border border-accent-green-light rounded-2xl p-4 relative overflow-hidden mb-4">
              <div className="relative z-10">
                <p className="text-xs font-bold text-gray-800 mb-1">Your trial ends in <span className="text-accent-green">15 days</span></p>
                <p className="text-[10px] text-gray-500 leading-tight mb-4">Upgrade to Sayikor Pro to keep unlimited recordings and MCP features.</p>
                <button className="w-full bg-black text-white py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all">
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}

          {/* Speed mode pill */}
          {!isSidebarCollapsed && (
            <div className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all mb-4 ${
              dictationSpeed === 'ultra-fast' ? 'bg-black' :
              dictationSpeed === 'fast' ? 'bg-blue-500' :
              'bg-red-500'
            }`}>
              <span className="capitalize">{dictationSpeed.replace('-', ' ')}</span>
            </div>
          )}

          {[
            { icon: Zap, label: "Speed Mode", action: () => setActiveSection("Speed Mode") },
            { icon: Settings, label: "Settings", action: () => setIsSettingsModalOpen(true) },
            { icon: RefreshCw, label: "Check for Updates", action: () => { alert("Updates not yet implemented"); } },
            { icon: HelpCircle, label: "Help" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-black/5 hover:text-black transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Title Bar Simulation */}
        <header data-tauri-drag-region className="h-12 flex items-center justify-between px-6 border-b border-black/5 cursor-move">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="text-gray-400 hover:text-black transition-colors"
              title="Toggle Sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <CircleUser size={18} className="text-gray-400 pointer-events-none" />
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
        <div className="flex-1 overflow-y-auto p-8 w-full custom-scrollbar">
          {activeSection === "Home" && (
            <div className={`mx-auto w-full transition-all duration-300 relative ${isMaximized ? 'max-w-full px-8' : 'max-w-5xl'}`}>
              <header className="mb-6 font-sans flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-3">
                  Hold 
                  <span className="flex gap-1">
                    <span className="px-2 py-1 bg-red-500 text-white rounded-lg text-sm font-bold shadow-sm">Ctrl</span>
                    <span className="text-black">+</span>
                    <span className="px-2 py-1 bg-red-500 text-white rounded-lg text-sm font-bold shadow-sm">Alt</span>
                  </span>
                  to dictate anywhere
                </h1>
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Share size={14} className="text-red-500" />
                </button>
              </header>

              {/* Voice Command Suggestions Banner */}
              <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-[24px] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
                    ⚡ Voice to MCP Commands
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Try speaking these commands while holding Ctrl + Alt</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-amber-500/10 shadow-xs flex flex-col justify-between">
                    <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                      <span>🏪 Merchant Invoicing</span>
                    </div>
                    <p className="text-xs font-mono text-amber-700 font-medium bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                      &ldquo;Create a ₦150,000 invoice for Apex Ltd for supply of goods, expiring in 5 days&rdquo;
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-amber-500/10 shadow-xs flex flex-col justify-between">
                    <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                      <span>📊 Real-Time Sales Audit</span>
                    </div>
                    <p className="text-xs font-mono text-amber-700 font-medium bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                      &ldquo;What is my total sales revenue collected today via bank transfer?&rdquo;
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-amber-500/10 shadow-xs flex flex-col justify-between">
                    <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                      <span>💳 Customer Wallet Top-up</span>
                    </div>
                    <p className="text-xs font-mono text-amber-700 font-medium bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                      &ldquo;Top up my wallet with ₦5,000&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
                <div 
                  className="lg:col-span-3 cursor-pointer group h-full min-h-[250px]"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <ShareCard color={selectedColor} metrics={metrics} isPreview={true} />
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4 min-w-0">
                  <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 flex flex-col justify-between overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Dictated words</p>
                    <div className="flex items-end gap-1 mb-2 flex-wrap">
                      <span className="text-2xl font-bold truncate">{metrics.totalWords}</span>
                      <span className="text-xs text-gray-500 font-medium pb-1 shrink-0">words</span>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
                        <Mic size={12} className="text-red-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 flex flex-col justify-between overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Time saved</p>
                    <div className="flex items-end gap-1 mb-2 flex-wrap">
                      <span className="text-2xl font-bold truncate">{metrics.timeSavedMinutes}</span>
                      <span className="text-xs text-gray-500 font-medium pb-1 shrink-0">mins</span>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
                        <Clock size={12} className="text-red-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 flex flex-col justify-between overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Day streak</p>
                    <div className="flex items-end gap-1 mb-2 flex-wrap">
                      <span className="text-2xl font-bold truncate">{metrics.streak}</span>
                      <span className="text-xs text-gray-500 font-medium pb-1 shrink-0">days</span>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
                        <Calendar size={12} className="text-red-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 flex flex-col justify-between overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Avg speed</p>
                    <div className="flex items-end gap-1 mb-2 flex-wrap">
                      <span className="text-2xl font-bold truncate">{metrics.avgWpm}</span>
                      <span className="text-xs text-gray-500 font-medium pb-1 shrink-0">wpm</span>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
                        <Activity size={12} className="text-red-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mb-24">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">History</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
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
                                // Add export logic here
                                setIsDropdownOpen(false);
                                alert("Export not fully implemented yet");
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
                            >
                              Export transcripts
                            </button>
                            <button 
                              onClick={() => {
                                setTranscriptHistory([]);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-black/5"
                            >
                              Delete transcripts
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
                        className="bg-transparent border-none outline-none text-sm w-32 focus:w-48 transition-all placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
                
                {filteredHistory.length === 0 ? (
                  <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-12 text-center">
                    {searchQuery.trim() ? (
                      <p className="text-sm text-gray-400 italic">No results for &ldquo;{searchQuery}&rdquo;</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No transcripts yet. Hold <strong>Ctrl + Alt</strong> to start dictating.</p>
                    )}
                  </div>
                ) : (
                  Object.entries(
                    filteredHistory.reduce((acc, item: any) => {
                      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const dateStr = item.date === todayStr ? 'Today' : (item.date || 'Today');
                      if (!acc[dateStr]) acc[dateStr] = [];
                      acc[dateStr].push(item);
                      return acc;
                    }, {} as Record<string, typeof filteredHistory>)
                  ).map(([date, items]) => (
                    <div key={date} className="mb-8">
                      <h3 className="text-xs font-bold text-gray-400 mb-4">{date}</h3>
                      <div className="bg-white rounded-[32px] shadow-sm border border-black/5 divide-y divide-black/5">
                        {items.map((activity, index) => {
                          const itemKey = `${date}-${index}`;
                          const trimmedContent = activity.content.trim();
                          const linesCount = trimmedContent.split('\n').filter((line: string) => line.trim().length > 0).length;
                          const isLong = trimmedContent.length > 150 || linesCount > 3;
                          const isExpanded = expandedItems[itemKey];

                          return (
                            <div key={index} className="p-6 flex gap-6 hover:bg-black/[0.02] transition-colors first:rounded-t-[32px] last:rounded-b-[32px]">
                              <span className="text-xs font-bold tabular-nums text-gray-400 shrink-0 w-16">{activity.time}</span>
                              <div className="flex-1">
                                <p className={`text-sm leading-relaxed text-gray-800 whitespace-pre-line mb-2 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                  {activity.content}
                                </p>
                                {isLong && (
                                  <button 
                                    onClick={() => setExpandedItems(prev => ({...prev, [itemKey]: !prev[itemKey]}))}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline mt-1"
                                  >
                                    {isExpanded ? "Show less" : "Show more"}
                                  </button>
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

              <div className="fixed bottom-6 right-8 bg-white border border-black/5 shadow-2xl rounded-2xl flex items-center justify-between px-5 py-4 min-w-[260px] z-50 hover:shadow-xl transition-shadow cursor-pointer group">
                <span className="text-sm font-bold text-gray-800">Onboarding Tasks <span className="text-gray-400 font-normal ml-2">0/5</span></span>
                <button className="w-6 h-6 rounded-full group-hover:bg-black/5 flex items-center justify-center transition-colors">
                  <ChevronUp size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {activeSection === "Snippets" && (
            <div className={`mx-auto py-12 w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-4xl'}`}>
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-center mb-12"
               >
                  <h2 className="text-3xl font-serif mb-4">Snippets</h2>
                  <p className="text-gray-500">Your dictation workspace. Hold Ctrl + Alt to start dictating.</p>
               </motion.div>

               <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Snippet Sandbox</label>
                        </div>
                        <textarea 
                          value={testText}
                          onChange={(e) => setTestText(e.target.value)}
                          placeholder="Focus here and hold Ctrl + Alt to dictate..."
                          className="w-full h-64 p-6 bg-[#f8f7f0] rounded-2xl border-none focus:ring-2 focus:ring-accent-orange/20 transition-all text-lg font-sans placeholder:text-gray-300 resize-none"
                        />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-[#f0ede0] rounded-[32px] p-6 border border-black/5">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Shortcuts</p>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                             <span>Start Rec.</span>
                             <span className="px-2 py-1 bg-black/5 rounded font-mono font-bold">Ctrl + Alt (Hold)</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                             <span>Stop Rec.</span>
                             <span className="px-2 py-1 bg-black/5 rounded font-mono font-bold">Release Keys</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                             <span>Paste saved</span>
                             <span className="px-2 py-1 bg-black/5 rounded font-mono font-bold">Ctrl + Alt + S</span>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeSection === "Speed Mode" && (
            <div className={`mx-auto py-12 w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-2xl'}`}>
              <header className="mb-12">
                <h2 className="text-3xl font-serif mb-2">Speed Mode</h2>
                <p className="text-gray-500">Manage your dictation speed preferences.</p>
              </header>

              <div className="space-y-8">
                <section className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Dictation Preferences</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold mb-1">Dictation Speed Mode</p>
                      <p className="text-xs text-gray-500 mb-4">Choose how Sayikor balances speed, accuracy, and local system resource usage.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          id: "ultra-fast",
                          name: "Ultra-Fast",
                          desc: "Instant real-time Cloud Streaming via Deepgram + LLM Refinement. Zero local latency.",
                          badge: "Cloud Stream"
                        },
                        {
                          id: "fast",
                          name: "Fast",
                          desc: "Standard Cloud Batch Upload + LLM Refinement on key release. Balance of speed & quality.",
                          badge: "Cloud Batch"
                        },
                        {
                          id: "queued",
                          name: "Queued",
                          desc: "On-demand Local Whisper.cpp + Gemini. Unloads the AI from system RAM immediately after use.",
                          badge: "Offline / Eco"
                        }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleSpeedChange(opt.id)}
                          className={`flex flex-col text-left p-5 rounded-[24px] border-2 transition-all hover:scale-[1.01] ${
                            dictationSpeed === opt.id
                              ? "border-accent-green bg-accent-green-light/5 shadow-sm"
                              : "border-black/5 hover:border-black/10 bg-[#fbfbf8]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <span className="font-bold text-sm">{opt.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              dictationSpeed === opt.id
                                ? "bg-accent-green text-white"
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
                  </div>
                </section>

                <section className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Application</h3>
                  
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-bold">Software Update</p>
                      <p className="text-xs text-gray-500">Check for the latest version of Sayikor.</p>
                    </div>
                    <button 
                      onClick={() => {
                        alert("Updates not yet implemented");
                      }}
                      className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={14} /> Check for Updates
                    </button>
                  </div>
                </section>

                <section className="bg-red-50/50 rounded-[32px] border border-red-100 p-8">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4">Danger Zone</h3>
                   <button className="text-red-600 text-xs font-bold hover:underline">
                     Reset all application data
                   </button>
                </section>
              </div>
            </div>
          )}

          <SettingsModal 
            isOpen={isSettingsModalOpen} 
            onClose={() => setIsSettingsModalOpen(false)} 
          />

          {activeSection === "Dictionary" && (
            <div className={`mx-auto py-12 w-full transition-all duration-300 ${isMaximized ? 'max-w-full px-8' : 'max-w-2xl'}`}>
              <header className="mb-12">
                <h2 className="text-3xl font-serif mb-2">Personal Dictionary</h2>
                <p className="text-gray-500">Teach Sayikor industry terms, names, and custom phrases to improve transcription accuracy.</p>
              </header>

              <div className="space-y-6">
                <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                  <div className="flex gap-3 mb-8">
                    <input 
                      type="text" 
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newWord) {
                          setDictionary([...dictionary, newWord]);
                          setNewWord("");
                        }
                      }}
                      placeholder="Add a new term (e.g. Sayikor)..."
                      className="flex-1 bg-[#f8f7f0] px-6 py-3 rounded-2xl border-none focus:ring-2 focus:ring-accent-orange/20 transition-all"
                    />
                    <button 
                      onClick={() => {
                        if (newWord) {
                          setDictionary([...dictionary, newWord]);
                          setNewWord("");
                        }
                      }}
                      className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:opacity-90 transition-all"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dictionary.map((word) => (
                      <span 
                        key={word} 
                        className="bg-accent-orange/10 text-accent-orange px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 group"
                      >
                        {word}
                        <button 
                          onClick={() => setDictionary(dictionary.filter(w => w !== word))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {dictionary.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No custom words added yet.</p>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-accent-orange/5 border border-accent-orange/10 rounded-[32px] flex items-start gap-4">
                  <ShieldCheck className="text-accent-orange shrink-0" size={24} />
                  <div>
                    <h4 className="text-sm font-bold mb-1">Contextual Awareness</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Sayikor injects these words into the AI's "worldview" during every transcription. This forces the model to choose your custom spelling over its own phonetic assumptions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection !== "Home" && activeSection !== "Snippets" && activeSection !== "Speed Mode" && activeSection !== "Dictionary" && (
            <div className={`mx-auto py-32 w-full transition-all duration-300 flex flex-col items-center justify-center text-center ${isMaximized ? 'max-w-full px-8' : 'max-w-2xl'}`}>
               <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="text-gray-400" size={32} />
               </div>
               <h2 className="text-xl font-bold mb-2">{activeSection} is coming soon</h2>
               <p className="text-gray-500">We're still crafting this part of the experience.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
