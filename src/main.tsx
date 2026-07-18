import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import App from "./App";
import Dashboard from "./components/Dashboard/Dashboard";
import ApprovalPanel from "./components/ApprovalPanel";
import Authentication from "./components/Auth/Authentication";
import Onboarding from "./components/Auth/Onboarding";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

// Wrapper that conditionally shows Dashboard behind Onboarding only on final steps (6-7)
const OnboardingWrapper = ({ 
  userProp, 
  setIsOnboardingCompleted 
}: { 
  userProp: { email: string; firstName: string; lastName: string }; 
  setIsOnboardingCompleted: (v: boolean) => void;
}) => {
  const [onboardingStep, setOnboardingStep] = React.useState(1);
  const showDashboardBehind = onboardingStep >= 6;

  return (
    <>
      {/* Dashboard rendered behind onboarding ONLY on the final steps (6-7) */}
      {showDashboardBehind && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <Dashboard onBack={() => {}} initialUser={{...userProp, totalWords: 0, transcriptionDates: []}} />
        </div>
      )}
      <div className={showDashboardBehind ? "relative z-50" : "relative z-50 w-full min-h-screen"}>
        <Onboarding 
          user={userProp}
          onStepChange={(step) => setOnboardingStep(step)}
          onComplete={async (selections: any) => {
            localStorage.setItem("sayikor_onboarding_completed", "true");
            if (selections?.dataMode === "privacy") {
              localStorage.setItem("sayikor_privacy_mode", "true");
            } else {
              localStorage.setItem("sayikor_privacy_mode", "false");
            }
            localStorage.setItem("sayikor_context_awareness", "true");
            if (selections?.selectedMicrophone) {
              localStorage.setItem("sayikor_selected_mic_id", selections.selectedMicrophone);
            }
            setIsOnboardingCompleted(true);

            // Sync onboarding completion and settings to Supabase
            try {
              await supabase.auth.updateUser({
                data: {
                  onboarding_completed: true,
                  privacy_mode: selections?.dataMode === "privacy",
                  selected_mic_id: selections?.selectedMicrophone,
                  context_awareness: true
                }
              });
            } catch (e) {
              console.error("Failed to sync onboarding state to Supabase:", e);
            }
          }}
          onBackToAuth={async () => {
            await supabase.auth.signOut();
          }}
        />
      </div>
    </>
  );
};

const ApprovalWindowController = ({ hasSession }: { hasSession: boolean }) => {
  React.useEffect(() => {
    if (!hasSession) {
      getCurrentWindow().hide().catch(console.error);
    }
  }, [hasSession]);

  return hasSession ? <ApprovalPanel /> : null;
};

