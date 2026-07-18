import { motion, AnimatePresence } from "motion/react";
import { X, Search, Zap, Shield, CreditCard, User, Settings, HelpCircle, MessageSquare, Check, FileText, Megaphone, Pencil, Infinity, ChevronDown, ChevronUp, Download, Calendar, ArrowUpDown, Receipt, Wallet, Eye, EyeOff } from "lucide-react";
import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import DeleteModal from "./DeleteModal";
import ShortcutsModal from "./ShortcutsModal";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { supabase } from "../../lib/supabaseClient";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onOpenTopUp: (currency: 'NGN' | 'USD', isPro: boolean) => void;
  onOpenUpgrade?: (currency: 'NGN' | 'USD', plan: string) => void;
  firstName: string;
  lastName: string;
  setFirstName: (val: string) => void;
  setLastName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  isActualPro: boolean;
  onSignOut: () => void;
  currentPlanName?: string;
  billingTransactions?: any[];
  proPlanDaysLeft?: number | null;
  onDeleteAllTranscripts?: () => void;
}

const localStorageOptions = [
  { value: "store", label: "Store data locally" },
  { value: "delete", label: "Auto-delete local data every 24 hours" },
  { value: "never", label: "Never store data locally" }
];

export default function SettingsModal({ isOpen, onClose, initialTab = "General", onOpenUpgrade, firstName, lastName, setFirstName, setLastName, email, setEmail, onSignOut, currentPlanName = "Free Trial", billingTransactions = [], proPlanDaysLeft, onDeleteAllTranscripts }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState({
    launchAtLogin: false,
    privacyMode: localStorage.getItem("sayikor_privacy_mode") === "true",
    contextAwareness: localStorage.getItem("sayikor_context_awareness") !== "false",
    showIkorBar: localStorage.getItem("sayikor_show_ikor_bar") !== "false",
    commandMode: false,
    systemAudio: localStorage.getItem("sayikor_system_audio") === "true",
    interactionSounds: localStorage.getItem("sayikor_interaction_sounds") !== "false",
    hideFocusedAppIcon: localStorage.getItem("sayikor_hide_focused_app_icon") === "true",
    offlineMode: localStorage.getItem("sayikor_offline_mode") === "true"
  });
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [localStorageOption, setLocalStorageOption] = useState<"store" | "delete" | "never">("store");
  const [isMicrophoneModalOpen, setIsMicrophoneModalOpen] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState(localStorage.getItem("sayikor_selected_mic_id") || "system-default");
  const [microphoneDevices, setMicrophoneDevices] = useState<{ id: string, label: string }[]>([
    { id: "system-default", label: "System Default" }
  ]);

  const [monnifyApiKey, setMonnifyApiKey] = useState("");
  const [monnifySecretKey, setMonnifySecretKey] = useState("");
  const [monnifyContractCode, setMonnifyContractCode] = useState("");
  const [monnifyIsSandbox, setMonnifyIsSandbox] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleSaveMonnifySettings = async () => {
    try {
      const store = await load("store.json");
      await store.set("monnify_api_key", monnifyApiKey);
      await store.set("monnify_secret_key", monnifySecretKey);
      await store.set("monnify_contract_code", monnifyContractCode);
      await store.set("monnify_mode_sandbox", monnifyIsSandbox);
      await store.save();

      await invoke("start_mcp_server", {
        apiKey: monnifyApiKey,
        secretKey: monnifySecretKey,
        contractCode: monnifyContractCode,
        isSandbox: monnifyIsSandbox
      });

      alert("Monnify credentials saved and MCP server restarted successfully!");
    } catch (e) {
      console.error("Failed to save Monnify settings or restart MCP server:", e);
      alert("Failed to save credentials: " + String(e));
    }
  };

  useEffect(() => {
    const getMics = async () => {
      try {
        const response: { default_id: string | null, devices: { id: string, label: string }[] } = await invoke("get_audio_devices");

        // Ensure unique IDs
        const uniqueMics = Array.from(new Map(response.devices.map(m => [m.id, m])).values());

        setMicrophoneDevices(uniqueMics.length > 0 ? uniqueMics : [{ id: "system-default", label: "System Default" }]);
      } catch (err) {
        console.warn("Failed to get mics natively:", err);
      }
    };
    if (isOpen && activeTab === "General") {
      getMics();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    localStorage.setItem("sayikor_privacy_mode", settings.privacyMode ? "true" : "false");

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            privacy_mode: settings.privacyMode
          }
        });
      } catch (e) {
        console.error("Failed to sync privacy mode to Supabase:", e);
      }
    })();
  }, [settings.privacyMode]);

  useEffect(() => {
    localStorage.setItem("sayikor_selected_mic_id", selectedMicrophone);

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            selected_mic_id: selectedMicrophone
          }
        });
      } catch (e) {
        console.error("Failed to sync selected microphone to Supabase:", e);
      }
    })();
  }, [selectedMicrophone]);

  useEffect(() => {
    localStorage.setItem("sayikor_context_awareness", settings.contextAwareness ? "true" : "false");

    // Sync to Tauri store
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("contextAwareness", settings.contextAwareness);
        await store.save();
        await emit("context-awareness-changed", settings.contextAwareness);
      } catch (err) {
        console.warn("Failed to save contextAwareness to store:", err);
      }
    })();

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            context_awareness: settings.contextAwareness
          }
        });
      } catch (e) {
        console.error("Failed to sync context awareness to Supabase:", e);
      }
    })();
  }, [settings.contextAwareness]);

  useEffect(() => {
    localStorage.setItem("sayikor_system_audio", settings.systemAudio ? "true" : "false");

    // Sync to Tauri store
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("systemAudio", settings.systemAudio);
        await store.save();
        await emit("system-audio-changed", settings.systemAudio);
      } catch (err) {
        console.warn("Failed to save systemAudio to store:", err);
      }
    })();

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            system_audio: settings.systemAudio
          }
        });
      } catch (e) {
        console.error("Failed to sync system audio to Supabase:", e);
      }
    })();
  }, [settings.systemAudio]);

  useEffect(() => {
    localStorage.setItem("sayikor_interaction_sounds", settings.interactionSounds ? "true" : "false");

    // Sync to Tauri store
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("interactionSounds", settings.interactionSounds);
        await store.save();
        await emit("interaction-sounds-changed", settings.interactionSounds);
      } catch (err) {
        console.warn("Failed to save interactionSounds to store:", err);
      }
    })();

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            interaction_sounds: settings.interactionSounds
          }
        });
      } catch (e) {
        console.error("Failed to sync interaction sounds to Supabase:", e);
      }
    })();
  }, [settings.interactionSounds]);

  useEffect(() => {
    localStorage.setItem("sayikor_show_ikor_bar", settings.showIkorBar ? "true" : "false");

    // Sync to Tauri store
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("showIkorBar", settings.showIkorBar);
        await store.save();
        await emit("show-ikor-bar-changed", settings.showIkorBar);
      } catch (err) {
        console.warn("Failed to save showIkorBar to store:", err);
      }
    })();

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            show_ikor_bar: settings.showIkorBar
          }
        });
      } catch (e) {
        console.error("Failed to sync showIkorBar to Supabase:", e);
      }
    })();
  }, [settings.showIkorBar]);

  useEffect(() => {
    localStorage.setItem("sayikor_offline_mode", settings.offlineMode ? "true" : "false");

    // Sync to Tauri store
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("offlineMode", settings.offlineMode);
        await store.save();
        await emit("offline-mode-changed", settings.offlineMode);
      } catch (err) {
        console.warn("Failed to save offlineMode to store:", err);
      }
    })();

    // Sync to Supabase user metadata
    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            offline_mode: settings.offlineMode
          }
        });
      } catch (e) {
        console.error("Failed to sync offlineMode to Supabase:", e);
      }
    })();
  }, [settings.offlineMode]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsPlansExpanded(false);
  };
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleCheckUpdates = () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    setUpdateStatus(null);
    setTimeout(() => {
      setIsCheckingUpdates(false);
      setUpdateStatus("Latest version");
      setTimeout(() => setUpdateStatus(null), 3000);
    }, 1200);
  };

  const handleHideFocusedAppIconChange = async (c: boolean) => {
    setSettings(prev => ({ ...prev, hideFocusedAppIcon: c }));
    localStorage.setItem("sayikor_hide_focused_app_icon", c ? "true" : "false");
    try {
      const store = await load("store.json");
      await store.set("hideFocusedAppIcon", c);
      await store.save();
    } catch (err) {
      console.warn("Failed to save hideFocusedAppIcon to store:", err);
    }
    emit("hide-focused-app-icon-changed", c).catch(console.error);

    // Sync to Supabase user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          hide_focused_app_icon: c
        }
      });
    } catch (e) {
      console.error("Failed to sync hideFocusedAppIcon to Supabase:", e);
    }
  };

  const handleLaunchAtLoginChange = async (c: boolean) => {
    setSettings(prev => ({ ...prev, launchAtLogin: c }));
    try {
      if (c) {
        await enable();
      } else {
        await disable();
      }
    } catch (err) {
      console.warn("Failed to update autostart setting:", err);
    }
  };

  // Billing History filters & search states
  const [isPlansExpanded, setIsPlansExpanded] = useState(false);
  const [presetFilter, setPresetFilter] = useState<"All" | "Month" | "30days" | "90days" | "Custom">("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  useEffect(() => {
    if (isOpen) {
      // Refresh persistent settings values from localStorage when modal is opened to avoid race conditions
      setSettings(prev => ({
        ...prev,
        privacyMode: localStorage.getItem("sayikor_privacy_mode") === "true",
        hideFocusedAppIcon: localStorage.getItem("sayikor_hide_focused_app_icon") === "true",
        contextAwareness: localStorage.getItem("sayikor_context_awareness") !== "false",
        systemAudio: localStorage.getItem("sayikor_system_audio") === "true",
        interactionSounds: localStorage.getItem("sayikor_interaction_sounds") !== "false",
        showIkorBar: localStorage.getItem("sayikor_show_ikor_bar") !== "false",
        offlineMode: localStorage.getItem("sayikor_offline_mode") === "true",
      }));
      (async () => {
        try {
          const active = await isEnabled();
          setSettings(prev => ({ ...prev, launchAtLogin: active }));
        } catch (e) {
          console.warn("Failed to check if autostart is enabled:", e);
        }

        try {
          const store = await load("store.json");
          const mApiKey = await store.get<string>("monnify_api_key") || "";
          const mSecretKey = await store.get<string>("monnify_secret_key") || "";
          const mContractCode = await store.get<string>("monnify_contract_code") || "";
          const mIsSandbox = await store.get<boolean>("monnify_mode_sandbox") ?? true;

          setMonnifyApiKey(mApiKey);
          setMonnifySecretKey(mSecretKey);
          setMonnifyContractCode(mContractCode);
          setMonnifyIsSandbox(mIsSandbox);
        } catch (err) {
          console.warn("Failed to load Monnify settings:", err);
        }
      })();
      setSelectedMicrophone(localStorage.getItem("sayikor_selected_mic_id") || "system-default");

      if (initialTab === "Plans and Billing") {
        setActiveTab("Plans (pay-as-you-go)");
        setIsPlansExpanded(false);
      } else {
        setActiveTab(initialTab);
        if (initialTab === "Plans (pay-as-you-go)" || initialTab === "Billing History") {
          setIsPlansExpanded(false);
        } else {
          setIsPlansExpanded(false);
        }
      }
    }
  }, [isOpen, initialTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return (
          <>
            <SettingAction
              label="Shortcuts"
              description={
                <div className="flex flex-col gap-1">
                  <span>
                    Customize your hotkeys.</span>
                  <span>
                    You may use a combination of multiple keys like <strong className="font-bold text-gray-800">"Ctrl + Alt + Space"</strong> for hands-free dictation.
                  </span>
                </div>
              }
              buttonText="Change"
              onAction={() => setIsShortcutsModalOpen(true)}
            />
            <SettingAction label="Language" description="Default transcription language." buttonText="English" />

            <SettingToggle label="Context Awareness" description="Allow Ikor to use relevant text content from the app you're dictating into to provide better transcription results." checked={settings.contextAwareness} onChange={(c) => setSettings({ ...settings, contextAwareness: c })} />

            <SettingToggle label="Launch at Login" description="Open automatically on startup." checked={settings.launchAtLogin} onChange={handleLaunchAtLoginChange} />
            <SettingAction
              label="Microphone"
              description={`Current: ${microphoneDevices.find(d => d.id === selectedMicrophone)?.label || "System Default"} • Use your default system microphone for the best quality.`}
              buttonText="Change"
              onAction={() => setIsMicrophoneModalOpen(true)}
            />
            <SettingToggle label="System audio" description="Mute system audio when you start dictating." checked={settings.systemAudio} onChange={(c) => setSettings({ ...settings, systemAudio: c })} />
            <SettingToggle label="Interaction Sounds" description="Play interaction sounds whenever Ikor starts and stops recording." checked={settings.interactionSounds} onChange={(c) => setSettings({ ...settings, interactionSounds: c })} />
            <SettingToggle label="Show Ikor bar" description="Always show the Ikor dictation bar below your screen." checked={settings.showIkorBar} onChange={(c) => setSettings({ ...settings, showIkorBar: c })} />
            <SettingToggle label="Hide Focused App Icon" description="Only show the audio waveform visualizer in the recording overlay." checked={settings.hideFocusedAppIcon} onChange={handleHideFocusedAppIconChange} />
            <SettingToggle label="Ikor Offline Mode"
              description={
                <div className="flex flex-col gap-1">
                  <span>
                    Dictate using Ikor without an internet connection.</span>
                  <span>
                    <strong className="font-bold text-gray-800">Note:</strong> Offline mode has lower performance in accuracy, speed, and formatting.
                  </span>
                </div>
              }
              checked={settings.offlineMode} onChange={(c) => setSettings({ ...settings, offlineMode: c })} />
            <SettingAction
              label="Check for Updates"
              description={updateStatus ? `Version 2.0.16 • ${updateStatus}` : "Version 2.0.16"}
              buttonText={isCheckingUpdates ? "Checking..." : updateStatus ? "✓ Up to date" : "Check for Updates"}
              onAction={handleCheckUpdates}
              childrenUnderButton={
                <button
                  type="button"
                  onClick={() => setIsReleaseNotesOpen(true)}
                  className="text-xs font-bold text-[#dc3545] hover:text-[#b02a37] hover:underline cursor-pointer select-none mt-1.5 transition-all text-center"
                >
                  View release notes
                </button>
              }
            />
          </>
        );
      case "Data and Privacy":
        return (
          <>
            <SettingToggle label="Privacy Mode" description="Do not share transcription data to automatically improve Ikor's performance." checked={settings.privacyMode} onChange={(c) => setSettings({ ...settings, privacyMode: c })} />
            <SettingDropdown
              label="Local data storage"
              description="Control how your transcripts are stored."
              options={localStorageOptions}
              selectedValue={localStorageOption}
              onChangeValue={(val) => setLocalStorageOption(val as "store" | "delete" | "never")}
            />
            <SettingAction isDestructive label="Delete All Transcripts" description="Permanently delete all local transcripts." buttonText="Delete All" onAction={onDeleteAllTranscripts} />
            <SettingAction label="Enable HIPAA" description="Access information on how to get the HIPAA BAA for yourself." buttonText="Learn More" />
            <SettingAction label="Data Controls" description="Access information on how your transcription data is processed." buttonText="Read about our Data Controls" />
          </>
        );
      case "Plans (pay-as-you-go)":
        const plans = [
          {
            name: "Free",
            category: "Trial",
            price: currency === 'NGN' ? '₦0' : '$0',
            cta: "Current plan",
            note: "No credit card required",
            highlight: false,
            features: [
              { text: "900 free words total", icon: FileText },
              { text: "Reloads after 30 days", icon: Calendar },
              { text: "Standard speed modes", icon: Zap },
              { text: `${currency === 'NGN' ? '₦100' : '$0.1'} per 1,000 words top-up`, icon: CreditCard },
              { text: "Community support", icon: MessageSquare }
            ]
          },
          {
            name: "Ikor Plus",
            category: "For individuals",
            price: currency === 'NGN' ? '₦3,000' : '$3',
            cta: "Upgrade",
            note: "Billed monthly",
            highlight: false,
            features: [
              { text: "40,000 words / month", icon: FileText },
              { text: "No daily limits", icon: Infinity },
              { text: "Standard speed modes", icon: Zap },
              { text: `${currency === 'NGN' ? '₦50' : '$0.05'} per 1,000 words top-up`, icon: CreditCard },
              { text: "Standard support + Early access", icon: MessageSquare }
            ]
          },
          {
            name: "Ikor Pro",
            category: "For individuals",
            price: currency === 'NGN' ? '₦9,000' : '$9',
            cta: "Go Pro",
            note: "Billed monthly",
            highlight: true,
            features: [
              { text: "120,000 words / month", icon: FileText },
              { text: "No daily limits", icon: Infinity },
              { text: "Unlocks Ultrafast speed", icon: Zap },
              { text: `${currency === 'NGN' ? '₦25' : '$0.025'} per 1,000 words top-up`, icon: CreditCard },
              { text: "Priority support + Early access", icon: MessageSquare }
            ]
          }
        ];

        const daysLeft = proPlanDaysLeft !== null && proPlanDaysLeft !== undefined ? proPlanDaysLeft : 30;
        const daysLeftStr = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
        const progressBarPercentage = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
                <button onClick={() => setCurrency('NGN')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${currency === 'NGN' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>NGN</button>
                <button onClick={() => setCurrency('USD')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${currency === 'USD' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>USD</button>
              </div>

              {/* First-time User Benefit Banner (matching sample image style but in green) */}
              {(currentPlanName === "Free Trial" || currentPlanName === "Free") && daysLeft > 0 && (
                <div className="flex-1 max-w-lg bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl px-4 py-2 space-y-1.5 text-left font-sans shadow-sm">
                  <div className="text-[11px] font-black text-[#166534] tracking-tight leading-tight">
                    {currency === 'NGN'
                      ? `${daysLeftStr} left to top-up words at N50 per 1,000 words`
                      : `${daysLeftStr} left to top-up words at $0.05 per 1,000 words`
                    }
                  </div>

                  {/* Horizontal progress bar matching sample image */}
                  <div className="w-full bg-[#DCFCE7] rounded-full h-1 overflow-hidden">
                    <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${progressBarPercentage}%` }} />
                  </div>

                  <div className="text-[9px] text-emerald-700/80 font-bold flex items-center justify-between select-none leading-none">
                    <span>Auto-applies at checkout</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan.name} className={`border ${plan.highlight ? "border-red-500 bg-red-50/50" : "border-black/5"} rounded-3xl p-6 flex flex-col`}>
                  <div className="text-sm text-gray-500 mb-1">{plan.category}</div>
                  <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                    {plan.name}
                    {plan.highlight && (
                      <div className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Best value</div>
                    )}
                  </div>
                  <div className="text-3xl font-bold font-mono mb-2">{plan.price}/month</div>
                  <div className="text-gray-500 text-sm mb-8">{plan.note}</div>

                  <div className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <div key={f.text} className="flex gap-2 text-sm text-gray-700">
                        <div className="mt-0.5">
                          <f.icon size={14} className="text-red-500" />
                        </div>
                        {f.text}
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const isFreeCard = plan.name === "Free";
                    const isPlusCard = plan.name === "Ikor Plus";
                    const isProCard = plan.name === "Ikor Pro";

                    let showButton = true;
                    let buttonText = "";
                    let isCurrent = false;

                    if (currentPlanName === "Ikor Pro" || currentPlanName === "Pro plan") {
                      if (isFreeCard || isPlusCard) {
                        showButton = false;
                      } else if (isProCard) {
                        buttonText = "Current plan";
                        isCurrent = true;
                      }
                    } else if (currentPlanName === "Ikor Plus") {
                      if (isFreeCard) {
                        showButton = false;
                      } else if (isPlusCard) {
                        buttonText = "Current plan";
                        isCurrent = true;
                      } else if (isProCard) {
                        buttonText = "Go Pro";
                      }
                    } else {
                      // Free Trial
                      if (isFreeCard) {
                        buttonText = "Current plan";
                        isCurrent = true;
                      } else if (isPlusCard) {
                        buttonText = "Upgrade";
                      } else if (isProCard) {
                        buttonText = "Go Pro";
                      }
                    }

                    if (!showButton) return <div className="h-11" />; // Retain uniform spacing/height

                    return (
                      <button
                        onClick={() => {
                          if (!isCurrent && onOpenUpgrade) onOpenUpgrade(currency, plan.name);
                        }}
                        disabled={isCurrent}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${isCurrent
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-black/5"
                          : plan.highlight
                            ? "bg-red-700 hover:bg-red-800 text-white shadow-sm"
                            : "bg-red-100 hover:bg-red-200 text-red-700 font-bold"
                          }`}
                      >
                        {buttonText}
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>

            <div className="border border-black/5 rounded-2xl p-4 text-sm text-gray-500">
              ✨ Included in all Ikor plans: No-edit context-aware dictation • ScribePro smart formatting • System-wide integrations (Slack, Gmail, ChatGPT, WhatsApp, Notion, etc.) • Custom terms and shortcuts • Privacy mode
            </div>

            <div className="border border-black/5 rounded-2xl p-6">
              <div className="font-bold mb-2">Enterprise</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-600 text-sm">For teams that need SOC 2 & HIPAA compliance, enforced zero data retention,<br /> advanced privacy and data controls, SSO/SAML, and bulk pricing rate reduction.</div>
                <button className="bg-white border border-gray-200 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">Learn More</button>
              </div>
            </div>
          </div>
        );
      case "Billing History":
        // Filter and sort transactions
        const filteredTransactions = billingTransactions.filter(txn => {
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const matchDesc = txn.description.toLowerCase().includes(q);
            const matchId = txn.id.toLowerCase().includes(q);
            const matchMethod = txn.method.toLowerCase().includes(q);
            if (!matchDesc && !matchId && !matchMethod) return false;
          }

          const txnDateObj = new Date(txn.date);
          const now = new Date();

          if (presetFilter === "Month") {
            const isThisMonth = txnDateObj.getMonth() === now.getMonth() && txnDateObj.getFullYear() === now.getFullYear();
            if (!isThisMonth) return false;
          } else if (presetFilter === "30days") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (txnDateObj < thirtyDaysAgo) return false;
          } else if (presetFilter === "90days") {
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (txnDateObj < ninetyDaysAgo) return false;
          } else if (presetFilter === "Custom") {
            if (customStartDate) {
              const start = new Date(customStartDate + "T00:00:00");
              if (txnDateObj < start) return false;
            }
            if (customEndDate) {
              const end = new Date(customEndDate + "T23:59:59");
              if (txnDateObj > end) return false;
            }
          }
          return true;
        }).sort((a, b) => {
          if (sortBy === "date-desc") {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          } else if (sortBy === "date-asc") {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          } else if (sortBy === "amount-desc") {
            const priceA = parseFloat(a.amount.replace(/[^0-9.]/g, '')) || 0;
            const priceB = parseFloat(b.amount.replace(/[^0-9.]/g, '')) || 0;
            return priceB - priceA;
          } else if (sortBy === "amount-asc") {
            const priceA = parseFloat(a.amount.replace(/[^0-9.]/g, '')) || 0;
            const priceB = parseFloat(b.amount.replace(/[^0-9.]/g, '')) || 0;
            return priceA - priceB;
          }
          return 0;
        });

        const handleExportCSV = () => {
          if (filteredTransactions.length === 0) return;
          const headers = ["Transaction ID", "Date", "Description", "Amount", "Words Added", "Status", "Payment Method"];
          const rows = filteredTransactions.map(txn => [
            txn.id,
            txn.date,
            txn.description,
            txn.amount.replace(/,/g, ''),
            txn.words.replace(/,/g, ''),
            txn.status,
            txn.method
          ]);
          const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `ikor_billing_export_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const handleDownloadInvoice = (txn: any) => {
          const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
          });

          // Headings / Header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(17, 24, 39); // Gray 900
          doc.text("IKOR TRANSCRIPTION", 20, 30);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128); // Gray 500
          doc.text("Official Payment Receipt", 20, 36);

          // Details Block
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 81); // Gray 700
          doc.text("Receipt ID:", 20, 52);
          doc.setFont("helvetica", "normal");
          doc.text(txn.id, 50, 52);

          doc.setFont("helvetica", "bold");
          doc.text("Date:", 20, 58);
          doc.setFont("helvetica", "normal");
          doc.text(txn.date, 50, 58);

          doc.setFont("helvetica", "bold");
          doc.text("Status:", 20, 64);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(16, 185, 129); // Green 500
          doc.text(txn.status.toUpperCase(), 50, 64);

          // Grid Line
          doc.setLineWidth(0.2);
          doc.setDrawColor(229, 231, 235); // Gray 200
          doc.line(20, 72, 190, 72);

          // Table Headers
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128); // Gray 500
          doc.text("Billing Item Description", 20, 78);
          doc.text("Words", 120, 78);
          doc.text("Amount", 160, 78);

          doc.line(20, 82, 190, 82);

          // Item Details Row
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(31, 41, 55); // Gray 800
          doc.text(txn.description, 20, 90);
          doc.text(txn.words, 120, 90);

          const cleanAmount = txn.amount.replace("₦", "NGN ");
          doc.text(cleanAmount, 160, 90);

          doc.line(20, 96, 190, 96);

          // Total section
          doc.setFont("helvetica", "bold");
          doc.setTextColor(17, 24, 39); // Gray 900
          doc.text("TOTAL CHARGED:", 120, 106);
          doc.text(cleanAmount, 160, 106);

          // Footer
          doc.line(20, 120, 190, 120);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128); // Gray 500
          doc.text("Thank you for choosing Ikor!", 20, 130);
          doc.text("If you have any billing inquiries, please contact contact@sayikor.ai.", 20, 136);

          doc.save(`receipt_${txn.id}.pdf`);
        };

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Billing & Invoices</h3>
                <p className="text-xs text-gray-500 mt-1">Manage and track your transactions for all subscription plans and word balance top-ups.</p>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className={`flex items-center gap-2 px-4 py-2 border border-black/10 hover:bg-gray-50 hover:border-black rounded-xl text-xs font-semibold cursor-pointer select-none transition-all active:scale-95 ${filteredTransactions.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Download size={14} />
                Export Statements (.CSV)
              </button>
            </div>

            {/* Filters dashboard bar */}
            <div className="bg-gray-50/70 border border-black/5 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ID, plan, or card..."
                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-gray-400"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-black">Clear</button>
                  )}
                </div>

                {/* Preset Date Range Buttons */}
                <div className="flex items-center bg-gray-200/60 p-1 rounded-xl w-fit flex-wrap gap-0.5">
                  {(["All", "Month", "30days", "90days", "Custom"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPresetFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${presetFilter === p
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                      {p === "All" ? "All Time" : p === "Month" ? "This Month" : p === "30days" ? "Last 30d" : p === "90days" ? "Last 90d" : "Custom Range"}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown builder */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
                    <ArrowUpDown size={10} /> Sort
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer text-gray-800"
                  >
                    <option value="date-desc">Newest Date</option>
                    <option value="date-asc">Oldest Date</option>
                    <option value="amount-desc">Amount: High to Low</option>
                    <option value="amount-asc">Amount: Low to High</option>
                  </select>
                </div>

              </div>

              {/* Collapsible custom calendar container */}
              {presetFilter === "Custom" && (
                <div className="flex flex-wrap items-center gap-4 bg-white border border-black/5 p-3.5 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                      <Calendar size={12} className="text-red-500" /> Start:
                    </span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomStartDate(val);
                        if (customEndDate && val && val > customEndDate) {
                          setCustomEndDate(val);
                        }
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-red-500 bg-gray-50 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500">End:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      min={customStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (customStartDate && val && val < customStartDate) {
                          setCustomEndDate(customStartDate);
                        } else {
                          setCustomEndDate(val);
                        }
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-red-500 bg-gray-50 cursor-pointer"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
                      className="text-[10px] font-black text-red-500 hover:underline pl-2 ml-auto"
                    >
                      Clear Calendar Dates
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List Table or Alert Block */}
            <div className="border border-black/5 rounded-2xl overflow-hidden bg-white">
              {filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-black/5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Date & method</th>
                        <th className="py-3 px-4">Billing item description</th>
                        <th className="py-3 px-4">Words added</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 text-xs text-gray-700">
                      {filteredTransactions.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-450 text-[11px]">
                            {row.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800">{row.date}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{row.method}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{row.description}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {row.description.includes("Words") || row.description.includes("Top Up") ? "Pay-As-You-Go Credit Purchase" : "ScribePro Subscription plan pack"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-bold text-[10px] border border-green-200/50">
                              {row.words}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700">
                              <span className="w-1 h-1 rounded-full bg-green-500" />
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-950 font-mono text-right text-sm">
                            {row.amount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDownloadInvoice(row)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 hover:underline transition-all cursor-pointer"
                              title="Download official receipt"
                            >
                              <Receipt size={12} className="inline-block text-red-500" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 text-sm font-medium">
                  No billing transactions found matching those filters.
                </div>
              )}
            </div>
          </div>
        );
      case "Account":
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-200" />
                <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                  <Pencil size={14} className="text-gray-600" />
                </div>
              </div>
              <div className="font-bold text-lg">{firstName} {lastName}</div>
              <div className="text-gray-500 text-sm">{email}</div>
            </div>

            <SettingInput label="First name" description="Your first name" value={firstName} onSave={setFirstName} />
            <SettingInput label="Last name" description="Your last name" value={lastName} onSave={setLastName} />
            <SettingInput label="Email" description="Your account email address" value={email} onSave={setEmail} disabled widthClass="w-full max-w-[500px]" />
            <SettingAction label="Sign out" description="Sign out of your Ikor account" buttonText="Sign out" onAction={onSignOut} />
            <SettingAction isDestructive label="Delete Account" description="Permanently delete your account" buttonText="Delete" onAction={() => setIsDeleteAccountModalOpen(true)} />
          </div>
        );
      case "MCP Server":
        return (
          <div className="space-y-4">
            <div className="border-b border-black/5 pb-4">
              <p className="text-xs text-gray-500 mt-1">
                Configure your personal merchant Monnify keys here. These credentials are saved securely in your local configuration and are used when triggering agentic payment tools via voice command.
              </p>
            </div>

            <SettingToggle
              label="Sandbox Mode"
              description="Toggle between Monnify Sandbox (Test) and Production (Live) environments."
              checked={monnifyIsSandbox}
              onChange={(val) => setMonnifyIsSandbox(val)}
            />

            {/* API Key input with visibility toggle */}
            <div className="flex items-center justify-between py-4 border-b border-black/5">
              <div className="flex-1 mr-4">
                <div className="font-medium">API Key</div>
                <div className="text-sm text-gray-500">Your Monnify merchant API key (Test or Live).</div>
              </div>
              <div className="relative w-1/2 max-w-[320px]">
                <input
                  type={showApiKey ? "text" : "password"}
                  className="w-full rounded-xl pl-4 pr-10 py-2 text-sm border border-black/10 bg-gray-50 text-gray-800 focus:bg-white focus:border-black/15 focus:outline-none transition-all"
                  value={monnifyApiKey}
                  onChange={(e) => setMonnifyApiKey(e.target.value)}
                  placeholder="Enter API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Secret Key input with visibility toggle */}
            <div className="flex items-center justify-between py-4 border-b border-black/5">
              <div className="flex-1 mr-4">
                <div className="font-medium">Secret Key</div>
                <div className="text-sm text-gray-500">Your Monnify merchant Secret key.</div>
              </div>
              <div className="relative w-1/2 max-w-[320px]">
                <input
                  type={showSecretKey ? "text" : "password"}
                  className="w-full rounded-xl pl-4 pr-10 py-2 text-sm border border-black/10 bg-gray-50 text-gray-800 focus:bg-white focus:border-black/15 focus:outline-none transition-all"
                  value={monnifySecretKey}
                  onChange={(e) => setMonnifySecretKey(e.target.value)}
                  placeholder="Enter Secret Key"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Contract Code input */}
            <div className="flex items-center justify-between py-4 border-b border-black/5">
              <div className="flex-1 mr-4">
                <div className="font-medium">Contract Code</div>
                <div className="text-sm text-gray-500">Your Monnify merchant Contract Code.</div>
              </div>
              <input
                type="text"
                className="w-1/2 max-w-[320px] rounded-xl px-4 py-2 text-sm border border-black/10 bg-gray-50 text-gray-800 focus:bg-white focus:border-black/15 focus:outline-none transition-all"
                value={monnifyContractCode}
                onChange={(e) => setMonnifyContractCode(e.target.value)}
                placeholder="Enter Contract Code"
              />
            </div>

            {/* Stripe Section Placeholder */}
            <div className="mt-8 pt-6 border-t border-black/5">
              <h4 className="font-bold text-sm text-gray-900 mb-2">Stripe Integration (Coming Soon)</h4>
              <p className="text-xs text-gray-500 mb-4">
                Configure your Stripe gateway settings for USD and international voice payment agent transactions.
              </p>
              <div className="bg-gray-50 border border-dashed border-black/10 rounded-2xl p-6 text-center text-gray-400 text-xs font-semibold">
                Stripe payment configuration options will be available here.
              </div>
            </div>

            {/* Save & Restart button */}
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={handleSaveMonnifySettings}
                className="px-5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                Save & Restart Server
              </button>
            </div>
          </div>
        );
      default:
        return <div className="text-gray-500 italic">Content for {activeTab} is coming soon.</div>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClose}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-[74.7rem] h-[600px] rounded-[32px] shadow-2xl flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-black/5 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                  <span className="font-bold text-lg">Settings</span>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search" className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm" />
                </div>

                <nav className="space-y-1.5 flex-1 select-none">
                  <button
                    onClick={() => handleTabClick("General")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "General"
                      ? "bg-red-500/15 text-red-500 font-bold"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                  >
                    <Settings size={18} />
                    General
                  </button>

                  <button
                    onClick={() => handleTabClick("Data and Privacy")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "Data and Privacy"
                      ? "bg-red-500/15 text-red-500 font-bold"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                  >
                    <Shield size={18} />
                    Data and Privacy
                  </button>

                  <div className="space-y-1">
                    <button
                      onClick={() => setIsPlansExpanded(!isPlansExpanded)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "Plans (pay-as-you-go)" || activeTab === "Billing History"
                        ? "bg-red-500/5 text-gray-900 font-medium"
                        : "text-gray-500 hover:bg-black/5 hover:text-black"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard size={18} className={activeTab === "Plans (pay-as-you-go)" || activeTab === "Billing History" ? "text-red-500" : ""} />
                        <span>Plans and Billing</span>
                      </div>
                      {isPlansExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {isPlansExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="pl-6 border-l border-black/5 ml-5 space-y-1 my-1 overflow-hidden"
                        >
                          <button
                            onClick={() => setActiveTab("Plans (pay-as-you-go)")}
                            className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${activeTab === "Plans (pay-as-you-go)"
                              ? "text-red-500 bg-red-50/50"
                              : "text-gray-500 hover:text-black"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "Plans (pay-as-you-go)" ? "bg-red-500" : "bg-transparent"}`} />
                            Plans
                          </button>
                          <button
                            onClick={() => setActiveTab("Billing History")}
                            className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${activeTab === "Billing History"
                              ? "text-red-500 bg-red-50/50"
                              : "text-gray-500 hover:text-black"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "Billing History" ? "bg-red-500" : "bg-transparent"}`} />
                            Billing History
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => handleTabClick("Account")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "Account"
                      ? "bg-red-500/15 text-red-500 font-bold"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                  >
                    <User size={18} />
                    Account
                  </button>

                  <button
                    onClick={() => handleTabClick("MCP Server")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "MCP Server"
                      ? "bg-red-500/15 text-red-500 font-bold"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                  >
                    <Wallet size={18} />
                    MCP Server
                  </button>
                </nav>

                <div className="space-y-1 pt-6 border-t border-black/5">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-black">
                    <Megaphone size={18} /> Get Support
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-black">
                    <HelpCircle size={18} /> Help Center
                  </button>
                </div>
              </div>

              {/* Main Area */}
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {activeTab === "Plans (pay-as-you-go)"
                      ? "Plans (pay-as-you-go)"
                      : activeTab === "Billing History"
                        ? "Billing & Invoices"
                        : activeTab}
                  </h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {renderTabContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          <DeleteModal
            isOpen={isDeleteAccountModalOpen}
            onClose={() => setIsDeleteAccountModalOpen(false)}
            onConfirm={() => {
              console.log("Account deleted");
              setIsDeleteAccountModalOpen(false);
            }}
            title="Delete your account?"
            description="Permanently delete your account and all associated data. This action cannot be undone."
            confirmText="Delete Account"
          />
          <ShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />

          {/* Select Microphone Modal */}
          <AnimatePresence>
            {isMicrophoneModalOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMicrophoneModalOpen(false)}
                  className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-xs"
                />
                <div
                  onClick={() => setIsMicrophoneModalOpen(false)}
                  className="fixed inset-0 z-[251] flex items-center justify-center p-4 cursor-pointer"
                >
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: "spring", duration: 0.35 }}
                    className="bg-white w-full max-w-[550px] rounded-[32px] shadow-2xl p-8 relative flex flex-col font-sans text-left"
                  >
                    {/* Close Button */}
                    <button
                      onClick={() => setIsMicrophoneModalOpen(false)}
                      className="absolute top-6 right-6 w-8 h-8 hover:bg-black/5 rounded-full flex items-center justify-center transition-all z-20 cursor-pointer"
                    >
                      <X size={18} className="text-gray-500" />
                    </button>

                    {/* Header */}
                    <div className="space-y-1 mb-6">
                      <h3 className="text-xl font-bold text-gray-800 tracking-tight">Select Microphone</h3>
                    </div>

                    {/* Microphone list container card */}
                    <div className="border border-gray-100/50 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col">
                      {microphoneDevices.map((dev) => {
                        const isSelected = selectedMicrophone === dev.id;
                        return (
                          <button
                            key={dev.id}
                            onClick={() => setSelectedMicrophone(dev.id)}
                            className={`flex items-center justify-between py-6 px-8 text-left transition-all border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50/50 ${isSelected ? "bg-gray-50/30" : ""
                              }`}
                          >
                            {/* Checkmark indicator */}
                            <div className="w-6 shrink-0 flex items-center">
                              {isSelected && (
                                <Check className="text-indigo-600 font-bold shrink-0" size={18} />
                              )}
                            </div>

                            {/* Center Device Label */}
                            <div className={`flex-1 text-center text-sm ${isSelected ? "font-semibold text-gray-800" : "text-gray-500 font-medium"}`}>
                              {dev.label}
                            </div>

                            {/* Visualizer column */}
                            <div className="w-24 shrink-0 flex items-center justify-end">
                              {isSelected ? (
                                <MicVisualizer />
                              ) : (
                                <div className="flex items-end gap-0.5 h-8 opacity-20 select-none">
                                  {Array.from({ length: 12 }).map((_, idx) => {
                                    const maxHeight = 8 + idx * 1.5;
                                    return (
                                      <div key={idx} className="w-1 bg-gray-400 rounded-full" style={{ height: `${maxHeight * 0.2}px` }} />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Release Notes Modal */}
          <AnimatePresence>
            {isReleaseNotesOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsReleaseNotesOpen(false)}
                  className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-xs"
                />
                <div
                  onClick={() => setIsReleaseNotesOpen(false)}
                  className="fixed inset-0 z-[251] flex items-center justify-center p-4 cursor-pointer"
                >
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: "spring", duration: 0.35 }}
                    className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 relative flex flex-col font-sans text-left"
                  >
                    {/* Close Button */}
                    <button
                      onClick={() => setIsReleaseNotesOpen(false)}
                      className="absolute top-6 right-6 w-8 h-8 hover:bg-black/5 rounded-full flex items-center justify-center transition-all z-20"
                    >
                      <X size={18} className="text-gray-500" />
                    </button>

                    {/* Header */}
                    <div className="space-y-1 mb-6 font-sans">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#dc3545]">What's New</div>
                      <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Ikor ScribePro v2.0.16</h3>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        Released June 1, 2026. See the latest updates and bug fixes.
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc3545] mt-1.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-850">ScribePro Smart Formatting Upgrade</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            Enhanced formatting pipeline automatically fixes punctuation, inserts spaces correctly, and adapts perfectly to your target input styling rules.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc3545] mt-1.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-850">Advanced HIPAA and Data Isolation</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            Full-shield local system constraints ensure that transcription data never touches unrequested servers, aligning perfectly with HIPAA BAA compliance protocols.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc3545] mt-1.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-850">Lag-Free Shortcuts & Dictionary Tuning</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            Fixed a keypress latency delay when calling dictation hotkeys in high-load setups and improved custom brand terms auto-injection accuracy.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc3545] mt-1.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-850">Stability & UI Polish</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            Polished general settings, added responsive modal entry effects, improved scroll physics, and optimized layout dimensions.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-6">
                      <button
                        onClick={() => setIsReleaseNotesOpen(false)}
                        className="w-full bg-[#dc3545] hover:bg-[#b02a37] text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98"
                      >
                        Dismiss Release Notes
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingToggle({ label, description, checked, onChange }: { label: string, description: React.ReactNode, checked?: boolean, onChange?: (c: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => onChange?.(!checked)}
        className={`w-12 h-6 rounded-full p-1 transition-all ${checked ? "bg-black" : "bg-gray-200"}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function SettingAction({ label, description, buttonText, onAction, isDestructive, childrenUnderButton }: { label: string, description: React.ReactNode, buttonText: string, onAction?: () => void, isDestructive?: boolean, childrenUnderButton?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
      <div>
        <div className={`font-medium ${isDestructive ? "text-red-600" : ""}`}>{label}</div>
        <div className={`text-sm ${isDestructive ? "text-red-600" : "text-gray-500"}`}>{description}</div>
      </div>
      <div className="flex flex-col items-center gap-1 min-w-[124px] shrink-0">
        <button onClick={onAction} className={`px-4 py-2 border ${isDestructive ? "border-red-600 text-red-600 hover:bg-red-50" : "border-black/10 hover:bg-gray-50"} rounded-xl text-sm font-medium w-full text-center transition-all`}>
          {buttonText}
        </button>
        {childrenUnderButton}
      </div>
    </div>
  );
}

function SettingInput({
  label,
  description,
  value,
  onSave,
  disabled = false,
  widthClass = "w-1/6"
}: {
  label: string;
  description: string;
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  widthClass?: string;
}) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
      <div className="flex-1 mr-4">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <input
        type="text"
        className={`rounded-xl px-4 py-2 text-sm border border-transparent transition-all focus:outline-none ${widthClass} ${disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-black/5 select-all"
          : "bg-gray-50 text-gray-800 focus:bg-white focus:border-black/15"
          }`}
        value={inputValue}
        onChange={(e) => !disabled && setInputValue(e.target.value)}
        onBlur={() => !disabled && onSave(inputValue)}
        disabled={disabled}
      />
    </div>
  );
}

function SettingDropdown({
  label,
  description,
  options,
  selectedValue,
  onChangeValue
}: {
  label: string;
  description: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onChangeValue: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue) || options[0];

  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 last:border-0 relative">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 hover:border-black/20 rounded-xl text-sm font-medium transition-all select-none min-w-[220px] justify-between shadow-sm active:scale-98 cursor-pointer"
        >
          <span className="text-gray-850 font-medium">{selectedOption.label}</span>
          {isOpen ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay transparent backdrop to allow closing by clicking outside */}
              <div
                className="fixed inset-0 z-[150]"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1.5 bg-white border border-gray-200/80 shadow-2xl rounded-2xl p-2 w-[280px] z-[151] flex flex-col font-sans"
              >
                {options.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onChangeValue(opt.value);
                        setIsOpen(false);
                      }}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold leading-normal transition-all text-left cursor-pointer ${isSelected
                        ? "bg-gray-100/80 text-gray-900"
                        : "text-gray-600 hover:bg-black/5 hover:text-black"
                        }`}
                    >
                      <div className="w-4 shrink-0 mt-0.5">
                        {isSelected && <Check size={14} className="text-gray-800" />}
                      </div>
                      <span className="flex-1">{opt.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MicVisualizer() {
  const [heights, setHeights] = useState([0.3, 0.5, 0.2, 0.7, 0.4, 0.8, 0.3, 0.6, 0.4, 0.9, 0.5, 0.2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end gap-0.5 h-8 select-none">
      {heights.map((h, i) => {
        const maxHeight = 8 + i * 1.5;
        const isActive = i < 6; // left to middle are orange-red/brand, right are gray
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${isActive ? "bg-[#f97316]" : "bg-gray-200"
              }`}
            style={{ height: `${maxHeight * h}px` }}
          />
        );
      })}
    </div>
  );
}
