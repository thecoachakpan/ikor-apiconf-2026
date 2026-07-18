import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type?: 'single' | 'all';
  title?: string;
  description?: string;
  confirmText?: string;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, type = 'single', title, description, confirmText = "Delete" }: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-gray-600" />
            </button>
            <div className="mb-6 flex justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="text-red-600" size={24} />
                </div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-center">
              {title || (type === 'single' ? "Delete this transcript?" : "Delete all transcripts?")}
            </h2>
            <p className="text-sm text-gray-500 mb-8 text-center px-4">
              {description || (type === 'single' 
                ? "This transcript will be deleted forever. This can't be undone."
                : "All your transcripts and recordings will be deleted forever. This can't be undone."
              )}
            </p>
            <div className="flex gap-4">
              <button                
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button                
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-all text-sm"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
