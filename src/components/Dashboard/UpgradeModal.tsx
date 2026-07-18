import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import PaystackPop from "@paystack/inline-js";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  currency: 'NGN' | 'USD';
  planName: string;
  onUpgradeSuccess: (plan: string, priceString?: string) => void;
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  email,
  currency, 
  planName,
  onUpgradeSuccess
}: UpgradeModalProps) {
  const [activeCurrency, setActiveCurrency] = useState<'NGN' | 'USD'>(currency);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<"paystack" | "monnify">("paystack");

  // Pricing based on plan
  const price = planName === "Ikor Pro" 
    ? (activeCurrency === 'NGN' ? 9000 : 9)
    : (activeCurrency === 'NGN' ? 3000 : 3);

  // Fee calculation: 6% + N150 / $0.10
  const feePercent = 0.06;
  const fixedFee = activeCurrency === 'NGN' ? 150 : 0.10;
  const transactionFee = (price * feePercent) + fixedFee;
  const totalAmount = price + transactionFee;

  const handleUpgrade = async () => {
    setIsProcessing(true);

    if (activeCurrency === 'NGN' && paymentGateway === "monnify") {
      try {
        let monnifyApiKey = import.meta.env.VITE_MONNIFY_API_KEY || "";
        let monnifyContractCode = import.meta.env.VITE_MONNIFY_CONTRACT_CODE || "";
        let isSandboxMode = true;

        try {
          const { data, error } = await supabase.functions.invoke("get-monnify-config");
          if (data) {
            monnifyApiKey = data.apiKey || monnifyApiKey;
            monnifyContractCode = data.contractCode || monnifyContractCode;
            isSandboxMode = data.isSandbox ?? isSandboxMode;
          } else if (error) {
            console.warn("Supabase Monnify config function error, using env fallback:", error);
          }
        } catch (err) {
          console.warn("Could not invoke get-monnify-config function, using env fallback:", err);
        }

        if (!monnifyApiKey || !monnifyContractCode) {
          alert("Monnify payment configuration is missing.");
          setIsProcessing(false);
          return;
        }

        const monnifySDK = (window as any).MonnifySDK;
        if (!monnifySDK) {
          alert("Monnify SDK failed to load. Please check your internet connection.");
          setIsProcessing(false);
          return;
        }

        monnifySDK.initialize({
          amount: totalAmount,
          currency: "NGN",
          reference: "MONNIFY-" + Math.floor(1000000 + Math.random() * 9000000),
          customerName: "Ikor User",
          customerEmail: email,
          apiKey: monnifyApiKey,
          contractCode: monnifyContractCode,
          paymentDescription: `Upgrade to ${planName}`,
          isTestMode: isSandboxMode,
          onComplete: async (response: any) => {
            console.log("Monnify payment complete:", response);
            if (response && (response.paymentStatus === "PAID" || response.status === "SUCCESS")) {
              let verified = false;
              try {
                const { data, error } = await supabase.functions.invoke("verify-monnify-payment", {
                  body: { transactionReference: response.transactionReference }
                });
                if (error) {
                  console.warn("verify-monnify-payment returned error:", error);
                }
                if (data && data.verified) {
                  verified = true;
                }
              } catch (verifyErr) {
                console.warn("Failed to contact verification endpoint, falling back to client-side success:", verifyErr);
                verified = true;
              }

              if (verified) {
                setIsProcessing(false);
                setIsSuccess(true);
              } else {
                alert("Payment verification failed. Please contact support.");
                setIsProcessing(false);
              }
            } else {
              console.warn("Monnify payment not successful:", response);
              setIsProcessing(false);
            }
          },
          onClose: () => {
            console.log("Monnify checkout closed");
            setIsProcessing(false);
          }
        });
      } catch (e) {
        console.error("Monnify Checkout Error:", e);
        setIsProcessing(false);
      }
      return;
    }

    try {
      // 1. Fetch public key dynamically from Supabase config Edge Function (with local .env fallback)
      let paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
      try {
        const { data, error } = await supabase.functions.invoke("get-paystack-config");
        if (data && data.publicKey) {
          paystackKey = data.publicKey;
        } else if (error) {
          console.warn("Supabase config function error, using env fallback:", error);
        }
      } catch (err) {
        console.warn("Could not invoke get-paystack-config function, using env fallback:", err);
      }

      if (!paystackKey) {
        alert("Payment configuration missing. Please add VITE_PAYSTACK_PUBLIC_KEY to your environment variables or configure it in Supabase.");
        setIsProcessing(false);
        return;
      }

      // 2. Initialize Paystack popup
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: paystackKey,
        email: email,
        amount: Math.round(totalAmount * 100), // convert to kobo/cents
        currency: activeCurrency, // NGN or USD
        onSuccess: async (transaction: any) => {
          console.log("Paystack payment successful, reference:", transaction.reference);

          // 3. Call backend verification (fallback to direct trust if endpoint not deployed yet)
          let verified = false;
          try {
            const { data, error } = await supabase.functions.invoke("verify-paystack-payment", {
              body: { reference: transaction.reference }
            });
            if (data && data.verified) {
              verified = true;
            } else {
              console.warn("Edge function verification failed:", error || data);
            }
          } catch (verifyErr) {
            console.warn("Failed to contact verification endpoint, falling back to client-side success:", verifyErr);
            // Fallback for offline/development testing
            verified = true; 
          }

          if (verified) {
            setIsProcessing(false);
            setIsSuccess(true);
          } else {
            alert("Payment verification failed. Please contact support.");
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          console.log("Payment cancelled by user");
          setIsProcessing(false);
        }
      });
    } catch (e) {
      console.error("Paystack Checkout Error:", e);
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-[400px] rounded-[32px] p-8 border border-black/5 shadow-2xl">
            {isSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500"><Check size={32} /></div>
                <h2 className="text-xl font-bold">Upgrade Successful!</h2>
                <button onClick={() => { onUpgradeSuccess(planName, (activeCurrency === 'NGN' ? '₦' : '$') + totalAmount.toFixed(2)); onClose(); }} className="mt-6 w-full bg-black text-white py-3 rounded-xl font-bold">Done</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Upgrade to {planName}</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={20} /></button>
                </div>
                
                <div className="flex items-center bg-gray-100 p-1 rounded-xl mb-6">
                  <button onClick={() => setActiveCurrency('NGN')} className={`flex-1 py-1.5 rounded-lg ${activeCurrency === 'NGN' ? 'bg-white shadow-sm' : ''}`}>NGN</button>
                  <button onClick={() => setActiveCurrency('USD')} className={`flex-1 py-1.5 rounded-lg ${activeCurrency === 'USD' ? 'bg-white shadow-sm' : ''}`}>USD</button>
                </div>

                {/* Gateway Selector for NGN */}
                {activeCurrency === 'NGN' && (
                  <div className="mb-6 space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Select Payment Method
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentGateway("paystack")}
                        disabled={isProcessing}
                        className={`flex-1 py-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                          paymentGateway === "paystack"
                            ? "bg-black border-black text-white shadow-md shadow-black/10 scale-[1.01]"
                            : "bg-gray-50 border-black/5 text-gray-800 hover:bg-gray-100/75"
                        }`}
                      >
                        Paystack
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentGateway("monnify")}
                        disabled={isProcessing}
                        className={`flex-1 py-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                          paymentGateway === "monnify"
                            ? "bg-black border-black text-white shadow-md shadow-black/10 scale-[1.01]"
                            : "bg-gray-50 border-black/5 text-gray-800 hover:bg-gray-100/75"
                        }`}
                      >
                        Monnify
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between"><span>Plan Price:</span><span>{activeCurrency === 'NGN' ? '₦' : '$'}{price.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Transaction Fee:</span><span>{activeCurrency === 'NGN' ? '₦' : '$'}{transactionFee.toFixed(2)}</span></div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{activeCurrency === 'NGN' ? '₦' : '$'}{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                </div>

                <button onClick={handleUpgrade} disabled={isProcessing} className="w-full bg-black text-white py-3 rounded-xl font-bold">
                  {isProcessing ? "Processing..." : "Confirm Upgrade"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
