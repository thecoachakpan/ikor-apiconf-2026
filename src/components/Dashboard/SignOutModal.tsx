import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SignOutModal({ isOpen, onClose, onConfirm }: SignOutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop */}
          <motion.div
            id="sign-out-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10006] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div 
            id="sign-out-modal-wrapper"
            className="fixed inset-0 z-[10007] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              id="sign-out-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top-Right Close Button */}
              <button
                id="sign-out-close-btn"
                onClick={onClose}
                className="absolute top-6 right-6 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X size={16} className="text-gray-600" />
              </button>

              {/* Title */}
              <h2 id="sign-out-title" className="text-2xl font-sans font-bold text-gray-800 mb-6 pr-10">
                Sign Out?
              </h2>

              {/* Description */}
              <p id="sign-out-desc" className="text-[15px] text-gray-600 leading-relaxed mb-6 font-medium">
                Are you sure you want to sign out? The following data will be cleared from this device:
              </p>

              {/* Bullet Points */}
              <ul id="sign-out-bullets-list" className="space-y-3 pl-2 mb-8 text-[15px] font-medium text-gray-400">
                <li id="sign-out-bullet-recordings" className="flex items-center gap-2">
                  <span className="text-gray-300">•</span>
                  <span>All transcripts and recordings</span>
                </li>
                <li id="sign-out-bullet-user-data" className="flex items-center gap-2">
                  <span className="text-gray-300">•</span>
                  <span>All user data</span>
                </li>
              </ul>

              {/* Bottom Buttons Action Bar */}
              <div id="sign-out-actions" className="flex justify-end items-center gap-3.5 mt-auto">
                <button
                  id="sign-out-cancel-btn"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full border border-black/10 hover:bg-black/5 text-gray-700 text-sm font-semibold transition-all cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  id="sign-out-confirm-btn"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#ff2d37] hover:bg-[#ff3c45] active:bg-[#e02029] text-white text-sm font-semibold transition-all cursor-pointer shadow-md select-none hover:scale-102"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
