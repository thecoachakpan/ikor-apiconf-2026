import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface EditShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (index: number, original: string, replacement: string) => void;
  index: number;
  initialOriginal: string;
  initialReplacement: string;
}

export default function EditShortcutModal({ isOpen, onClose, onEdit, index, initialOriginal, initialReplacement }: EditShortcutModalProps) {
  const [original, setOriginal] = useState(initialOriginal);
  const [replacement, setReplacement] = useState(initialReplacement);

  useEffect(() => {
    setOriginal(initialOriginal);
    setReplacement(initialReplacement);
  }, [initialOriginal, initialReplacement]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative border border-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors focus:outline-none"
          >
            <X size={16} className="text-gray-600" />
          </button>

          <h2 className="text-2xl font-bold mb-2 text-gray-900">Edit shortcut</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Update this shortcut in your personal dictionary.
          </p>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-400 mb-1.5 block">Original Phrase</span>
              <input
                type="text"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="Original..."
                className="w-full bg-[#f8f7f0] px-5 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 mb-1.5 block">Replacement Text</span>
              <textarea
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replacement..."
                rows={4}
                className="w-full bg-[#f8f7f0] px-5 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={() => {
                if (original && replacement) {
                  onEdit(index, original, replacement);
                  onClose();
                }
              }}
              disabled={!original || !replacement}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-gray-200 text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-70 text-sm focus:outline-none"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
