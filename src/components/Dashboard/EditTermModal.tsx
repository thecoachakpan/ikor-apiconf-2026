import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface EditTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (index: number, term: string, correction?: string) => void;
  index: number;
  initialTerm: string;
  initialCorrection?: string;
}

export default function EditTermModal({ isOpen, onClose, onEdit, index, initialTerm, initialCorrection }: EditTermModalProps) {
  const [addCorrection, setAddCorrection] = useState(!!initialCorrection);
  const [term, setTerm] = useState(initialTerm);
  const [correction, setCorrection] = useState(initialCorrection || "");

  useEffect(() => {
    setTerm(initialTerm);
    setCorrection(initialCorrection || "");
    setAddCorrection(!!initialCorrection);
  }, [initialTerm, initialCorrection]);

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
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>

          <h2 className="text-2xl font-bold mb-2">Edit term</h2>
          <p className="text-gray-500 mb-6 text-sm">Update this term in your personal dictionary.</p>

          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setAddCorrection(!addCorrection)}
              className={`w-12 h-6 rounded-full transition-colors ${addCorrection ? "bg-red-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  addCorrection ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium">Add a correction</span>
          </div>

          <div className="space-y-4">
            {addCorrection ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Misspelling</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="The misspelled word"
                    className="w-full bg-[#f8f7f0] px-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div className="pt-5 text-gray-400">→</div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Correction</label>
                  <input
                    type="text"
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    placeholder="The correct spelling"
                    className="w-full bg-[#f8f7f0] px-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="The term you'll say"
                  className="w-full bg-[#f8f7f0] px-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onEdit(index, term, addCorrection ? correction : undefined);
              onClose();
            }}
            disabled={!term}
            className="w-full mt-8 bg-red-500 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            Save Changes
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
