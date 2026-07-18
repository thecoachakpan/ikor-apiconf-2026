import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Zap, Globe, Shield, CreditCard, User, Settings, HelpCircle, FileText, Eye, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: Settings, label: "General" },
  { icon: Shield, label: "Data and Privacy" },
  { icon: CreditCard, label: "Plans and Billing" },
  { icon: User, label: "Account" },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState({ launchAtLogin: false, privacyMode: false });

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const active = await isEnabled();
          setSettings(prev => ({ ...prev, launchAtLogin: active }));
        } catch (e) {
          console.warn("Failed to check if autostart is enabled:", e);
        }
      })();
    }
  }, [isOpen]);

  const handleLaunchAtLoginChange = async (c: boolean) => {
    setSettings(prev => ({ ...prev, launchAtLogin: c }));
    try {
      if (c) {
        await enable();
      } else {
        await disable();
      }
    } catch (e) {
      console.warn("Failed to update autostart setting:", e);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return (
          <>
            <SettingAction label="Shortcuts" description="Assign your hotkeys." buttonText="Change" />
            <SettingAction label="Language Detection" description="Prioritize language when you speak." buttonText="English +1" />
            <SettingAction label="Microphone" description="Use built-in microphone." buttonText="Change" />
            <SettingToggle label="Launch at Login" description="Open automatically on startup." checked={settings.launchAtLogin} onChange={handleLaunchAtLoginChange} />
            <SettingAction label="Check for Updates" description="Version 2.0.16" buttonText="Check for Updates" />
          </>
        );
      case "Data and Privacy":
        return (
          <>
            <SettingToggle label="Privacy Mode" description="Do not share dictation data." checked={settings.privacyMode} onChange={(c) => setSettings({...settings, privacyMode: c})} />
            <SettingAction label="Delete All Transcripts" description="Permanently delete all local transcripts." buttonText="Delete All" />
            <SettingAction label="Enable HIPAA" description="View the HIPAA BAA for yourself." buttonText="View and Accept" />
          </>
        );
      case "Plans and Billing":
        return (
          <div className="space-y-6">
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Queued", price: "$0", features: [{text: "2,000 words/week", icon: Globe}, {text: "Smart dictation", icon: Zap}, {text: "Dictionary & shortcuts", icon: FileText}, {text: "Privacy mode", icon: Eye}, {text: "HIPAA-ready", icon: Shield}], highlight: false },
                { name: "Fast", price: "$12", features: [{text: "Unlimited dictation", icon: Zap}, {text: "Smart dictation", icon: Zap}, {text: "Dictionary & shortcuts", icon: FileText}, {text: "Privacy mode", icon: Eye}, {text: "HIPAA-ready", icon: Shield}], highlight: false },
                { name: "Ultrafast", price: "$20", features: [{text: "Unlimited dictation", icon: Zap}, {text: "Smart dictation", icon: Zap}, {text: "Dictionary & shortcuts", icon: FileText}, {text: "Privacy mode", icon: Eye}, {text: "HIPAA-ready", icon: Shield}], highlight: true },
              ].map(plan => (
                <div key={plan.name} className={`border ${plan.highlight ? "border-orange-400 bg-orange-50/50" : "border-black/5"} rounded-3xl p-6 flex flex-col`}>
                  <div className="font-bold text-lg mb-2">{plan.name}</div>
                  <div className="text-4xl font-bold font-mono mb-1">{plan.price}</div>
                  <div className="text-gray-500 text-sm mb-6">/ user / month</div>
                  
                  {plan.name !== "Queued" && (
                    <button className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-6 rounded-full p-1 transition-all bg-orange-700`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform translate-x-6`} />
                        </div>
                        <span className="text-sm font-semibold">Yearly (saves 20%)</span>
                    </button>
                  )}

                  <div className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                        <div key={f.text} className="flex gap-2 text-sm text-gray-700">
                             <div className="mt-0.5"><f.icon size={14} className="text-orange-600" /></div>
                             {f.text}
                        </div>
                    ))}
                  </div>

                  <button className={`w-full py-3 rounded-xl text-sm font-semibold ${plan.name === "Queued" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : plan.highlight ? "bg-orange-700 text-white" : "bg-orange-100 text-orange-700"}`} disabled={plan.name === "Queued"}>
                    {plan.name === "Queued" ? "Current Plan" : "Top up"}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="border border-black/5 rounded-2xl p-6">
                <div className="font-bold mb-2">Enterprise</div>
                <div className="flex justify-between items-center">
                    <div className="text-gray-600 text-sm">For teams that need SOC 2 & HIPAA compliance, enforced zero data retention,<br/> advanced privacy and data controls, SSO/SAML, and bulk pricing rate reduction.</div>
                    <button className="bg-white border border-gray-200 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">Upgrade</button>
                </div>
            </div>
          </div>
        );
      case "Account":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-gray-200" />
              <div>
                <div className="font-bold text-lg">Jane Doe</div>
                <div className="text-gray-500 text-sm">jane.doe@example.com</div>
              </div>
            </div>
            <SettingAction label="Transfer Email" description="Transfer account to a new email." buttonText="Transfer" />
            <SettingAction label="Sign out" description="Sign out of your account." buttonText="Sign out" />
            <SettingAction label="Delete Account" description="Permanently delete your account." buttonText="Delete" />
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
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="bg-white w-full max-w-6xl h-[600px] rounded-[32px] shadow-2xl flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-black/5 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                    <Settings size={18} />
                  </div>
                  <span className="font-bold text-lg">Settings</span>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search" className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm" />
                </div>

                <nav className="space-y-1 flex-1">
                  {navItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setActiveTab(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.label
                          ? "bg-black/5 text-black" 
                          : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
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
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{activeTab}</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>
                
                {/* The Transition Effect */}
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
        </>
      )}
    </AnimatePresence>
  );
}

function SettingToggle({ label, description, checked, onChange }: { label: string, description: string, checked?: boolean, onChange?: (c: boolean) => void }) {
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

function SettingAction({ label, description, buttonText, onAction }: { label: string, description: string, buttonText: string, onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button onClick={onAction} className="px-4 py-2 border border-black/10 rounded-xl text-sm font-medium hover:bg-gray-50">
        {buttonText}
      </button>
    </div>
  );
}
