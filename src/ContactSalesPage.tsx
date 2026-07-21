import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  CheckCircle2, 
  Briefcase, 
  Building2, 
  Clock, 
  Database, 
  HelpCircle, 
  Mail, 
  Sparkles, 
  Users, 
  ChevronLeft 
} from "lucide-react";
import { submitSalesForm } from "./lib/salesSync";

interface ContactSalesPageProps {
  onBackToHome: () => void;
}

export default function ContactSalesPage({ onBackToHome }: ContactSalesPageProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields State
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState("");
  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [team, setTeam] = useState("");
  const [timeline, setTimeline] = useState("");
  const [specificQuestion, setSpecificQuestion] = useState("");
  const [comments, setComments] = useState("");

  // Options Definitions
  const seatsOptions = [
    { label: "1 - 50", letter: "A" },
    { label: "51 - 250", letter: "B" },
    { label: "251 - 500", letter: "C" },
    { label: "501 - 1,000", letter: "D" },
    { label: "1,000+", letter: "E" }
  ];

  const roleOptions = [
    { label: "Executive / Founder", letter: "A" },
    { label: "Manager / Team lead", letter: "B" },
    { label: "IT / Procurement", letter: "C" },
    { label: "Individual Contributor", letter: "D" }
  ];

  const companySizeOptions = [
    { label: "1 - 50", letter: "A" },
    { label: "51 - 250", letter: "B" },
    { label: "251 - 500", letter: "C" },
    { label: "501 - 1,000", letter: "D" },
    { label: "1,000+", letter: "E" }
  ];

  const teamOptions = [
    { label: "Engineering", letter: "A" },
    { label: "Product", letter: "B" },
    { label: "GTM / Sales", letter: "C" },
    { label: "Customer Support", letter: "D" },
    { label: "Operations", letter: "E" },
    { label: "Other", letter: "F" }
  ];

  const timelineOptions = [
    { label: "This week", letter: "A" },
    { label: "Within 1 month", letter: "B" },
    { label: "Within 3 months", letter: "C" },
    { label: "Casually exploring", letter: "D" }
  ];

  const questionOptions = [
    { label: "Enterprise Pricing", letter: "A" },
    { label: "Security & Compliance", letter: "B" },
    { label: "Setup & Onboarding", letter: "C" },
    { label: "Use Case Demo", letter: "D" }
  ];

  // Validate step data
  const validateStep = (currentStep: number): boolean => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!email) {
        setValidationError("Work email is required.");
        return false;
      }
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setValidationError("Please enter a valid work email address.");
        return false;
      }
      if (!seats) {
        setValidationError("Please select the number of seats you need.");
        return false;
      }
      if (!role) {
        setValidationError("Please select your business role.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!companyName.trim()) {
        setValidationError("Company name is required.");
        return false;
      }
      if (!companyWebsite.trim()) {
        setValidationError("Company website is required.");
        return false;
      }
      if (!companySize) {
        setValidationError("Please select your company size.");
        return false;
      }
      if (!team) {
        setValidationError("Please select the team you are getting this for.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!timeline) {
        setValidationError("Please select your deployment timeline.");
        return false;
      }
      if (!specificQuestion) {
        setValidationError("Please select what specific information you'd like to know.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      await submitSalesForm({
        email,
        seats,
        role,
        companyName,
        companyWebsite,
        companySize,
        team,
        timeline,
        specificQuestion,
        comments,
      });
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error("Submission failed:", e);
      setValidationError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="contact-sales-page" className="min-h-screen bg-warm-bg pt-24 pb-20 md:pt-32">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Column: Brand Context Info */}
        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-32">
          <div className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 bg-accent-orange/10 text-accent-orange text-[11px] uppercase tracking-wider rounded-full border border-accent-orange/20 font-bold font-sans">
              Contact Sales
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              Let's talk about what your team needs.
            </h1>
            <p className="text-gray-500 text-sm sm:text-base font-semibold leading-relaxed max-w-md">
              Discover how Ikor can elevate your organization's productivity, security, and integration capabilities with custom voice dictation solutions.
            </p>
          </div>

          {/* Bullet Points with Icons */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-black/5 rounded-2xl border border-black/5 text-gray-800 shrink-0">
                <Clock size={20} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-900">Reclaim 5+ hours per week per employee</h3>
                <p className="text-xs text-gray-400 font-bold">Unleash rapid documentation and eliminate manual typing bottlenecks natively.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-black/5 rounded-2xl border border-black/5 text-gray-800 shrink-0">
                <Sparkles size={20} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-900">Deploy in a day, see ROI in week one</h3>
                <p className="text-xs text-gray-400 font-bold">Seamless onboarding and deployment support configured for your workflows.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-black/5 rounded-2xl border border-black/5 text-gray-800 shrink-0">
                <Users size={20} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-900">Create, communicate, and move faster with voice</h3>
                <p className="text-xs text-gray-400 font-bold">Enterprise-grade offline dictation designed for high compliance and zero friction.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-black/5 hidden lg:block">
            <button 
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        {/* Right Column: Multi-step Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-black/5 rounded-[32px] p-8 md:p-10 shadow-sm relative overflow-hidden">
            
            {/* Step Progress Bar */}
            {!isSuccess && (
              <div className="mb-8 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                  <span>Step {step} of 3</span>
                  <span>{step === 1 ? "Your Profile" : step === 2 ? "Company Details" : "Your Needs"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 h-1.5 w-full">
                  <div className={`rounded-full transition-all duration-300 ${step >= 1 ? "bg-black" : "bg-gray-100"}`} />
                  <div className={`rounded-full transition-all duration-300 ${step >= 2 ? "bg-black" : "bg-gray-100"}`} />
                  <div className={`rounded-full transition-all duration-300 ${step >= 3 ? "bg-black" : "bg-gray-100"}`} />
                </div>
              </div>
            )}

            {/* Form Validation Errors */}
            {validationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2 animate-fade-in">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Steps Content switcher */}
            <AnimatePresence mode="wait">
              {isSuccess ? (
                // SUCCESS STATE
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="py-12 text-center space-y-6"
                >
                  <div className="w-16 h-16 bg-[#34a853]/10 border border-[#34a853]/20 rounded-full flex items-center justify-center mx-auto text-[#34a853]">
                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                      We'll be in touch soon!
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm font-semibold max-w-md mx-auto leading-relaxed">
                      Thank you for your interest in Ikor Enterprise. A member of our enterprise team has received your request and will contact you at <span className="text-black font-extrabold">{email}</span> soon.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={onBackToHome}
                      className="inline-flex bg-black text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm cursor-pointer"
                    >
                      Return to Home
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form 
                  key="sales-form"
                  onSubmit={handleSubmit} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 text-left"
                    >
                      {/* Email Input */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Your work email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4.5 top-4 text-gray-400" size={18} />
                          <input
                            type="email"
                            required
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4.5 py-3.5 bg-neutral-50/50 border border-black/10 rounded-2xl text-base font-medium placeholder-gray-400 focus:bg-white focus:border-black focus:outline-hidden transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Enterprise Seats selection (Typeform Radio Style) */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Number of Ikor Enterprise seats you need <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {seatsOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setSeats(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                seats === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                seats === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Business Role selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Your role <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {roleOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setRole(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                role === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                role === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CTA Next Button */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-full bg-black text-white py-4 px-6 rounded-full font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                        >
                          <span>Next</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 text-left"
                    >
                      {/* Back button above form */}
                      <div>
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-black transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                          <span>Back</span>
                        </button>
                      </div>

                      {/* Company Name */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Company name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-4.5 top-4 text-gray-400" size={18} />
                          <input
                            type="text"
                            required
                            placeholder="Acme Corp"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full pl-12 pr-4.5 py-3.5 bg-neutral-50/50 border border-black/10 rounded-2xl text-base font-medium placeholder-gray-400 focus:bg-white focus:border-black focus:outline-hidden transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Company Website */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Company website <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Database className="absolute left-4.5 top-4 text-gray-400" size={18} />
                          <input
                            type="url"
                            required
                            placeholder="https://acme.com"
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            className="w-full pl-12 pr-4.5 py-3.5 bg-neutral-50/50 border border-black/10 rounded-2xl text-base font-medium placeholder-gray-400 focus:bg-white focus:border-black focus:outline-hidden transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Company Size selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          How many people work at your company? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {companySizeOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setCompanySize(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                companySize === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                companySize === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Target Team selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Which team are you getting this for? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {teamOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setTeam(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                team === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                team === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Next CTA button */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-full bg-black text-white py-4 px-6 rounded-full font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                        >
                          <span>Next</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 text-left"
                    >
                      {/* Back button above form */}
                      <div>
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-black transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                          <span>Back</span>
                        </button>
                      </div>

                      {/* Timeline selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          What is your timeline for the Enterprise plan? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {timelineOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setTimeline(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                timeline === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                timeline === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* What to know selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Is there anything specific you'd like to know? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {questionOptions.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setSpecificQuestion(opt.label)}
                              className={`flex items-center gap-4 w-full p-3.5 border rounded-2xl text-left font-medium transition-all duration-200 cursor-pointer text-sm ${
                                specificQuestion === opt.label
                                  ? "bg-black/[0.02] border-black text-black font-semibold ring-1 ring-black"
                                  : "bg-white border-black/10 hover:border-black/30 text-gray-700 hover:bg-black/[0.01]"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-bold font-mono transition-colors ${
                                specificQuestion === opt.label
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-black/10 text-gray-500"
                              }`}>
                                {opt.letter}
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Other comments
                        </label>
                        <textarea
                          placeholder="Share any other context, integration needs, or specific questions..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={4}
                          className="w-full px-4.5 py-3.5 bg-neutral-50/50 border border-black/10 rounded-2xl text-base font-medium placeholder-gray-400 focus:bg-white focus:border-black focus:outline-hidden transition-all shadow-xs resize-none"
                        />
                      </div>

                      {/* Submit CTA button */}
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-black text-white py-4 px-6 rounded-full font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <span>Submitting request...</span>
                          ) : (
                            <>
                              <span>Submit</span>
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

          </div>

          {/* Mobile Back to Home link */}
          <div className="text-center pt-4 lg:hidden">
            <button 
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
