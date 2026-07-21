import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Globe2, 
  Cloud, 
  Youtube, 
  Music, 
  Play, 
  ArrowRight,
  Download,
  CheckCircle2,
  Menu,
  X,
  ChevronDown,
  Loader2,
  Clock,
  Zap,
  Coins,
  MessageSquare,
  Infinity,
  CreditCard,
  HelpCircle,
  Cpu,
  Wifi,
  Sparkles,
  Globe,
  Settings,
  Database,
  LogOut,
  Copy,
  PlusCircle,
  Link,
  Check,
  RefreshCw
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import ContactSalesPage from "./ContactSalesPage";
import PaymentSuccessPage from "./PaymentSuccessPage";
import { 
  loadWaitlistConfig, 
  saveWaitlistConfig, 
  getLocalSubscribers, 
  submitWaitlistEmail, 
  syncIndividualSubscriber,
  WaitlistSubscriber
} from "./lib/waitlistSync";

const FAQ_ITEMS = [
  {
    id: 0,
    question: "What exactly is Ikor, and how is it different from normal dictation?",
    answer: (
      <p className="text-sm leading-relaxed text-gray-600 font-medium font-sans">
        Traditional voice typing tools blindly transcribe your words exactly as you say them, capturing every "um," "uh," repetition, and awkward pause. <strong className="font-black text-gray-950">Ikor is a context-aware intent engine</strong>. It doesn’t just listen to your voice; it understands the core thought you are trying to express. ScribePro captures your raw ideas, filters out speech friction, and outputs perfectly structured, executive-ready text based entirely on your intent.
      </p>
    ),
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50 border-amber-100"
  },
  {
    id: 1,
    question: "Where can I use Ikor to type?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 font-medium font-sans">
        <p>
          <strong className="font-black text-gray-950">Anywhere your cursor is blinking.</strong> Because Ikor runs as a lightweight, native desktop application, it integrates directly at the operating system level rather than being locked inside a specific web browser. You can use it seamlessly across:
        </p>
        <ul className="list-disc pl-5 space-y-2 font-semibold text-gray-500">
          <li>
            <span className="text-gray-800 font-bold">Communication Hubs:</span> Gmail, WhatsApp, Slack, Teams.
          </li>
          <li>
            <span className="text-gray-800 font-bold">Productivity & Knowledge Apps:</span> Notion, Google Sheets, Google Slides, Microsoft Word.
          </li>
          <li>
            <span className="text-gray-800 font-bold">Developer & Creator Workspaces:</span> Cursor, Lovable, VS Code.
          </li>
        </ul>
      </div>
    ),
    icon: Globe,
    color: "text-blue-600 bg-blue-50 border-blue-100"
  },
  {
    id: 2,
    question: "How does the \"context-aware\" typing work in practice?",
    answer: (
      <p className="text-sm leading-relaxed text-gray-600 font-medium font-sans">
        Ikor adapts its formatting style to match the environment you are currently typing in. If you are replying to a quick message on WhatsApp or Slack, it formats your thoughts into a casual, crisp message layout. If your cursor is active inside Gmail, Notion, or Cursor, it automatically structures your dictation into professional, polished prose or clean technical documentation without requiring manual edits.
      </p>
    ),
    icon: Zap,
    color: "text-orange-600 bg-orange-50 border-orange-100"
  },
  {
    id: 3,
    question: "Does Ikor support African accents and regional dialects?",
    answer: (
      <p className="text-sm leading-relaxed text-gray-600 font-medium font-sans">
        Yes, natively. Standard global speech platforms routinely fail to parse regional accents. Ikor was built specifically to solve this digital exclusion gap. The engine is deeply optimized to understand and accurately transcribe accented English.
      </p>
    ),
    icon: HelpCircle,
    color: "text-green-600 bg-green-50 border-green-100"
  },
  {
    id: 4,
    question: "Do I need a constant internet connection to use it?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 font-medium font-sans">
        <p>
          No. Ikor features a highly resilient, three-tiered engine designed to match your immediate network environment:
        </p>
        <ul className="list-disc pl-5 space-y-2 font-semibold text-gray-500">
          <li>
            <span className="text-gray-800 font-bold">Offline Mode:</span> Uses a fully localized AI model running directly on your computer's local hardware. You can type out your thoughts with <span className="font-bold text-gray-900 underline">zero data consumption</span> and absolute privacy, even in total isolation from the internet.
          </li>
          <li>
            <span className="text-gray-800 font-bold">Standard Mode:</span> Activates when internet is available, processing audio through optimized cloud networks paired with deep language models for highly polished text styling.
          </li>
          <li>
            <span className="text-gray-800 font-bold">Priority Mode:</span> An ultra-low latency, streaming engine designed for near-instant visual feedback.
          </li>
        </ul>
      </div>
    ),
    icon: Wifi,
    color: "text-indigo-600 bg-indigo-50 border-indigo-100"
  },
  {
    id: 5,
    question: "Will running this application slow down my computer?",
    answer: (
      <p className="text-sm leading-relaxed text-gray-600 font-medium font-sans">
        Not at all. Ikor is engineered to be incredibly lightweight, secure, and fast. Unlike traditional AI tools that hog gigabytes of system memory and large setup file size, our hybrid transcription framework is optimized to run smoothly with a microscopic RAM footprint, ensuring your machine stays fast and cool even while compiling code or running design software in the background.
      </p>
    ),
    icon: Cpu,
    color: "text-purple-600 bg-purple-50 border-purple-100"
  }
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<"landing" | "pricing" | "faq" | "contact-sales" | "demo" | "payment-success">("landing");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [modalOpenedAndReady, setModalOpenedAndReady] = useState(false);
  const [pricingCurrency, setPricingCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isCloseVisible, setIsCloseVisible] = useState(false);
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadEmail, setDownloadEmail] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);  // Waitlist Background Submission State
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<WaitlistSubscriber[]>([]);
  const [isLinkingSheet, setIsLinkingSheet] = useState(false); // Used for sync loading
  const [sheetsFeedback, setSheetsFeedback] = useState<string | null>(null);

  const [tempGoogleFormUrl, setTempGoogleFormUrl] = useState("");
  const [tempEmailEntryId, setTempEmailEntryId] = useState("");
  const [tempWebAppUrl, setTempWebAppUrl] = useState("");
  const [tempActiveMethod, setTempActiveMethod] = useState<"google_form" | "web_app" | "local_only">("local_only");

  // Load configuration and subscriber records on mount
  useEffect(() => {
    const config = loadWaitlistConfig();
    setTempGoogleFormUrl(config.googleFormUrl || "");
    setTempEmailEntryId(config.emailEntryId || "");
    setTempWebAppUrl(config.webAppUrl || "");
    setTempActiveMethod(config.activeMethod || "local_only");
    setSubscribers(getLocalSubscribers());
  }, [isAdminSettingsOpen]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    if (window.location.pathname === "/demo") {
      window.history.pushState({}, "", "/");
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const rawPath = window.location.pathname;
      const path = rawPath.replace(/\/$/, "").toLowerCase() || "/";
      if (path === "/demo") {
        setView("demo");
        setIsVideoModalOpen(false);
      } else if (path === "/pricing") {
        setView("pricing");
        setIsVideoModalOpen(false);
      } else if (path === "/faq") {
        setView("faq");
        setIsVideoModalOpen(false);
      } else if (path === "/contact-sales") {
        setView("contact-sales");
        setIsVideoModalOpen(false);
      } else if (path === "/payment-success") {
        setView("payment-success");
        setIsVideoModalOpen(false);
      } else {
        setView("landing");
        setIsVideoModalOpen(false);
      }
    };

    handleLocationChange();

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Dynamically update document.title based on the active view
  useEffect(() => {
    switch (view) {
      case "landing":
        document.title = "AI Speech to Text Windows Dictation Software | Ikor";
        break;
      case "demo":
        document.title = "How it works | Ikor";
        break;
      case "pricing":
        document.title = "Pricing | Ikor";
        break;
      case "faq":
        document.title = "FAQ | Ikor";
        break;
      case "contact-sales":
        document.title = "Contact sales | Ikor";
        break;
      case "payment-success":
        document.title = "Payment Successful - Ikor";
        break;
      default:
        document.title = "AI Speech to Text Windows Dictation Software | Ikor";
        break;
    }
  }, [view]);

  // Scroll to top on view changes or page reload to override browser scroll restoration
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [view]);

  // Handle subscriber waitlist submission
  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadEmail) return;

    setIsDownloading(true);
    try {
      const { synced, method } = await submitWaitlistEmail(downloadEmail);
      setIsDownloading(false);
      setIsDownloadModalOpen(false);
      setDownloadEmail("");

      if (method === "local_only") {
        setPricingFeedback("You have been successfully added to the waitlist! We will keep you updated. ✨");
      } else if (synced) {
        setPricingFeedback("You have been successfully added to the waitlist! We will keep you updated. ✨");
      } else {
        setPricingFeedback("You have been successfully added to the waitlist! We will keep you updated. ✨");
      }

      setSubscribers(getLocalSubscribers());
    } catch (err) {
      console.error("Submission error:", err);
      setIsDownloading(false);
      setPricingFeedback("Successfully added to waitlist! We will notify you when access is available.");
    }
  };

  // Sync any unsynced subscribers to Google
  const syncAllToGoogleSheets = async () => {
    setIsLinkingSheet(true);
    let successCount = 0;
    const unsynced = subscribers.filter((s) => !s.synced);

    for (const sub of unsynced) {
      const success = await syncIndividualSubscriber(sub);
      if (success) {
        successCount++;
      }
    }

    setSubscribers(getLocalSubscribers());
    setIsLinkingSheet(false);

    if (successCount > 0) {
      setSheetsFeedback(`Successfully synced ${successCount} subscriber(s) in the background!`);
    } else if (unsynced.length > 0) {
      setSheetsFeedback("Sync failed. Please verify your Google Form/Web App settings.");
    } else {
      setSheetsFeedback("All subscribers are already synced.");
    }
    setTimeout(() => setSheetsFeedback(null), 3500);
  };

  // Save the waitlist settings configuration
  const handleSaveConfig = () => {
    try {
      saveWaitlistConfig({
        googleFormUrl: tempGoogleFormUrl.trim(),
        emailEntryId: tempEmailEntryId.trim(),
        webAppUrl: tempWebAppUrl.trim(),
        activeMethod: tempActiveMethod,
      });
      setSheetsFeedback("Waitlist submission settings saved successfully! ✨");
      setTimeout(() => setSheetsFeedback(null), 3500);
    } catch (e: any) {
      setSheetsFeedback(`Failed to save configuration: ${e.message}`);
    }
  };

  const handleModalMouseMove = () => {
    setIsCloseVisible(true);
    if (mouseTimerRef.current) {
      clearTimeout(mouseTimerRef.current);
    }
    mouseTimerRef.current = setTimeout(() => {
      setIsCloseVisible(false);
    }, 2000);
  };

  useEffect(() => {
    if (pricingFeedback) {
      const timer = setTimeout(() => setPricingFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [pricingFeedback]);

  // Disable page scrolling when the mobile hamburger menu or get access modal is open
  useEffect(() => {
    if (isMenuOpen || isDownloadModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isMenuOpen, isDownloadModalOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isVideoModalOpen) {
      setIsVideoLoading(true);
      setModalOpenedAndReady(false);
      setIsCloseVisible(false);
      // Wait for the modal scaling animation (350ms) to complete before rendering the iframe,
      // so the iframe measures the final container size instead of 0 or a scaling size,
      // which forces YouTube to initialize in high resolution.
      const timer = setTimeout(() => {
        setModalOpenedAndReady(true);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsVideoLoading(true);
      setModalOpenedAndReady(false);
      setIsCloseVisible(false);
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }
    }
  }, [isVideoModalOpen]);

  useEffect(() => {
    return () => {
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`min-h-screen font-sans selection:bg-accent-green-light selection:text-black ${view === "payment-success" ? "" : "pt-20 sm:pt-24"}`}>
      {/* Fixed Header with Glassmorphism */}
      {view !== "payment-success" && (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? "bg-warm-bg/85 backdrop-blur-md border-b border-gray-100/50 shadow-sm" 
            : "bg-transparent"
        }`}>

        {/* Navigation */}
        <nav id="navbar" className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ${scrolled ? "py-4" : "py-6"}`}>
          <div 
            onClick={() => { navigateTo("/"); window.scrollTo({ top: 0 }); }}
            className="flex items-center gap-2 group cursor-pointer" 
            title="Go to home"
          >
            <img src="/sayikor_logo.png" alt="Ikor" className="h-8 object-contain transition-transform group-hover:scale-105" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 absolute left-1/2 -translate-x-1/2">
            <button 
              onClick={() => {
                navigateTo("/demo");
                window.scrollTo({ top: 0 });
              }}
              className={`hover:text-black transition-colors font-medium cursor-pointer ${
                view === "demo" ? "text-black font-semibold underline underline-offset-4" : ""
              }`}
            >
              How it works
            </button>
            <button 
              onClick={() => {
                navigateTo("/pricing");
                window.scrollTo({ top: 0 });
              }}
              className={`hover:text-black transition-colors font-medium cursor-pointer ${
                view === "pricing" ? "text-black font-semibold underline underline-offset-4" : ""
              }`}
            >
              Pricing
            </button>
            <button 
              onClick={() => {
                navigateTo("/faq");
                window.scrollTo({ top: 0 });
              }}
              className={`hover:text-black transition-colors font-medium cursor-pointer ${
                view === "faq" ? "text-black font-semibold underline underline-offset-4" : ""
              }`}
            >
              FAQ
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => { navigateTo("/contact-sales"); window.scrollTo({ top: 0 }); }} className="hidden sm:block text-sm font-medium hover:opacity-70 cursor-pointer text-gray-700">Contact sales</button>
            <button onClick={() => setIsDownloadModalOpen(true)} id="nav-cta" className="flex bg-accent-orange text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:brightness-95 transition-all shadow-sm items-center gap-2 cursor-pointer">
              <img src="/microsoft-windows.svg" alt="Windows" className="w-4 h-4 brightness-0 invert" />
              <span className="hidden sm:inline text-white">Get Access for Windows</span>
              <span className="sm:hidden text-white">Get Access</span>
            </button>
            <button 
              className="md:hidden p-2 text-black hover:bg-black/5 rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </nav>
      </header>
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-[100]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-warm-bg border-l border-gray-200 shadow-2xl p-8 md:hidden flex flex-col z-[110]"
            >
              <div className="flex items-center justify-between mb-12">
                <div 
                  onClick={() => { navigateTo("/"); setIsMenuOpen(false); window.scrollTo({ top: 0 }); }}
                  className="cursor-pointer"
                >
                  <img src="/sayikor_logo.png" alt="Ikor" className="h-8 object-contain" />
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2"><X size={24} /></button>
              </div>
              <div className="flex flex-col gap-6 text-lg font-medium">
                <button 
                  onClick={() => { 
                    navigateTo("/demo"); 
                    setIsMenuOpen(false); 
                    window.scrollTo({ top: 0 }); 
                  }}
                  className={`text-left hover:text-gray-500 transition-colors border-b border-gray-100 pb-2 cursor-pointer font-medium ${
                    view === "demo" ? "text-accent-orange font-bold" : ""
                  }`}
                >
                  How it works
                </button>
                {["Pricing", "FAQ"].map((item) => (
                  item === "Pricing" ? (
                    <button
                      key={item}
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigateTo("/pricing");
                        window.scrollTo({ top: 0 });
                      }}
                      className={`text-left hover:text-gray-500 transition-colors border-b border-gray-100 pb-2 cursor-pointer font-medium ${
                        view === "pricing" ? "text-accent-orange font-bold" : ""
                      }`}
                    >
                      Pricing
                    </button>
                  ) : (
                    <button
                      key={item}
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigateTo("/faq");
                        window.scrollTo({ top: 0 });
                      }}
                      className={`text-left hover:text-gray-500 transition-colors border-b border-gray-100 pb-2 cursor-pointer font-medium ${
                        view === "faq" ? "text-accent-orange font-bold" : ""
                      }`}
                    >
                      FAQ
                    </button>
                  )
                ))}
              </div>
              <div className="mt-auto pt-8 flex flex-col gap-4">
                <button onClick={() => { setIsDownloadModalOpen(true); setIsMenuOpen(false); }} className="w-full bg-accent-orange text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
                  <Download size={18} /> Get Started
                </button>
                <button onClick={() => { navigateTo("/contact-sales"); setIsMenuOpen(false); window.scrollTo({ top: 0 }); }} className="w-full bg-white border border-gray-200 py-4 rounded-xl font-bold cursor-pointer text-gray-700">Contact sales</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {view === "landing" && (
        <main id="hero" className="max-w-7xl mx-auto px-6 pt-8 md:pt-12 lg:pt-16 pb-24 md:pb-32 text-center">
          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-[1.05] tracking-tight mb-8"
          >
            Stop typing.<span className="animate-cursor-blink text-accent-orange select-none font-sans font-light ml-0.5">|</span> <br />
            <span className="italic text-gray-400">Ikor</span> helps you type <br /> 4x faster.
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-600 mb-10 md:mb-14 leading-relaxed px-4 sm:px-0"
          >
            The context-aware AI dictation engine that understands exactly what you mean. Speak naturally in your accent and Ikor instantly types your words, perfectly formatted, everywhere your cursor blinks.
          </motion.p>

          {/* Primary CTA Group */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 md:mb-16"
          >
            <button onClick={() => setIsDownloadModalOpen(true)} id="hero-download" className="w-full sm:w-auto bg-black text-white px-8 py-4 sm:py-5 rounded-2xl text-lg font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
              <img src="/microsoft-windows.svg" alt="Windows" className="w-5 h-5 brightness-0 invert" />
              <span className="hidden sm:inline">Get Access for Windows</span>
              <span className="sm:hidden">Get Access</span>
            </button>
            <button onClick={() => { navigateTo("/demo"); window.scrollTo({ top: 0 }); }} id="hero-watch" className="w-full sm:w-auto bg-white border border-gray-200 px-8 py-4 sm:py-5 rounded-2xl text-lg font-semibold hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
              <Play size={20} fill="currentColor" />
              Watch in action
            </button>
          </motion.div>

          {/* Integrations Ribbon */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-6 md:pt-8 border-t border-gray-100"
          >
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-10">Works everywhere. No integration required.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap justify-center items-center gap-y-12 gap-x-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/gmail.png" alt="Gmail" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Gmail</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/notion.png" alt="Notion" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Notion</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/slack.png" alt="Slack" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Slack</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/chatgpt.png" alt="ChatGPT" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">ChatGPT</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/discord.svg" alt="Discord" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Discord</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/figma.svg" alt="Figma" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Figma</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/vscode.png" alt="VScode" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">VScode</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/cursor.png" alt="Cursor" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Cursor</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/whatsapp.png" alt="WhatsApp" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">WhatsApp</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src="/logos/outlook.png" alt="Outlook" className="w-7 h-7 object-contain" />
                <span className="font-bold text-base md:text-lg">Outlook</span>
              </div>
            </div>
          </motion.div>
        </main>
      )}

      {view === "demo" && (
        <main className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-32">
          {/* Elegant Page Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="px-3.5 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-black tracking-widest rounded-lg uppercase font-sans">
              HOW IT WORKS
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight mt-4 text-gray-900 leading-[1.15]">
              Watch Ikor in Action
            </h1>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-500 font-semibold mt-4">
              See how our context-aware AI dictation engine turns natural speech into perfectly formatted text.
            </p>
          </div>

          {/* Premium Video Container with subtle glow and borders */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="relative aspect-video w-full bg-black rounded-[32px] overflow-hidden shadow-2xl border border-black/5 bg-[#FAF8F5]/30">
              <iframe 
                className="w-full h-full aspect-video"
                src="https://www.youtube.com/embed/Vz5EIda3kss?autoplay=1&vq=hd1080" 
                title="Ikor Demo June 2026" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen
              ></iframe>
            </div>
          </div>

          {/* Feature Grid describing the step-by-step logic */}
          <div className="max-w-4xl mx-auto mb-24 text-left">
            <h2 className="font-serif text-2xl sm:text-3xl text-center tracking-tight text-gray-900 mb-12">
              Three Steps to 4x Faster Typing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white border border-black/5 p-8 rounded-[28px] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-full bg-accent-orange flex items-center justify-center text-white font-sans font-black text-lg mb-6">
                  1
                </div>
                <h3 className="font-sans font-black text-lg text-gray-900 mb-2">1. Place Cursor</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Click anywhere you want to type. Ikor runs natively in the background, working across all your apps, websites, and editors.
                </p>
              </div>

              <div className="bg-white border border-black/5 p-8 rounded-[28px] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-full bg-accent-orange flex items-center justify-center text-white font-sans font-black text-lg mb-6">
                  2
                </div>
                <h3 className="font-sans font-black text-lg text-gray-900 mb-2">2. Speak Naturally</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Press the shortcut key and talk. Speak in your local accent, tone, and pacing. Ikor filters out filler words like "um" and "ah" automatically.
                </p>
              </div>

              <div className="bg-white border border-black/5 p-8 rounded-[28px] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-full bg-accent-orange flex items-center justify-center text-white font-sans font-black text-lg mb-6">
                  3
                </div>
                <h3 className="font-sans font-black text-lg text-gray-900 mb-2">3. Clean Output</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Ikor generates a perfectly formatted, executive-ready text output, and performs all your typing tasks. No manual typing, no copy-pasting, and no extra editing.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Accordion under the video on Demo Page */}
          <div className="mt-24 max-w-3xl mx-auto text-center">
            <span className="px-3.5 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-black tracking-widest rounded-lg uppercase font-sans">
              FAQ
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight mt-4 mb-10 text-gray-900">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4 text-left">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isOpen 
                        ? "bg-white border-black/10 shadow-sm" 
                        : "bg-white/45 hover:bg-white/70 border-black/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : item.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                    >
                      <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-gray-900">
                        {item.question}
                      </span>
                      <div className={`text-gray-400 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-black" : ""}`}>
                        <ChevronDown size={18} />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 pt-1 border-t border-black/5 pr-8">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* CTA panel inside Demo page */}
          <div className="mt-16 text-center border border-black/5 bg-white rounded-[32px] p-8 md:p-12 shadow-sm max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">
              Ready to experience context-aware dictation?
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed max-w-lg mx-auto mb-8">
              Download Ikor for Windows now to experience high-accuracy, zero-friction, accent-tolerant typing natively on your machine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="w-full sm:w-auto bg-accent-orange text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:brightness-95 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <img src="/microsoft-windows.svg" alt="Windows" className="w-4 h-4 brightness-0 invert" />
                <span>Get Access for Windows</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigateTo("/pricing");
                  window.scrollTo({ top: 0 });
                }}
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View Pricing Plans</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </main>
      )}

      {view === "pricing" && (
        <main className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-32 text-center">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="px-3.5 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-black tracking-widest rounded-lg uppercase font-sans">
                PRICING
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight mt-4 text-gray-900 leading-[1.15]">
                Get started for free. <br />
                Upgrade anytime.
              </h1>
            </div>

            {/* Currency Switcher */}
            <div className="flex justify-center mb-12">
              <div className="flex items-center bg-gray-100/80 border border-black/5 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setPricingCurrency('NGN')} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pricingCurrency === 'NGN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ₦ Nigerian Naira
                </button>
                <button 
                  type="button"
                  onClick={() => setPricingCurrency('USD')} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pricingCurrency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  $ US Dollar
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(() => {
                const plans = [
                  {
                    name: "Free",
                    category: "Trial",
                    price: pricingCurrency === 'NGN' ? '₦0' : '$0',
                    note: "No credit card required",
                    highlight: false,
                    bgStyle: "bg-white border-black/5",
                    features: [
                      { text: "900 free words total", icon: FileText },
                      { text: "Standard speed modes", icon: Zap },
                      { text: `${pricingCurrency === 'NGN' ? '₦300' : '$0.3'} per 1,000 words top-up`, icon: Coins },
                      { text: "Community support", icon: MessageSquare }
                    ]
                  },
                  {
                    name: "Ikor Plus",
                    category: "For individuals",
                    price: pricingCurrency === 'NGN' ? '₦3,000' : '$3',
                    note: "Billed monthly",
                    highlight: true,
                    bgStyle: "bg-red-50/25 border-red-500/50 relative shadow-md",
                    features: [
                      { text: "40,000 words total", icon: FileText },
                      { text: "Standard speed modes", icon: Zap },
                      { text: `${pricingCurrency === 'NGN' ? '₦150' : '$0.15'} per 1,000 words top-up`, icon: Coins },
                      { text: "Standard support + Early access", icon: MessageSquare }
                    ]
                  },
                  {
                    name: "Ikor Pro",
                    category: "For individuals",
                    price: pricingCurrency === 'NGN' ? '₦9,000' : '$9',
                    note: "Billed monthly",
                    highlight: false,
                    bgStyle: "bg-white border-black/5",
                    features: [
                      { text: "120,000 words total", icon: FileText },
                      { text: "Unlocks Ultrafast speed", icon: Zap },
                      { text: `${pricingCurrency === 'NGN' ? '₦75' : '$0.075'} per 1,000 words top-up`, icon: Coins },
                      { text: "Priority support + Early access", icon: MessageSquare }
                    ]
                  }
                ];

                return plans.map((plan) => {
                  const btnText = plan.name === "Free" ? "Get started" : plan.name === "Ikor Plus" ? "Go Plus" : "Go Pro";
                  
                  return (
                    <div 
                      key={plan.name} 
                      className={`border rounded-[32px] p-8 flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative text-left ${plan.bgStyle}`}
                    >
                      {plan.highlight && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs border border-red-500">
                          Popular
                        </div>
                      )}

                      <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                        {plan.category}
                      </div>

                      <h3 className="font-sans font-black text-2xl text-gray-900 mb-2">
                        {plan.name}
                      </h3>

                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-4xl font-sans font-black tracking-tight text-gray-950">
                          {plan.price}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          / month
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 font-semibold mb-8">
                        {plan.note}
                      </p>

                      {/* Features list */}
                      <div className="space-y-4 mb-8 flex-1">
                        {plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex gap-3 text-xs text-gray-700 font-semibold items-start">
                            <div className="mt-0.5 text-red-500 shrink-0">
                              <feature.icon size={14} className="stroke-[2.5]" />
                            </div>
                            <span className="leading-tight">{feature.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDownloadModalOpen(true);
                        }}
                        className={`w-full py-4 rounded-2xl text-xs font-black tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                          plan.highlight
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                            : "bg-red-50 hover:bg-red-100/80 text-red-600 border border-red-200/55"
                        }`}
                      >
                        {btnText}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Dynamic Banner Ribbon */}
            <div className="border border-black/5 bg-[#FAF8F5]/30 rounded-[24px] p-6 text-xs text-gray-500 font-semibold leading-relaxed text-left shadow-2xs mt-12">
              ✨ Included in all Ikor plans: No-edit context-aware dictation • ScribePro smart formatting • System-wide integrations (Slack, Gmail, ChatGPT, WhatsApp, Notion, Discord, VScode, etc.) • Custom terms and shortcuts • Privacy mode
            </div>

            {/* Enterprise section */}
            <div className="border border-black/5 bg-white rounded-[32px] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xs transition-shadow duration-300 mt-8 text-left">
              <div className="space-y-1.5 text-left">
                <h4 className="font-sans font-black text-lg text-gray-900">
                  Enterprise Suite
                </h4>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed max-w-2xl">
                  For teams that need SOC 2 & HIPAA compliance, enforced zero data retention, advanced privacy and data controls, SSO/SAML, and bulk pricing rate reduction.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  navigateTo("/contact-sales");
                  window.scrollTo({ top: 0 });
                }}
                className="bg-black hover:bg-black/80 text-white px-7 py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-colors shrink-0 cursor-pointer"
              >
                Contact Sales
              </button>
            </div>

            {/* FAQ Accordion embedded in Pricing Page */}
            <div className="mt-24 max-w-3xl mx-auto text-center">
              <span className="px-3.5 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-black tracking-widest rounded-lg uppercase font-sans">
                FAQ
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl tracking-tight mt-4 mb-10 text-gray-900">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4 text-left">
                {FAQ_ITEMS.map((item, index) => {
                  const isOpen = openFaqIndex === item.id;
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                        isOpen 
                          ? "bg-white border-black/10 shadow-sm" 
                          : "bg-white/45 hover:bg-white/70 border-black/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : item.id)}
                        className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-gray-900">
                          {item.question}
                        </span>
                        <div className={`text-gray-400 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-black" : ""}`}>
                          <ChevronDown size={18} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="px-6 pb-6 pt-1 border-t border-black/5 pr-8">
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "faq" && (
        <main className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-32">
          <div className="max-w-3xl mx-auto">
            {/* Header section */}
            <div className="text-center mb-16">
              <span className="px-3.5 py-1.5 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] font-black tracking-widest rounded-lg uppercase font-sans">
                FAQ
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight mt-4 text-gray-900 leading-[1.15]">
                Frequently Asked Questions
              </h1>
              <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-500 font-semibold mt-4">
                Everything you need to know about Ikor's context-aware intent engine, features, compatibility, and offline capabilities.
              </p>
            </div>

            {/* Accordion container */}
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === item.id;
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isOpen 
                        ? "bg-white border-black/10 shadow-sm" 
                        : "bg-white/45 hover:bg-white/70 border-black/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : item.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                    >
                      <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-gray-900">
                        {item.question}
                      </span>
                      <div className={`text-gray-400 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-black" : ""}`}>
                        <ChevronDown size={18} />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 pt-1 border-t border-black/5 pr-8">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA panel inside FAQ standalone */}
            <div className="mt-16 text-center border border-black/5 bg-white rounded-[32px] p-8 md:p-12 shadow-sm">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">
                Ready to experience context-aware dictation?
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed max-w-lg mx-auto mb-8">
                Download Ikor for Windows now to experience high-accuracy, zero-friction, accent-tolerant typing natively on your machine.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="w-full sm:w-auto bg-accent-orange text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:brightness-95 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <img src="/microsoft-windows.svg" alt="Windows" className="w-4 h-4 brightness-0 invert" />
                  <span>Get Access for Windows</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateTo("/pricing");
                    window.scrollTo({ top: 0 });
                  }}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>View Pricing Plans</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "contact-sales" && (
        <ContactSalesPage onBackToHome={() => { navigateTo("/"); window.scrollTo({ top: 0 }); }} />
      )}

      {view === "payment-success" && (
        <PaymentSuccessPage />
      )}

      {/* Elegant Unified Footer Section */}
      {view !== "payment-success" && (
        <footer className="border-t border-gray-100 bg-white py-16 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo, Tagline & CTA */}
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
            <div 
              onClick={() => { navigateTo("/"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 cursor-pointer group"
              title="Go to home"
            >
              <img src="/sayikor_logo.png" alt="Ikor" className="h-7 object-contain transition-transform group-hover:scale-105" />
            </div>
            <p className="text-xs font-semibold text-gray-400 mt-1">
              Context-aware AI dictation engine that helps you <br />type faster with your local accent, tone, and intent.
            </p>
            
            {/* CTA Button inside Logo Column */}
            <button 
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm items-center gap-2 cursor-pointer mt-2"
            >
              <img src="/microsoft-windows.svg" alt="Windows" className="w-4 h-4 brightness-0 invert" />
              <span>Get Access for Windows</span>
            </button>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm font-semibold text-gray-500">
            <button 
              onClick={() => {
                navigateTo("/demo");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-black transition-colors cursor-pointer ${
                view === "demo" ? "text-black underline underline-offset-4" : ""
              }`}
            >
              How it works
            </button>
            <button 
              onClick={() => {
                navigateTo("/pricing");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-black transition-colors cursor-pointer ${
                view === "pricing" ? "text-black underline underline-offset-4" : ""
              }`}
            >
              Pricing
            </button>
            <button 
              onClick={() => {
                navigateTo("/faq");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-black transition-colors cursor-pointer ${
                view === "faq" ? "text-black underline underline-offset-4" : ""
              }`}
            >
              FAQ
            </button>
          </div>
        </div>

        {/* Bottom Copyright bar */}
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-400">
          <span>&copy; 2026 Ikor. All rights reserved.</span>
        </div>
      </footer>
      )}



      {/* Pricing Toast Feedback */}
      <AnimatePresence>
        {pricingFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10020] bg-neutral-900/95 backdrop-blur-md text-white px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl border border-neutral-800"
          >
            <div className="w-5 h-5 rounded-full bg-[#34a853]/20 border border-[#34a853]/40 flex items-center justify-center">
              <CheckCircle2 size={12} className="text-[#34a853]" strokeWidth={3} />
            </div>
            <span className="text-xs font-bold leading-none pr-1.5 tracking-tight text-white/95 font-sans">
              {pricingFeedback}
            </span>
          </motion.div>
        )}
      </AnimatePresence>






      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}} />



      {/* Download for Windows Premium Modal */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setIsDownloadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-4xl bg-warm-bg rounded-[32px] overflow-hidden shadow-2xl border border-black/5 flex flex-col md:flex-row min-h-[500px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="absolute top-6 right-6 z-20 bg-black/5 hover:bg-black/10 p-2.5 rounded-xl transition-all duration-200 text-gray-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>

              {/* Left Column: Form & Call to action OR Sheets Sync settings */}
              <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center items-center bg-warm-bg overflow-y-auto max-h-[600px]">
                {isAdminSettingsOpen ? (
                  // Direct Background Submission Setup Panel
                  <div className="w-full text-left space-y-5">
                    <div className="flex items-center gap-2.5 mb-2 border-b border-black/5 pb-3">
                      <Settings className="w-5 h-5 text-accent-orange" />
                      <div>
                        <h4 className="font-sans font-bold text-base text-gray-900 leading-tight">Direct Background Submission</h4>
                        <p className="text-[11px] text-gray-400 font-bold font-sans">Zero-Auth Direct Sync Setup</p>
                      </div>
                    </div>

                    {sheetsFeedback && (
                      <div className="p-3 bg-accent-orange/5 border border-accent-orange/20 text-accent-orange rounded-xl text-xs font-bold leading-relaxed">
                        {sheetsFeedback}
                      </div>
                    )}

                    {/* Method Selection Tabs */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Sync Method</label>
                      <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 rounded-xl border border-black/5">
                        <button
                          type="button"
                          onClick={() => setTempActiveMethod("google_form")}
                          className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                            tempActiveMethod === "google_form"
                              ? "bg-white text-gray-900 shadow-sm border border-black/[0.03]"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Google Form
                        </button>
                        <button
                          type="button"
                          onClick={() => setTempActiveMethod("web_app")}
                          className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                            tempActiveMethod === "web_app"
                              ? "bg-white text-gray-900 shadow-sm border border-black/[0.03]"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Web App URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setTempActiveMethod("local_only")}
                          className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                            tempActiveMethod === "local_only"
                              ? "bg-white text-gray-900 shadow-sm border border-black/[0.03]"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Local Only
                        </button>
                      </div>
                    </div>

                    {/* Configuration Form Inputs */}
                    <div className="bg-white p-4.5 rounded-2xl border border-black/5 shadow-sm space-y-3.5">
                      {tempActiveMethod === "google_form" && (
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Database size={13} className="text-accent-orange" />
                            Google Form Integration
                          </h5>

                          {/* NEW: Smart Helper Auto-Extractor Input */}
                          <div className="bg-accent-orange/[0.02] border border-dashed border-accent-orange/20 p-3 rounded-xl space-y-1">
                            <label className="block text-[10px] font-extrabold text-accent-orange uppercase tracking-wide">💡 Easy Auto-Fill Tool</label>
                            <input
                              type="text"
                              placeholder="Paste raw pre-filled link here..."
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                if (!val) return;
                                
                                // 1. Attempt to extract the Entry ID (entry.followed by digits)
                                const entryMatch = val.match(/entry\.[0-9]+/);
                                if (entryMatch) {
                                  setTempEmailEntryId(entryMatch[0]);
                                }
                                
                                // 2. Convert standard viewform or prefilled link to correct formResponse URL
                                let baseUrl = val.split("?")[0];
                                if (baseUrl.includes("/viewform")) {
                                  baseUrl = baseUrl.replace("/viewform", "/formResponse");
                                } else if (!baseUrl.endsWith("/formResponse")) {
                                  if (baseUrl.includes("/d/e/")) {
                                    const parts = baseUrl.split("/");
                                    const dIndex = parts.indexOf("d");
                                    if (dIndex !== -1 && parts[dIndex + 1] === "e") {
                                      const formId = parts[dIndex + 2];
                                      baseUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
                                    }
                                  }
                                }
                                setTempGoogleFormUrl(baseUrl);
                              }}
                              className="w-full px-2.5 py-1.5 border border-black/10 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-orange text-[11px] font-semibold text-gray-800 placeholder-gray-400"
                            />
                            <p className="text-[9px] text-gray-400 font-medium leading-normal mt-0.5">
                              Just paste your raw link, and we'll extract the <strong>Entry ID</strong> and correct <strong>Response URL</strong> below automatically!
                            </p>
                          </div>
                          
                          <div className="space-y-2.5 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Form Response URL</label>
                              <input
                                type="text"
                                value={tempGoogleFormUrl}
                                onChange={(e) => setTempGoogleFormUrl(e.target.value)}
                                placeholder="https://docs.google.com/forms/d/e/.../formResponse"
                                className="w-full px-3 py-2 border border-black/10 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-orange text-xs font-semibold text-gray-800"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Input Entry ID</label>
                              <input
                                type="text"
                                value={tempEmailEntryId}
                                onChange={(e) => setTempEmailEntryId(e.target.value)}
                                placeholder="entry.123456789"
                                className="w-full px-3 py-2 border border-black/10 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-orange text-xs font-semibold text-gray-800"
                              />
                            </div>
                          </div>

                          {/* Instructions */}
                          <details className="group border border-black/5 rounded-xl bg-neutral-50 overflow-hidden">
                            <summary className="px-3 py-2 text-[10px] font-extrabold text-gray-600 hover:text-accent-orange transition-colors cursor-pointer flex justify-between items-center select-none">
                              <span>HOW TO GET THIS LINK (SIMPLE 3 STEPS)</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <div className="p-3 border-t border-black/5 text-[10px] font-sans text-gray-500 bg-white leading-relaxed space-y-2 font-medium">
                              <p>1. Open your Google Form in edit mode.</p>
                              <p>2. Click the three dots icon (top-right) and select <strong className="text-gray-900 font-extrabold">"Get pre-filled link"</strong>.</p>
                              <p>3. Type any dummy word (like <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-gray-700">test</span>) in the email field, click <strong className="text-gray-900 font-extrabold">"Get link"</strong> at the bottom, copy it, and paste it in the <strong className="text-accent-orange font-extrabold">Easy Auto-Fill Tool</strong> above!</p>
                            </div>
                          </details>

                          {/* Troubleshooting Checklist */}
                          <details className="group border border-yellow-500/10 rounded-xl bg-yellow-50/20 overflow-hidden">
                            <summary className="px-3 py-2 text-[10px] font-extrabold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer flex justify-between items-center select-none">
                              <span>⚠️ NOT UPDATING? CHECK THESE 4 FORM SETTINGS</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <div className="p-3 border-t border-yellow-500/10 text-[10px] font-sans text-gray-600 bg-white leading-relaxed space-y-2.5 font-medium">
                              <div>
                                <p className="font-extrabold text-gray-800 flex items-center gap-1">
                                  <span className="text-red-500">❌</span> 1. Turn Off "Limit to 1 response"
                                </p>
                                <p className="text-[9px] text-gray-500 pl-4">Go to <strong className="text-gray-800">Settings</strong> → <strong className="text-gray-800">Responses</strong>. Turn off "Limit to 1 response". If active, Google forces a Sign-In screen, blocking the background sync.</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-800 flex items-center gap-1">
                                  <span className="text-red-500">❌</span> 2. Turn Off Organization Restrictions
                                </p>
                                <p className="text-[9px] text-gray-500 pl-4">In <strong className="text-gray-800">Settings</strong> → <strong className="text-gray-800">Responses</strong>, turn off "Restrict to users in [Your Company] and trusted organizations". Otherwise, outside/anonymous emails are blocked.</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-800 flex items-center gap-1">
                                  <span className="text-red-500">❌</span> 3. Set "Collect Email Addresses" to "Responder Input"
                                </p>
                                <p className="text-[9px] text-gray-500 pl-4">Do not use "Verified" email collection as it forces Google account login. Change it to <strong className="text-gray-800">"Responder input"</strong> or turn it off and use a normal text question instead.</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-800 flex items-center gap-1">
                                  <span className="text-green-600">✅</span> 4. Link Google Form to Sheets
                                </p>
                                <p className="text-[9px] text-gray-500 pl-4">To see results instantly in a spreadsheet, go to the <strong className="text-gray-800">"Responses"</strong> tab inside Google Forms and click <strong className="text-green-600 font-extrabold">"Link to Sheets"</strong>!</p>
                              </div>
                            </div>
                          </details>
                        </div>
                      )}

                      {tempActiveMethod === "web_app" && (
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Link size={13} className="text-accent-orange" />
                            Apps Script Web App Sync
                          </h5>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Web App URL</label>
                            <input
                              type="text"
                              value={tempWebAppUrl}
                              onChange={(e) => setTempWebAppUrl(e.target.value)}
                              placeholder="https://script.google.com/macros/s/.../exec"
                              className="w-full px-3 py-2 border border-black/10 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-orange text-xs font-semibold text-gray-800"
                            />
                          </div>

                          {/* Code Block for copying script */}
                          <details className="group border border-black/5 rounded-xl bg-neutral-50 overflow-hidden">
                            <summary className="px-3 py-2 text-[10px] font-extrabold text-gray-600 hover:text-accent-orange transition-colors cursor-pointer flex justify-between items-center select-none">
                              <span>GET THE GOOGLE APPS SCRIPT CODE</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <div className="p-3 border-t border-black/5 text-[10px] font-mono text-gray-500 bg-neutral-900 rounded-b-xl overflow-x-auto space-y-2">
                              <p className="text-gray-400 font-bold">Paste inside your Google Sheet's Extensions to Apps Script:</p>
                              <pre className="text-accent-orange font-medium leading-relaxed">{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([data.email, data.submittedAt, new Date().toISOString()]);
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                            </div>
                          </details>
                        </div>
                      )}

                      {tempActiveMethod === "local_only" && (
                        <div className="space-y-2 text-center py-2">
                          <p className="text-xs text-gray-500 font-semibold font-sans leading-relaxed">
                            No external synchronization configured. All waitlist subscriber entries are stored safely within your browser's private offline cache (<span className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-gray-700">localStorage</span>).
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                            Excellent for local testing, offline workflows, and maximum developer sandbox privacy.
                          </p>
                        </div>
                      )}

                      {/* Save Button */}
                      <div className="pt-2 border-t border-black/[0.03]">
                        <button
                          type="button"
                          onClick={handleSaveConfig}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm text-center block"
                        >
                          Save Settings Configuration
                        </button>
                      </div>
                    </div>

                    {/* Subscriber Sync Status List */}
                    <div className="bg-white p-4.5 rounded-2xl border border-black/5 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
                          Waitlist Records ({subscribers.length})
                        </h5>
                        
                        {subscribers.some(s => !s.synced) && tempActiveMethod !== "local_only" && (
                          <button
                            type="button"
                            onClick={syncAllToGoogleSheets}
                            disabled={isLinkingSheet}
                            className="flex items-center gap-1 bg-accent-orange hover:bg-accent-orange/90 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-sm"
                          >
                            <RefreshCw size={10} className={isLinkingSheet ? "animate-spin" : ""} />
                            Sync Unsynced
                          </button>
                        )}
                      </div>

                      <div className="max-h-[140px] overflow-y-auto border border-black/5 rounded-xl bg-neutral-50/50 p-2 space-y-1.5 divide-y divide-black/[0.03]">
                        {subscribers.length === 0 ? (
                          <p className="text-[11px] text-gray-400 font-semibold font-sans py-2 text-center">No subscriber submissions found in local browser history.</p>
                        ) : (
                          subscribers.map((sub, i) => (
                            <div key={sub.submittedAt || i} className="flex items-center justify-between pt-1.5 first:pt-0">
                              <span className="text-xs font-extrabold text-gray-800 truncate pr-2">{sub.email}</span>
                              <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                sub.synced 
                                  ? "bg-green-50 text-green-600 border border-green-100" 
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}>
                                {sub.synced ? "Synced to Google" : sub.method === "local_only" ? "Local Only" : "Unsynced"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Back to Request Form */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminSettingsOpen(false);
                          setSheetsFeedback(null);
                        }}
                        className="w-full bg-neutral-100 hover:bg-neutral-200 text-gray-800 font-extrabold py-3 px-6 rounded-xl transition-all cursor-pointer text-xs font-sans tracking-wide border border-black/5 text-center block"
                      >
                        ← Back to Waitlist Signup
                      </button>
                    </div>
                  </div>
                ) : (
                  // Waitlist Registration Form
                  <div className="w-full flex flex-col items-center justify-center text-center">
                    <div className="flex justify-center mb-6">
                      <img src="/png_icon_logo_Orange.png" alt="Ikor Logo" className="w-16 h-16 object-contain animate-pulse" />
                    </div>

                    <h3 className="font-sans font-extrabold text-2xl text-gray-900 tracking-tight mb-2">
                      Get Access to Ikor
                    </h3>
                    
                    <p className="text-sm font-semibold text-gray-500 mb-8 max-w-xs font-sans leading-relaxed">
                      Join our waitlist to get started for free.
                    </p>

                    <form onSubmit={handleDownloadSubmit} className="w-full max-w-xs space-y-4">
                      <div className="relative">
                        <input
                          required
                          type="email"
                          value={downloadEmail}
                          onChange={(e) => setDownloadEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full px-5 py-3.5 border border-black/10 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-orange/20 focus:border-accent-orange transition-all text-base font-semibold font-sans text-gray-900"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isDownloading}
                        className="w-full bg-accent-orange hover:bg-accent-orange/90 text-white font-extrabold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm font-sans tracking-wide shadow-md"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Requesting access...</span>
                          </>
                        ) : (
                          <>
                            <span>Get Access</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-[11px] text-gray-400 font-bold mt-4 tracking-tight font-sans">
                      Only used to help you get started — no spam.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Visual demonstration */}
              <div className="hidden md:flex flex-1 bg-gradient-to-br from-accent-green-light/40 via-warm-bg to-accent-green-light/10 p-12 flex-col justify-center items-center border-l border-black/5">
                <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-6">
                  {/* Visual Demonstration White Card */}
                  <div className="bg-white rounded-2xl p-7 shadow-lg border border-black/[0.01] w-full max-w-xs mx-auto">
                    <p className="text-[15px] leading-relaxed text-gray-800 font-bold font-sans">
                      <span className="line-through text-gray-300 font-semibold mr-1.5 decoration-gray-300 decoration-2 select-none">uh</span>
                      <span className="text-gray-900 mr-1.5">the files</span>
                      <span className="line-through text-gray-300 font-semibold mr-1.5 decoration-gray-300 decoration-2 select-none">is</span>
                      <span className="text-accent-orange font-extrabold mr-1.5">are</span>
                      <span className="text-gray-900 mr-1.5">ready, and the notes</span>
                      <br />
                      <span className="line-through text-gray-300 font-semibold mr-1.5 decoration-gray-300 decoration-2 select-none">are still needs</span>
                      <span className="text-gray-900 mr-1.5">one more pass</span>
                      <br />
                      <span className="text-gray-900 mr-1.5">before we send</span>
                      <span className="line-through text-gray-300 font-semibold mr-1.5 decoration-gray-300 decoration-2 select-none">it</span>
                      <span className="text-accent-orange font-extrabold">them</span>
                    </p>
                  </div>

                  {/* Waveform pill */}
                  <div className="bg-neutral-900/80 backdrop-blur-md text-white/95 rounded-full py-2.5 px-4.5 flex items-center gap-3.5 shadow-xl max-w-[280px] w-full mx-auto border border-white/5">
                    <div className="flex items-end gap-1 shrink-0 h-4 w-6">
                      <span className="w-[2.5px] bg-white/40 rounded-full animate-[pulse_1s_infinite_100ms] h-2"></span>
                      <span className="w-[2.5px] bg-white/70 rounded-full animate-[pulse_1s_infinite_300ms] h-3.5"></span>
                      <span className="w-[2.5px] bg-white rounded-full animate-[pulse_1s_infinite_500ms] h-4"></span>
                      <span className="w-[2.5px] bg-white/80 rounded-full animate-[pulse_1s_infinite_200ms] h-3"></span>
                      <span className="w-[2.5px] bg-white/30 rounded-full animate-[pulse_1s_infinite_400ms] h-1.5"></span>
                    </div>
                    <span className="truncate text-white/85 text-[11px] font-semibold tracking-wide font-sans">
                      <span className="opacity-40 line-through mr-1 font-normal select-none">uh</span>
                      the files is are ready, and the not...
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
