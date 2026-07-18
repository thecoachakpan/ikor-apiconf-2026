import { motion, AnimatePresence } from "motion/react";
import { X, ShieldAlert, Check, Ban } from "lucide-react";

interface McpConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  args: Record<string, any>;
  explanation: string;
  onApprove: () => void;
  onReject: () => void;
}

export default function McpConfirmationModal({
  isOpen,
  onClose,
  toolName,
  args,
  explanation,
  onApprove,
  onReject
}: McpConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={onClose}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 font-sans"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f2f0e4] w-full max-w-[420px] rounded-[32px] shadow-2xl overflow-hidden p-8 border border-white/20 relative backdrop-blur-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center">
                  <ShieldAlert size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">Voice Action Required</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Verify Monnify Agentic Transaction</p>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-6 top-6 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-black/5 rounded-full transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Explanation Statement */}
                <div className="bg-white/60 border border-black/5 rounded-2xl p-4">
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    {explanation || "Your voice command triggered a Monnify action."}
                  </p>
                </div>

                {/* Details list */}
                <div className="bg-black/5 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">MCP Tool:</span>
                    <span className="font-mono text-gray-950 font-bold">{toolName}</span>
                  </div>

                  <div className="h-px bg-black/5" />

                  <div className="space-y-1.5">
                    <span className="text-gray-500 font-medium">Arguments:</span>
                    <pre className="w-full bg-white/40 border border-black/5 rounded-xl p-3 text-[10px] text-gray-800 font-mono overflow-x-auto">
                      {JSON.stringify(args, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-3">
                <button
                  onClick={onReject}
                  className="flex-1 py-3 px-4 rounded-xl border border-black/10 text-gray-700 font-bold text-xs hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban size={14} />
                  Reject
                </button>
                <button
                  onClick={onApprove}
                  className="flex-1 py-3 px-4 bg-black hover:bg-black/90 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  Approve Call
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
