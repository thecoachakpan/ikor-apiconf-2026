import { motion, AnimatePresence } from "motion/react";
import { X, Pencil, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { supabase } from "../../lib/supabaseClient";

interface ShortcutDef {
  id: string;
  label: string;
  description: string;
  keys: string[];
  defaultKeys: string[];
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Define initial state for hotkeys
  const [shortcuts, setShortcuts] = useState<ShortcutDef[]>(() => {
    const saved = localStorage.getItem("sayikor_shortcuts");
    const defaults = [
      {
        id: "dictation",
        label: "Dictation Hotkey",
        description: "Hold to speak, then let go to dictate",
        keys: ["Left Ctrl", "Left Alt"],
        defaultKeys: ["Left Ctrl", "Left Alt"]
      },
      {
        id: "scribe",
        label: "ScribePro Hotkey",
        description: "Press to generate a message from a short description",
        keys: ["Left Ctrl", "Left Win", "Z"],
        defaultKeys: ["Left Ctrl", "Left Win", "Z"]
      },
      {
        id: "handsFree",
        label: "Hands-Free Mode Hotkey",
        description: "Press to start and stop dictation",
        keys: ["Left Ctrl", "Left Win", "Space"],
        defaultKeys: ["Left Ctrl", "Left Win", "Space"]
      },
      {
        id: "paste",
        label: "Paste Last Transcript Hotkey",
        description: "Re-paste the last transcript result",
        keys: [], // Empty initially
        defaultKeys: ["Left Ctrl", "Left Win", "S"]
      },
      {
        id: "mcp",
        label: "Voice Payment Hotkey",
        description: "Hold to execute voice payment commands (e.g. 'Top up 5000 NGN')",
        keys: ["Left Ctrl", "Left Win", "M"],
        defaultKeys: ["Left Ctrl", "Left Win", "M"]
      }
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return defaults.map(def => {
            const match = parsed.find((p: any) => p.id === def.id);
            return match ? { ...def, keys: match.keys } : def;
          });
        }
      } catch (e) {
        console.error("Failed to parse saved shortcuts", e);
      }
    }
    return defaults;
  });

  // Sync to local storage and broadcast changes to the bubble window
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const shortcutsJson = JSON.stringify(shortcuts);
    localStorage.setItem("sayikor_shortcuts", shortcutsJson);
    // Relay to the bubble window via Tauri backend (localStorage is isolated per window)
    invoke("notify_shortcuts_changed", { shortcutsJson }).catch(console.error);
    // Also notify the dashboard window locally
    window.dispatchEvent(new Event("sayikor_shortcuts_updated"));

    // Persist to store.json so the bubble window can load them on restart
    // AND sync to Supabase user metadata
    (async () => {
      try {
        const store = await load("store.json");
        await store.set("sayikor_shortcuts", shortcutsJson);
        await store.save();
      } catch (e) {
        console.error("Failed to persist shortcuts to store.json:", e);
      }
      try {
        await supabase.auth.updateUser({
          data: {
            shortcuts: shortcuts.map(s => ({ id: s.id, keys: s.keys }))
          }
        });
      } catch (e) {
        console.error("Failed to sync shortcuts to Supabase:", e);
      }
    })();
  }, [shortcuts]);

  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Listen to keyboard inputs when recording keys
  useEffect(() => {
    if (!activeRecordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      const newKeys: string[] = [];
      if (e.ctrlKey) newKeys.push("Left Ctrl");
      if (e.metaKey) newKeys.push("Left Win");
      if (e.altKey) newKeys.push("Left Alt");
      if (e.shiftKey) newKeys.push("Shift");

      // Handle standard keys
      let keyName = e.key;
      if (keyName === " ") keyName = "Space";
      
      // Capitalize first letter of normal letters, or ignore if it is just a modifier key
      if (!["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
        if (keyName.length === 1) {
          keyName = keyName.toUpperCase();
        }
        if (!newKeys.includes(keyName)) {
          newKeys.push(keyName);
        }
      }

      setRecordedKeys(newKeys);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      // Lock and save if we have gathered some keys
      if (recordedKeys.length > 0) {
        saveRecordedShortcut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeRecordingId, recordedKeys]);

  const saveRecordedShortcut = () => {
    if (!activeRecordingId || recordedKeys.length === 0) return;

    const isSameCombination = (keys1: string[], keys2: string[]) => {
      if (keys1.length !== keys2.length) return false;
      const s1 = [...keys1].sort();
      const s2 = [...keys2].sort();
      return s1.every((val, index) => val === s2[index]);
    };

    const conflicting = shortcuts.find(item => 
      item.id !== activeRecordingId && 
      isSameCombination(item.keys, recordedKeys)
    );

    if (conflicting) {
      setErrorMessage(`The shortcut combination "${recordedKeys.join(" + ")}" is already assigned to "${conflicting.label}". Please choose another combination.`);
      setRecordedKeys([]);
      return;
    }
    
    setErrorMessage(null);
    setShortcuts(prev => prev.map(item => {
      if (item.id === activeRecordingId) {
        return { ...item, keys: recordedKeys };
      }
      return item;
    }));
    setActiveRecordingId(null);
    setRecordedKeys([]);
  };

  const handleResetToDefault = (id: string) => {
    setErrorMessage(null);
    setShortcuts(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, keys: [...item.defaultKeys] };
      }
      return item;
    }));
  };

  const handleResetAll = () => {
    setErrorMessage(null);
    setShortcuts(prev => prev.map(item => ({
      ...item,
      // Reset everything of interest
      keys: item.id === "paste" ? [] : [...item.defaultKeys]
    })));
  };

  const handleEditClick = (id: string) => {
    setActiveRecordingId(id);
    setRecordedKeys([]);
    setErrorMessage(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay element */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <div 
            onClick={onClose}
            className="fixed inset-0 z-[10011] flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header block */}
              <div className="flex items-center justify-between p-8 pb-4">
                <h3 className="text-2xl font-sans font-extrabold text-gray-900">Shortcuts</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 hover:bg-black/5 rounded-full flex items-center justify-center transition-all"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>



              {/* Error warning notification with animated presentation */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, scale: 0.95 }}
                    animate={{ height: "auto", opacity: 1, scale: 1 }}
                    exit={{ height: 0, opacity: 0, scale: 0.95 }}
                    className="px-8 pb-4 overflow-hidden"
                  >
                    <div className="bg-accent-orange/10 border border-accent-orange/30 text-black px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                      <button 
                        onClick={() => setErrorMessage(null)}
                        className="text-gray-400 hover:text-black font-extrabold px-1.5 py-0.5 hover:bg-black/5 rounded-lg transition-colors shrink-0 text-[10px]"
                      >
                        CLOSE
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable list card container */}
              <div className="px-8 pb-6 flex-1 overflow-y-auto">
                <div className="border border-black/5 rounded-[24px] overflow-hidden bg-white shadow-xs divide-y divide-black/5">
                  {shortcuts.map((shortcut) => {
                    const hasShortcutKeys = shortcut.keys.length > 0;
                    const isRecording = activeRecordingId === shortcut.id;

                    return (
                      <div key={shortcut.id} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          {/* Info Column */}
                          <div className="space-y-1">
                            <h4 className="font-sans font-bold text-gray-900 text-sm">{shortcut.label}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-normal">{shortcut.description}</p>
                          </div>

                          {/* Keybind Action Section */}
                          <div className="shrink-0">
                            {isRecording ? (
                              <div className="flex items-center gap-2">
                                <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1.5 rounded-xl font-bold animate-pulse">
                                  {recordedKeys.length > 0 ? recordedKeys.join(" + ") : "Press any keys..."}
                                </span>
                                <button
                                  onClick={() => setActiveRecordingId(null)}
                                  className="text-xs text-gray-400 hover:text-black font-semibold mr-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : hasShortcutKeys ? (
                              <div 
                                onClick={() => handleEditClick(shortcut.id)}
                                className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-black/5 p-1.5 px-3 rounded-xl cursor-pointer hover:border-black/20 hover:shadow-xs transition-all duration-200 select-none group"
                                title="Click to custom bind hotkey"
                              >
                                {shortcut.keys.map((key, kIdx) => (
                                  <span key={key} className="flex items-center">
                                    <span className="bg-white/85 text-gray-700 border border-black/5 shadow-xxs rounded-[6px] text-[11px] font-bold px-2 py-0.5 font-sans whitespace-nowrap">
                                      {key}
                                    </span>
                                    {kIdx < shortcut.keys.length - 1 && (
                                      <span className="text-gray-400 text-xs font-bold px-1">+</span>
                                    )}
                                  </span>
                                ))}
                                <Pencil size={11} className="text-gray-400 group-hover:text-gray-800 ml-1.5" />
                              </div>
                            ) : (
                              /* Render pristine ADD button for Paste Last Transcript which has no shortcut currently */
                              <button
                                onClick={() => handleEditClick(shortcut.id)}
                                className="inline-flex items-center gap-1.5 px-5 py-2 bg-gray-100/70 hover:bg-gray-150 text-gray-800 rounded-xl font-bold text-xs select-none transition-all duration-150 shadow-xxs border border-black/5"
                              >
                                <Plus size={13} />
                                Add
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reset individual button under Scribe and Hands-Free & custom newly bound key combinations */}
                        {!isRecording && hasShortcutKeys && (shortcut.id === "scribe" || shortcut.id === "handsFree" || shortcut.id === "paste" || shortcut.id === "mcp") && (
                          <div className="mt-2 text-right">
                            <button
                              onClick={() => handleResetToDefault(shortcut.id)}
                              className="text-[10px] text-gray-400 hover:text-red-500 font-bold tracking-tight inline-block transition-colors"
                            >
                              Reset to Default
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer control */}
              <div className="flex justify-center pb-8 pt-2">
                <button
                  onClick={handleResetAll}
                  className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors duration-150"
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
