import { motion, AnimatePresence } from "motion/react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

interface ReportTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: string, note: string) => void;
}

export default function ReportTranscriptModal({ isOpen, onClose, onSubmit }: ReportTranscriptModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = [
    "Wrong words",
    "Bad formatting",
    "Missing words",
    "Extra words",
    "Mistranslation",
    "Other"
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || isSubmitting) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(selectedCategory, note);
      // Reset state after submission completes
      setSelectedCategory("");
      setNote("");
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSubmitting ? undefined : onClose}
            className="fixed inset-0 z-[10015] bg-black/40 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <div 
            onClick={isSubmitting ? undefined : onClose}
            className="fixed inset-0 z-[10016] flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-visible shadow-2xl p-8 relative flex flex-col font-sans"
            >
              {/* Close Button */}
              {!isSubmitting && (
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 w-8 h-8 hover:bg-black/5 rounded-full flex items-center justify-center transition-all z-20"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              )}

              {/* Title & Description */}
              <div className="space-y-1 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Report Transcript</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Help us improve by reporting an issue with this transcript.
                </p>
              </div>

              {/* Form Block */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category Field */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-800 block">
                    Category <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Dropdown Trigger */}
                  <div
                    onClick={() => !isSubmitting && setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full bg-gray-50 rounded-[18px] px-5 py-3.5 flex items-center justify-between cursor-pointer select-none transition-all duration-250 shadow-xxs border border-transparent ${
                      isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 hover:border-black/5"
                    }`}
                  >
                    <span className={`text-[15px] font-medium ${selectedCategory ? 'text-gray-800' : 'text-gray-400'}`}>
                      {selectedCategory || "Select a category"}
                    </span>
                    {isDropdownOpen ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>

                  {/* Dropdown Options */}
                  <AnimatePresence>
                    {isDropdownOpen && !isSubmitting && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-1 bg-white border border-black/10 rounded-[20px] shadow-xl overflow-hidden z-50 divide-y divide-black/[0.02]"
                      >
                        <div className="p-1.5 max-h-[220px] overflow-y-auto w-full">
                          {categories.map((cat) => (
                            <div
                              key={cat}
                              onClick={() => {
                                setSelectedCategory(cat);
                                setIsDropdownOpen(false);
                              }}
                              className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm font-semibold select-none transition-colors ${
                                selectedCategory === cat
                                  ? 'bg-[#dc3545]/10 text-[#dc3545]'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {cat}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Note Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">Note</label>
                  <div className="relative">
                    <textarea
                      maxLength={1000}
                      rows={4}
                      value={note}
                      disabled={isSubmitting}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Describe the issue (optional)..."
                      className="w-full bg-gray-50 border border-transparent rounded-[20px] px-5 py-4 text-sm text-gray-800 placeholder-gray-400 leading-relaxed outline-none focus:bg-white focus:border-[#dc3545]/20 focus:ring-4 focus:ring-[#dc3545]/5 transition-all duration-200 resize-none font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <div className="text-right text-[10px] text-gray-400 font-semibold tracking-tight mt-1 select-none">
                      {note.length}/1000
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!selectedCategory || isSubmitting}
                    className={`rounded-full px-8 py-3.5 text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                      selectedCategory && !isSubmitting
                        ? 'bg-[#dc3545] text-white hover:bg-[#b02a37] shadow-md active:scale-98 cursor-pointer'
                        : isSubmitting
                          ? 'bg-[#dc3545]/60 text-white cursor-not-allowed shadow-none'
                          : 'bg-[#dc3545]/30 text-white/90 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Submitting
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
