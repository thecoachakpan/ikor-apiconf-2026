import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, AlertTriangle, CreditCard, ArrowRight } from "lucide-react";

interface ExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: () => void;
  onUpgrade: () => void;
  reason: "daily-limit" | "total-exhausted";
}

export default function ExhaustedModal({ isOpen, onClose, onTopUp, onUpgrade }: ExhaustedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur matching design system */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 z-[260] -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#f8f7f0] rounded-[32px] p-8 shadow-2xl border border-black/5 font-sans overflow-hidden pointer-events-auto"
          >
            {/* Corner Decorative Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Close button */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0">
                <AlertTriangle size={24} className="stroke-[2.5]" />
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-black/5 rounded-full text-gray-400 hover:text-black transition-colors"
                id="close-exhausted-modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content text */}
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
                Word balance exhausted
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                You are out of transcription words. Purchase a top-up pack or lift limitations by upgrading to a monthly premium plan.
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-3 relative z-10">
              {/* Upgrade CTA */}
              <button
                onClick={() => {
                  onClose();
                  onUpgrade();
                }}
                className="w-full bg-black hover:opacity-90 text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between group shadow-sm cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  Upgrade to premium plan
                </span>
                <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Top Up CTA */}
              <button
                onClick={() => {
                  onClose();
                  onTopUp();
                }}
                className="w-full bg-red-100 hover:bg-red-200/80 text-red-700 py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between group border border-red-200/50 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CreditCard size={14} />
                  Top up words balance
                </span>
                <span className="text-[10px] bg-red-200/50 px-2 py-0.5 rounded-md font-sans font-black">Buy pack</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
