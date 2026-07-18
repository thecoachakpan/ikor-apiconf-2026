import { motion, AnimatePresence } from "motion/react";
import { X, Check, Sparkles, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

import { openUrl } from "@tauri-apps/plugin-opener";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  currency: 'NGN' | 'USD';
  isActualPro: boolean;
  currentPlanName?: string;
  selectedProInSettings: boolean;
  onTopUpSuccess: (wordsAdded: number, upgradedPlanName: string | null, priceString?: string) => void;
  mode: 'topup' | 'upgrade';
  upgradePlan?: string;
  proPlanDaysLeft?: number | null;
}

export default function TopUpModal({ 
  isOpen, 
  onClose, 
  email,
  currency: _currency, 
  isActualPro, 
  currentPlanName,
  selectedProInSettings,
  onTopUpSuccess,
  upgradePlan,
  proPlanDaysLeft
}: TopUpModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [upgradeChoice, setUpgradeChoice] = useState<"none" | "Plus" | "Pro">("none");
  const activeCurrency = _currency;

  // Checkout States
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSuccessScreen, setIsSuccessScreen] = useState(false);
  const [pendingMonnifyRef, setPendingMonnifyRef] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const actualPlan = currentPlanName || (isActualPro ? "Ikor Plus" : "Free Trial");

  const daysLeft = proPlanDaysLeft !== null && proPlanDaysLeft !== undefined ? proPlanDaysLeft : 30;
  const daysLeftStr = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  const progressBarPercentage = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      if (actualPlan === "Ikor Pro" || actualPlan === "Pro plan") {
        setUpgradeChoice("none");
      } else if (actualPlan === "Ikor Plus") {
        setUpgradeChoice(selectedProInSettings ? "Pro" : "none");
      } else {
        // Free Trial / Free
        if (selectedProInSettings) {
          setUpgradeChoice("Pro");
        } else if (upgradePlan === "Ikor Plus") {
          setUpgradeChoice("Plus");
        } else if (upgradePlan === "Ikor Pro") {
          setUpgradeChoice("Pro");
        } else {
          setUpgradeChoice("none");
        }
      }
      
      // Reset checkout states
      setIsCheckingOut(false);
      setIsSuccessScreen(false);
      setPendingMonnifyRef(null);
      setIsVerifying(false);
    }
  }, [isOpen, actualPlan, selectedProInSettings, upgradePlan]);

  // Automatic background polling for Monnify payment status
  useEffect(() => {
    if (!pendingMonnifyRef || !isOpen) return;

    let isSubscribed = true;
    const intervalId = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("verify-monnify-payment", {
          body: { transactionReference: pendingMonnifyRef }
        });
        
        if (!isSubscribed) return;

        if (data && data.verified) {
          clearInterval(intervalId);
          setPendingMonnifyRef(null);
          setIsSuccessScreen(true);
        }
      } catch (e) {
        console.warn("Background verification poll failed:", e);
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [pendingMonnifyRef, isOpen]);

  const parsedAmount = parseFloat(amount) || 0;

  // Determine actual rate based on current plan and whether upgrade is checked:
  // - Ikor Pro / Pro plan: ₦25 / $0.025 per 1,000 words (0.025 NGN / 0.000025 USD per word)
  // - Ikor Plus: default ₦50 / $0.05 per 1,000 words. If upgraded to Pro: ₦25 / $0.025.
  // - Free plan: default ₦100 / $0.1 per 1,000 words. If upgraded to Plus: ₦50 / $0.05.
  const activeRate = useMemo(() => {
    let rate = 0.1;
    if (actualPlan === "Ikor Pro" || actualPlan === "Pro plan") {
      rate = 0.025;
    } else if (actualPlan === "Ikor Plus") {
      rate = upgradeChoice === "Pro" ? 0.025 : 0.05;
    } else if (actualPlan === "Free Trial" || actualPlan === "Free") {
      rate = upgradeChoice === "Pro" ? 0.025 : 0.05;
    } else {
      if (upgradeChoice === "Pro") rate = 0.025;
      else if (upgradeChoice === "Plus") rate = 0.05;
    }
    
    if (activeCurrency === 'USD') {
      rate = rate / 1000;
    }
    return rate;
  }, [actualPlan, upgradeChoice, activeCurrency]);

  const baseWordsCost = parsedAmount * activeRate;
  const wordsCost = baseWordsCost;

  // Subscription flat fee to include
  const flatSubscriptionFee = useMemo(() => {
    if (upgradeChoice === "none") return 0;
    if (upgradeChoice === "Pro") {
      return activeCurrency === 'NGN' ? 9000 : 9;
    }
    // Upgrading to Plus
    return activeCurrency === 'NGN' ? 3000 : 3;
  }, [upgradeChoice, activeCurrency]);

  const subtotal = wordsCost + flatSubscriptionFee;

  // Calculate Transaction fee: 6% + N150 or 6% + $0.15
  const transactionFee = useMemo(() => {
    if (subtotal <= 0) return 0;
    const feePercent = 0.06;
    const fixedFee = activeCurrency === 'NGN' ? 150 : 0.15;
    return (subtotal * feePercent) + fixedFee;
  }, [subtotal, activeCurrency]);

  const totalAmount = subtotal + transactionFee;

  // Enforce minimum and maximum aggregate costs (subtotal)
  const minCostLimit = activeCurrency === 'NGN' ? 300 : 0.3;
  const maxCostLimit = activeCurrency === 'NGN' ? 9000 : 9;

  const hasMinError = (parsedAmount > 0 || upgradeChoice !== "none") && subtotal < minCostLimit;
  const hasMaxError = subtotal > maxCostLimit;

  const canProceed = (parsedAmount > 0 || upgradeChoice !== "none") && !hasMinError && !hasMaxError && !isCheckingOut;

  const handleProceed = async () => {
    if (!canProceed) return;
    if (activeCurrency === 'USD') {
      alert("Stripe Integration (Coming Soon): USD payments are currently in sandbox. Please switch your settings to NGN to complete real payments via Monnify.");
      return;
    }
    setIsCheckingOut(true);

    try {
      const reference = "MONNIFY-" + Math.floor(1000000 + Math.random() * 9000000);
      const { data, error } = await supabase.functions.invoke("initialize-monnify-payment", {
        body: {
          amount: totalAmount,
          customerEmail: email || "user@example.com",
          customerName: "Ikor User",
          reference,
          paymentDescription: "Ikor Word Top-up"
        }
      });

      if (error || !data || !data.checkoutUrl) {
        console.error("Initialize payment error:", error || data);
        alert(data?.error || "Failed to initialize Monnify payment. Please try again.");
        setIsCheckingOut(false);
        return;
      }

      // Open checkout URL in default system browser
      await openUrl(data.checkoutUrl);
      setPendingMonnifyRef(data.transactionReference || reference);
      setIsCheckingOut(false);
    } catch (e) {
      console.error("Monnify Checkout Error:", e);
      alert("An error occurred starting the Monnify payment. Please try again.");
      setIsCheckingOut(false);
    }
  };

  const handleVerifyMonnifyPayment = async () => {
    if (!pendingMonnifyRef) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-monnify-payment", {
        body: { transactionReference: pendingMonnifyRef }
      });
      if (error) {
        console.warn("verify-monnify-payment returned error:", error);
      }
      if (data && data.verified) {
        setPendingMonnifyRef(null);
        setIsSuccessScreen(true);
      } else {
        alert("Payment verification pending or unsuccessful. If you have paid, please wait a few seconds and try again.");
      }
    } catch (verifyErr) {
      console.error("Failed to contact verification endpoint:", verifyErr);
      alert("Error contacting payment verification service. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinishSuccess = () => {
    const planWordsAdded = upgradeChoice === "Pro" ? 120000 : (upgradeChoice === "Plus" ? 40000 : 0);
    const finalWordsAdded = parsedAmount + planWordsAdded;
    const upgradedPlanName = upgradeChoice !== "none" ? (upgradeChoice === "Pro" ? "Ikor Pro" : "Ikor Plus") : null;
    const currencySymbol = activeCurrency === 'NGN' ? '₦' : '$';
    const priceString = `${currencySymbol}${totalAmount.toFixed(2)}`;

    onTopUpSuccess(finalWordsAdded, upgradedPlanName, priceString);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur matching SettingsModal */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClose}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 font-sans"
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white w-full max-w-[454px] rounded-[32px] shadow-2xl overflow-hidden p-8 border border-black/5"
            >
              {isSuccessScreen ? (
                /* ----------------- SUCCESS INVOICE RECEIPT SCREEN ----------------- */
                <div className="text-center py-2 animate-fade-in">
                  <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 outline outline-2 outline-green-500/20">
                    <Check size={32} className="stroke-[3]" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Payment Successful!</h2>
                  <p className="text-xs text-gray-500 mt-1">Your account balance has been updated</p>

                  <div className="mt-6 bg-gray-50 rounded-2xl p-5 border border-black/5 text-left space-y-3 font-medium">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Receipt ID</span>
                      <span className="font-mono text-gray-900 font-semibold">REC-{(Math.random() * 1000000).toFixed(0)}</span>
                    </div>
                    
                    <div className="h-px bg-gray-200" />

                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Purchased Words</span>
                      <span className="text-gray-900 font-bold">{parsedAmount.toLocaleString()} words</span>
                    </div>

                    {upgradeChoice !== "none" && (
                      <div className="flex justify-between text-xs text-gray-500 font-medium font-sans">
                        <span>{upgradeChoice === "Pro" ? "Ikor Pro" : "Ikor Plus"} Plan</span>
                        <span className="text-green-605 font-bold">Activated ({upgradeChoice === "Pro" ? "120,000" : "40,000"} words)</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs font-bold text-gray-800 border-t border-dashed border-gray-200 pt-2 shrink-0">
                      <span>Total Words</span>
                      <span className="text-emerald-700 font-extrabold font-mono">
                        {(parsedAmount + (upgradeChoice === "Pro" ? 120000 : (upgradeChoice === "Plus" ? 40000 : 0))).toLocaleString()} words
                      </span>
                    </div>

                    <div className="h-px bg-gray-200" />

                    <div className="flex justify-between text-sm font-bold text-gray-900">
                      <span>Total Amount Paid</span>
                      <span>
                        {activeCurrency === 'NGN' ? '₦' : '$'}
                        {totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-2">
                    <button
                      onClick={handleFinishSuccess}
                      className="w-full bg-black hover:bg-black/90 text-white shrink-0 py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Back to dashboard
                    </button>
                    <p className="text-[10px] text-gray-400">
                      Receipt sent to your dynamic email address. Thank you for utilizing Ikor!
                    </p>
                  </div>
                </div>
              ) : pendingMonnifyRef ? (
                /* ----------------- VERIFY MONNIFY PAYMENT SCREEN ----------------- */
                <div className="text-center py-2 animate-fade-in">
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-650 rounded-full flex items-center justify-center mx-auto mb-5 outline outline-2 outline-blue-500/20">
                    <RefreshCw size={32} className={`stroke-[3] ${isVerifying ? "animate-spin" : ""}`} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Complete Payment</h2>
                  <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
                    We've opened the secure Monnify checkout page in your default browser. Complete your payment there, then click below to verify.
                  </p>

                  <div className="mt-6 bg-gray-50 rounded-2xl p-5 border border-black/5 text-left space-y-3 font-medium">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Transaction Ref</span>
                      <span className="font-mono text-gray-900 font-semibold">{pendingMonnifyRef}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Amount</span>
                      <span className="text-gray-900 font-bold">₦{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-2">
                    <button
                      onClick={handleVerifyMonnifyPayment}
                      disabled={isVerifying}
                      className="w-full bg-black hover:bg-black/90 text-white shrink-0 py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          Verifying Payment...
                        </>
                      ) : (
                        "I have completed the payment"
                      )}
                    </button>
                    <button
                      onClick={() => setPendingMonnifyRef(null)}
                      disabled={isVerifying}
                      className="w-full border border-black/10 hover:bg-gray-50 text-gray-700 shrink-0 py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel / Go Back
                    </button>
                  </div>
                </div>
              ) : (
                /* ----------------- CORE TOP UP & PROMO CODE SCREEN ----------------- */
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 id="topup-title" className="text-xl font-bold text-gray-900 tracking-tight">Top up words</h2>
                    </div>
                    <button 
                      onClick={onClose} 
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                      disabled={isCheckingOut}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          min="0"
                          max="1000000"
                          disabled={isCheckingOut}
                          className={`w-full px-4 py-2.5 bg-gray-50 border ${
                            (hasMinError || hasMaxError) ? "border-red-500" : "border-black/5"
                          } rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
                            (hasMinError || hasMaxError) ? "focus:ring-red-500/20 focus:border-red-500" : "focus:ring-black/20 focus:border-black/20"
                          } transition-all`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          words
                        </span>
                      </div>
                    </div>

                    {/* First-time User Benefit Banner (matching sample image style but in green) */}
                    {(actualPlan === "Free Trial" || actualPlan === "Free") && daysLeft > 0 && (
                      <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 space-y-2.5 text-left font-sans shadow-sm">
                        <div className="text-xs font-black text-[#166534] tracking-tight">
                          {daysLeftStr} left to top-up words at {activeCurrency === 'NGN' ? '₦50' : '$0.05'} per 1,000 words
                        </div>
                        
                        {/* Horizontal progress bar matching sample image */}
                        <div className="w-full bg-[#DCFCE7] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${progressBarPercentage}%` }} />
                        </div>
                        
                        <div className="text-[10px] text-emerald-700/90 font-bold flex items-center justify-between">
                          <span>Auto-applies at checkout</span>
                          <span className="underline cursor-pointer hover:text-[#15803D]" onClick={() => setUpgradeChoice("Plus")}>
                            Upgrade to Ikor Plus
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-1.5 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg border border-black/5">
                        {activeCurrency === 'NGN' ? '₦' : '$'}{(activeRate * 1000).toFixed(activeCurrency === 'NGN' ? 0 : 2)}/1k words
                      </span>
                      {activeRate === (activeCurrency === 'NGN' ? 0.025 : 0.000025) ? (
                        <span className="px-2 py-1.5 bg-green-500/10 text-green-700 text-[11px] font-bold rounded-lg whitespace-nowrap flex items-center gap-1">
                          <Sparkles size={11} /> Pro rate
                        </span>
                      ) : activeRate === (activeCurrency === 'NGN' ? 0.05 : 0.00005) ? (
                        <span className="px-2 py-1.5 bg-blue-500/10 text-blue-700 text-[11px] font-bold rounded-lg whitespace-nowrap flex items-center gap-1">
                          <Sparkles size={11} /> Plus rate
                        </span>
                      ) : (
                        <span className="px-2 py-1.5 bg-amber-500/10 text-amber-700 text-[11px] font-bold rounded-lg whitespace-nowrap">
                          Free Trial
                        </span>
                      )}
                    </div>
                    {hasMinError && (
                      <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                        <span>●</span> Minimum purchase is {activeCurrency === 'NGN' ? '₦300.00' : '$0.30'} (including selected plan additions).
                      </p>
                    )}
                    {hasMaxError && (
                      <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                        <span>●</span> Maximum purchase is {activeCurrency === 'NGN' ? '₦9,000.00' : '$9.00'} per checkout (including selected plan additions).
                      </p>
                    )}
                  </div>

                  {/* Show toggle for adding Ikor Plus or Pro plan depending on current state */}
                  {actualPlan === "Ikor Plus" && (
                    <div className="flex items-center justify-between gap-4 py-3 px-1 border-y border-black/5">
                      <div className="flex-1 font-sans">
                        <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          Include Ikor Pro <Sparkles size={14} className="text-amber-500" />
                        </span>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                          Unlock top-ups at {activeCurrency === 'NGN' ? '₦25' : '$0.025'}/1k words for every top up you make over the next 30 days, and access all our exclusive Pro features.
                        </p>
                      </div>
                      <button 
                        onClick={() => setUpgradeChoice(upgradeChoice === "Pro" ? "none" : "Pro")}
                        disabled={isCheckingOut}
                        className={`w-11 h-6 rounded-full p-1 transition-all shrink-0 ${upgradeChoice === "Pro" ? "bg-black" : "bg-gray-200"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${upgradeChoice === "Pro" ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  )}

                  {(actualPlan === "Free Trial" || actualPlan === "Free") && (
                    <div className="py-3 border-y border-black/5 space-y-2.5">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { 
                            id: "none" as const, 
                            title: "No Upgrade", 
                            badge: "Standard", 
                            fee: activeCurrency === 'NGN' ? "₦0" : "$0",
                            desc: activeCurrency === 'NGN' ? "₦100/1k rate" : "$0.10/1k rate"
                          },
                          { 
                            id: "Plus" as const, 
                            title: "Ikor Plus", 
                            badge: "+40,000 words", 
                            fee: activeCurrency === 'NGN' ? "₦3,000" : "$3",
                            desc: activeCurrency === 'NGN' ? "₦50/1k rate" : "$0.05/1k rate"
                          },
                          { 
                            id: "Pro" as const, 
                            title: "Ikor Pro", 
                            badge: "+120,000 words", 
                            fee: activeCurrency === 'NGN' ? "₦9,000" : "$9",
                            desc: activeCurrency === 'NGN' ? "₦25/1k rate" : "$0.025/1k rate"
                          }
                        ].map((opt) => {
                          const isSelected = upgradeChoice === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setUpgradeChoice(opt.id)}
                              disabled={isCheckingOut}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer h-[100px] ${
                                isSelected 
                                  ? "bg-black border-black text-white shadow-md shadow-black/10 scale-[1.02]" 
                                  : "bg-gray-50 border-black/5 text-gray-800 hover:bg-gray-100/70"
                              }`}
                            >
                              <div>
                                <p className={`text-[11px] font-black tracking-tight ${isSelected ? "text-white" : "text-gray-900"}`}>{opt.title}</p>
                                <p className={`text-[9px] mt-0.5 leading-tight ${isSelected ? "text-gray-300 font-semibold" : "text-gray-500 font-medium"}`}>{opt.badge}</p>
                              </div>
                              <div className="mt-2 flex items-baseline justify-between w-full">
                                <span className={`text-xs font-extrabold ${isSelected ? "text-white" : "text-gray-900"}`}>{opt.fee}</span>
                                <span className={`text-[8px] font-mono ${isSelected ? "text-gray-300" : "text-gray-400"}`}>{opt.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Breakdown Summary Box */}
                  <div className="bg-gray-50 p-5 rounded-2xl space-y-3 border border-black/5 font-sans">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Original Word Cost:</span>
                      <span className="font-semibold text-gray-700 font-mono">
                        {activeCurrency === 'NGN' ? '₦' : '$'}{baseWordsCost.toFixed(2)}
                      </span>
                    </div>

                    {upgradeChoice !== "none" && (
                      <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>{upgradeChoice === "Pro" ? "Ikor Pro" : "Ikor Plus"} subscription:</span>
                        <span className="font-semibold text-gray-700 font-mono">
                          {upgradeChoice === "Pro" 
                            ? (activeCurrency === 'NGN' ? "₦9,000.00" : "$9.00") 
                            : (activeCurrency === 'NGN' ? "₦3,000.00" : "$3.00")
                          }
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Transaction fee:</span>
                      <span className="font-semibold text-gray-700 font-mono">
                        {activeCurrency === 'NGN' ? '₦' : '$'}{transactionFee.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-gray-800 border-t border-dashed border-gray-200 pt-2 shrink-0">
                      <span>Total words:</span>
                      <span className="text-emerald-700 font-extrabold font-mono">
                        {(parsedAmount + (upgradeChoice === "Pro" ? 120000 : (upgradeChoice === "Plus" ? 40000 : 0))).toLocaleString()} words
                      </span>
                    </div>

                    <div className="h-px bg-gray-200/60 my-2" />
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-0.5">
                      <span>Total amount:</span>
                      <span className="font-mono">{activeCurrency === 'NGN' ? '₦' : '$'}{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={onClose} 
                      disabled={isCheckingOut}
                      className="flex-1 px-4 py-3 border border-black/10 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-700 transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleProceed}
                      disabled={!canProceed}
                      className={`flex-1 px-4 py-3 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
                        canProceed 
                          ? "bg-black text-white hover:bg-black/90 cursor-pointer" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isCheckingOut ? (
                        <>
                          <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          Charging...
                        </>
                      ) : (
                        "Proceed"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
