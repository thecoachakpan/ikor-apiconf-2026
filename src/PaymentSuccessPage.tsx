import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

export default function PaymentSuccessPage() {
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("paymentReference") || urlParams.get("transactionReference");
      if (ref) {
        setPaymentRef(ref);
      } else {
        // Bounce anyone who visits this page manually without a transaction reference
        window.location.href = "/";
      }
    } catch (e) {
      console.warn("Could not parse transaction reference:", e);
      window.location.href = "/";
    }
  }, []);

  const handleCloseTab = () => {
    try {
      window.close();
    } catch (e) {
      console.log("window.close() restricted:", e);
    }
    setTimeout(() => {
      window.location.href = "https://ikor-apiconf.vercel.app";
    }, 150);
  };

  return (
    <div id="payment-success-page" className="min-h-[80vh] flex items-center justify-center relative overflow-hidden px-6 py-12">
      {/* Premium background glow overlay */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0 opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(22, 163, 74, 0.15) 0%, rgba(242, 240, 228, 0) 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.8, bounce: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl border border-black/5 rounded-[32px] p-8 md:p-10 shadow-2xl text-center"
      >
        {/* Animated Checkmark Circle */}
        <div className="relative w-20 h-20 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 200, damping: 12 }}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Check size={24} className="stroke-[3]" />
            </motion.div>
          </motion.div>
        </div>

        {/* Title & Description */}
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Payment Successful
        </h1>
        <p className="text-gray-500 text-sm font-semibold leading-relaxed mb-8 max-w-sm mx-auto">
          Your payment has been received and processed. You can now close this window and return to the Ikor desktop app to finish updating your balance.
        </p>

        {/* Dynamic Payment Reference Box */}
        {paymentRef && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between bg-black/[0.02] border border-black/5 rounded-2xl p-4 mb-8 text-left"
          >
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Payment Reference
            </span>
            <span className="font-mono text-sm font-black text-gray-900 select-all tracking-wider">
              {paymentRef}
            </span>
          </motion.div>
        )}

        {/* Interactive Action Button */}
        <button
          type="button"
          onClick={handleCloseTab}
          className="w-full bg-black text-white py-4 px-6 rounded-2xl font-bold hover:bg-neutral-800 transition-all duration-200 cursor-pointer shadow-md active:scale-[0.98]"
        >
          Close Tab
        </button>

        <span className="block text-[11px] font-bold text-gray-400 mt-4 tracking-wide uppercase">
          You can safely close this page at any time.
        </span>
      </motion.div>
    </div>
  );
}