const WindowRouter = ({ windowLabel }: { windowLabel: string }) => {
  const { session, isLoading } = useAuth();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState<boolean>(() => {
    return localStorage.getItem("sayikor_onboarding_completed") === "true";
  });

  const isOfflineBypass = !navigator.onLine && isOnboardingCompleted;
  const hasSession = !!session || isOfflineBypass;

  React.useEffect(() => {
    if (windowLabel !== "dashboard") return;

    if (session?.user) {
      const metadata = session.user.user_metadata || {};
      
      // 1. Sync onboarding completion state
      if (metadata.onboarding_completed === true) {
        localStorage.setItem("sayikor_onboarding_completed", "true");
        setIsOnboardingCompleted(true);
      } else {
        localStorage.removeItem("sayikor_onboarding_completed");
        setIsOnboardingCompleted(false);
      }
      
      // 2. Sync shortcuts
      if (metadata.shortcuts) {
        const shortcutsJson = JSON.stringify(metadata.shortcuts);
        if (localStorage.getItem("sayikor_shortcuts") !== shortcutsJson) {
          localStorage.setItem("sayikor_shortcuts", shortcutsJson);
        }
      }

      // 3. Sync settings
      if (metadata.privacy_mode !== undefined && !localStorage.getItem("sayikor_privacy_mode")) {
        localStorage.setItem("sayikor_privacy_mode", metadata.privacy_mode ? "true" : "false");
      }
      if (metadata.context_awareness !== undefined && !localStorage.getItem("sayikor_context_awareness")) {
        localStorage.setItem("sayikor_context_awareness", metadata.context_awareness ? "true" : "false");
      }
      if (metadata.selected_mic_id && !localStorage.getItem("sayikor_selected_mic_id")) {
        localStorage.setItem("sayikor_selected_mic_id", metadata.selected_mic_id);
      }
      if (metadata.hide_focused_app_icon !== undefined && !localStorage.getItem("sayikor_hide_focused_app_icon")) {
        localStorage.setItem("sayikor_hide_focused_app_icon", metadata.hide_focused_app_icon ? "true" : "false");
      }
      if (metadata.show_ikor_bar !== undefined && !localStorage.getItem("sayikor_show_ikor_bar")) {
        localStorage.setItem("sayikor_show_ikor_bar", metadata.show_ikor_bar ? "true" : "false");
      }

      // Sequential store writes to prevent file locking issues
      (async () => {
        try {
          const store = await load("store.json");
          let needsSave = false;

          // Sync shortcuts to store
          if (metadata.shortcuts) {
            const currentStoreShortcuts = await store.get("sayikor_shortcuts");
            const shortcutsJson = JSON.stringify(metadata.shortcuts);
            const currentJson = currentStoreShortcuts 
              ? (typeof currentStoreShortcuts === 'string' ? currentStoreShortcuts : JSON.stringify(currentStoreShortcuts))
              : null;
            
            if (currentJson !== shortcutsJson) {
              await store.set("sayikor_shortcuts", metadata.shortcuts);
              needsSave = true;
              await invoke("notify_shortcuts_changed", { shortcutsJson });
            }
          }

          // Sync settings to store
          if (metadata.context_awareness !== undefined && !localStorage.getItem("sayikor_context_awareness")) {
            await store.set("contextAwareness", metadata.context_awareness);
            needsSave = true;
            await emit("context-awareness-changed", metadata.context_awareness);
          }
          if (metadata.hide_focused_app_icon !== undefined && !localStorage.getItem("sayikor_hide_focused_app_icon")) {
            await store.set("hideFocusedAppIcon", metadata.hide_focused_app_icon);
            needsSave = true;
            await emit("hide-focused-app-icon-changed", metadata.hide_focused_app_icon);
          }
          if (metadata.show_ikor_bar !== undefined && !localStorage.getItem("sayikor_show_ikor_bar")) {
            await store.set("showIkorBar", metadata.show_ikor_bar);
            needsSave = true;
            await emit("show-ikor-bar-changed", metadata.show_ikor_bar);
          }

          // Sync dictionary
          if (metadata.sayikor_dictionary) {
            await store.set("sayikor_dictionary", metadata.sayikor_dictionary);
            needsSave = true;
          }

          // Sync text shortcuts
          if (metadata.sayikor_text_shortcuts) {
            await store.set("sayikor_text_shortcuts", metadata.sayikor_text_shortcuts);
            needsSave = true;
          }

          // Sync word consumption history
          if (metadata.word_consumption_history) {
            await store.set("wordConsumptionHistory", metadata.word_consumption_history);
            needsSave = true;
            await emit("word-consumption-history-updated", metadata.word_consumption_history);
          }

          if (needsSave) {
            await store.save();
          }
        } catch (e) {
          console.error("Failed to sync metadata to Tauri store:", e);
        }
      })();
    }
  }, [session, windowLabel]);

  React.useEffect(() => {
    if (!isLoading && windowLabel === "dashboard") {
      getCurrentWindow().show();
      getCurrentWindow().setFocus();
    }
  }, [isLoading, windowLabel]);

  if (isLoading) {
    return (
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-[#0b0a0a] overflow-hidden font-sans select-none">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />

        {/* Center Card */}
        <div className="flex flex-col items-center z-10 px-8 py-10 rounded-3xl bg-[#141414] border border-white/5 shadow-2xl min-w-[280px]">
          {/* Glowing Ring Loader */}
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            {/* Spinning Outer Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 border-r-amber-500/50 animate-spin" />
            
            {/* Inner Pulsing Dot */}
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" />
          </div>

          {/* Sayikor Logo Text */}
          <h1 className="text-white font-extrabold text-2xl tracking-[0.2em] mb-2 bg-gradient-to-r from-amber-400 via-amber-500 to-red-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
            SAYIKOR
          </h1>
          
          {/* Subtle loading subtitle */}
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-bold mb-4">
            Voice Assistant
          </p>

          {/* Status Message */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <p className="text-xs text-white/60 font-medium">
              Initializing Engine...
            </p>
          </div>
        </div>
        
        {/* Footer/Version */}
        <div className="absolute bottom-6 text-[10px] text-white/20 tracking-wider">
          SAYIKOR DESKTOP APP • VERSION 2.0
        </div>
      </div>
    );
  }

  // Bubble and Approval Panel
  if (windowLabel === "bubble") {
    return <App hasSession={hasSession} />;
  }
  
  if (windowLabel === "approval") {
    return <ApprovalWindowController hasSession={hasSession} />;
  }

  // Dashboard Window
  if (!hasSession) {
    return <Authentication onBack={() => {}} onSuccess={() => {}} />;
  }

  const userOnboardingCompleted = session?.user 
    ? session.user.user_metadata?.onboarding_completed === true 
    : isOnboardingCompleted;

  if (!userOnboardingCompleted) {
    const userProp = { 
      email: session?.user?.email || "", 
      firstName: session?.user?.user_metadata?.first_name || "", 
      lastName: session?.user?.user_metadata?.last_name || "" 
    };

    return (
      <OnboardingWrapper userProp={userProp} setIsOnboardingCompleted={setIsOnboardingCompleted} />
    );
  }

  const userProp = session ? {
    email: session.user.email || "",
    firstName: session.user.user_metadata?.first_name || "",
    lastName: session.user.user_metadata?.last_name || "",
    totalWords: typeof session.user.user_metadata?.total_words === 'number' ? session.user.user_metadata.total_words : 0,
    transcriptionDates: Array.isArray(session.user.user_metadata?.transcription_dates) ? session.user.user_metadata.transcription_dates : [],
    sayikor_dictionary: session.user.user_metadata?.sayikor_dictionary,
    sayikor_text_shortcuts: session.user.user_metadata?.sayikor_text_shortcuts,
    userWordsBalance: typeof session.user.user_metadata?.user_words_balance === 'number' ? session.user.user_metadata.user_words_balance : 900,
    trialStartDate: session.user.user_metadata?.trial_start_date || undefined,
    wordConsumptionHistory: Array.isArray(session.user.user_metadata?.word_consumption_history) ? session.user.user_metadata.word_consumption_history : []
  } : {
    email: "offline@sayikor.local",
    firstName: "Offline",
    lastName: "User",
    totalWords: 0,
    transcriptionDates: [],
    userWordsBalance: 900,
    trialStartDate: undefined,
    wordConsumptionHistory: []
  };

  return <Dashboard onBack={() => {}} initialUser={userProp} />;
};

const init = async () => {
  if (import.meta.env.PROD) {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  const win = getCurrentWindow();
  
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <AuthProvider>
        <WindowRouter windowLabel={win.label} />
      </AuthProvider>
    </React.StrictMode>
  );
};

init();
