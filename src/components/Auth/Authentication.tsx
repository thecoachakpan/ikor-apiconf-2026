import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Check, 
  Loader2,
  X,
  AlertCircle
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

// Import Tauri window API
import { getCurrentWindow } from "@tauri-apps/api/window";
const isTauri = !!(window as any).__TAURI_INTERNALS__;

// Beautiful centered Sayikor Logo
const SayikorLogo = () => (
  <div id="sayikor-logo-container" className="mx-auto flex items-center justify-center mb-6">
    <img 
      src="/Png-Orange-text.png" 
      alt="Sayikor Logo" 
      className="h-10 object-contain"
      referrerPolicy="no-referrer"
    />
  </div>
);

interface AuthenticationProps {
  onBack: () => void;
  onSuccess: (user: { email: string; firstName: string; lastName: string }) => void;
  initialMode?: "login" | "signup";
}

type AuthScreen = 
  | "welcome" 
  | "signup" 
  | "login" 
  | "forgot_password" 
  | "forgot_password_success" 
  | "verify_email"
  | "google_verify"
  | "microsoft_verify";

export default function Authentication({ onBack, onSuccess, initialMode = "signup" }: AuthenticationProps) {
  const [screen, setScreen] = useState<AuthScreen>("welcome");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading] = useState<"google" | "microsoft" | null>(null);
  const [resentNotice, setResentNotice] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: any;
    const checkMaximized = async () => {
      const win = getCurrentWindow();
      const max = await win.isMaximized();
      setIsMaximized(max);
    };
    checkMaximized();
    
    getCurrentWindow().onResized(() => {
      checkMaximized();
    }).then(fn => { unlisten = fn; });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Wrapper to clean error state on screen transitions
  const changeScreen = (newScreen: AuthScreen) => {
    setAuthError(null);
    setScreen(newScreen);
  };

  // Input change wrappers to auto-dismiss error state as user types
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setAuthError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setAuthError(null);
  };

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    setAuthError(null);
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    setAuthError(null);
  };

  // Set initial screen based on preferred mode trigger
  useEffect(() => {
    if (initialMode === "login") {
      changeScreen("login");
    } else {
      changeScreen("welcome");
    }
  }, [initialMode]);

  // Handle Initial Welcome Continue
  const handleWelcomeContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!email || !isEmailValid) return;

    // Always link directly to signup page with the email that is inputed
    changeScreen("signup");
  };

  // Live password validation criteria checks
  const isMinLength = password.length >= 8;
  const isNoPersonalInfo = (() => {
    if (!password) return false;
    const lowerPassword = password.toLowerCase();
    const lowerEmailHex = email ? email.split("@")[0].toLowerCase() : "";
    const lowerFirst = firstName ? firstName.toLowerCase() : "";
    const lowerLast = lastName ? lastName.toLowerCase() : "";

    // If both name or email are empty, it's safe
    if (!lowerFirst && !lowerLast && !lowerEmailHex) {
      return true;
    }

    if (lowerFirst && lowerPassword.includes(lowerFirst)) return false;
    if (lowerLast && lowerPassword.includes(lowerLast)) return false;
    if (lowerEmailHex && lowerPassword.includes(lowerEmailHex)) return false;

    return true;
  })();

  const isSignupFormValid = firstName.trim() !== "" && lastName.trim() !== "" && isMinLength && isNoPersonalInfo;

  // Handle email verification and account creation via Supabase
  const handleCreateAccount = async () => {
    if (!isSignupFormValid) return;
    setLoading(true);
    setAuthError(null);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    setLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      changeScreen("verify_email");
    }
  };

  const handleSignIn = async () => {
    if (!password) return;
    setLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);
    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      const metadata = data.user.user_metadata || {};
      onSuccess({
        email: data.user.email || email,
        firstName: metadata.first_name || "User",
        lastName: metadata.last_name || ""
      });
    }
  };

  const handleSendResetLink = async () => {
    if (!email) return;
    setLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    
    if (error) {
      setAuthError(error.message);
    } else {
      changeScreen("forgot_password_success");
    }
  };

  const handleVerifyEmailConfirm = () => {
    onSuccess({
      email,
      firstName: firstName || "User",
      lastName: lastName || ""
    });
  };

  return (
    <div className="min-h-screen w-full bg-warm-bg flex items-center justify-center p-4 selection:bg-accent-orange/30 selection:text-black relative">
      
      {/* Native Window Controls */}
      {isTauri && (
        <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-12 flex items-center justify-end px-6 gap-4 z-50 select-none">
          <button onClick={() => getCurrentWindow().minimize()} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button onClick={async () => await getCurrentWindow().toggleMaximize()} className="text-gray-400 hover:text-black transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-50">
            {isMaximized ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                <rect x="4" y="4" width="16" height="16" rx="1.5" />
              </svg>
            )}
          </button>
          <button onClick={() => getCurrentWindow().close()} className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center w-6 h-6 cursor-pointer z-50">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Container simulating a refined, high-end desktop/mobile frame */}
      <div 
        id="auth-outer-frame" 
        className="w-full max-w-[530px] bg-white rounded-[40px] shadow-[0_24px_70px_rgba(6,78,59,0.04)] border border-black/[0.03] p-8 sm:p-12 relative overflow-hidden transition-all duration-300"
      >
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: Welcome to Sayikor */}
          {screen === "welcome" && (
            <motion.div
              key="welcome-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col text-center"
            >
              <div className="absolute top-6 left-6">
                <button
                  id="auth-back-to-landing-top"
                  onClick={onBack}
                  className="w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-all cursor-pointer border border-gray-100/50"
                  aria-label="Back to landing"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </button>
              </div>

              <div className="mt-4 mb-3">
                <SayikorLogo />
              </div>

              <h1 id="auth-welcome-title" className="text-[28px] font-bold text-gray-900 tracking-tight font-sans leading-tight mb-2">
                Welcome to Sayikor
              </h1>
              <p id="auth-welcome-desc" className="text-sm text-gray-500 font-medium px-4 leading-relaxed mb-8">
                Setup your account to experience no-edit dictation.
              </p>

              {/* Email Form */}
              <form onSubmit={handleWelcomeContinue} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-[#f8f9fc] border border-gray-200/60 rounded-2xl text-[15px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black transition-all"
                  />
                  {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <p id="auth-email-error" className="text-[12px] text-red-500 font-medium mt-1.5 leading-normal">
                      Ensure that the email must be a valid email.
                    </p>
                  )}
                </div>

                <button
                  id="auth-welcome-continue"
                  type="submit"
                  disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                  className="w-full py-4 rounded-2xl bg-black disabled:opacity-65 hover:bg-black/95 text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 cursor-pointer select-none active:scale-98"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              </form>

              {/* Middle Divider */}
              <div className="relative my-7 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative bg-white px-4 text-[10px] font-bold text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
                  <span>OR</span>
                </div>
              </div>

              {/* Social Login Block */}
              <div className="grid grid-cols-2 gap-3">
                {/* Google Button - Temporarily disabled */}
                <button
                  id="auth-google-btn"
                  disabled={true} // Disabled per user request until OAuth apps are configured
                  onClick={() => {}}
                  className="w-full py-3.5 bg-white border border-gray-200/50 rounded-2xl font-semibold text-sm text-gray-700 flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed shadow-sm"
                >
                  {socialLoading === "google" ? (
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  ) : (
                    <>
                      {/* Google SVG G-Logo */}
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                        <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H1.05545V12.9655C2.53636 15.9082 5.51864 18 9 18Z" fill="#34A853"/>
                        <path d="M4.93773 10.71C4.75773 10.17 4.65545 9.59727 4.65545 9C4.65545 8.40273 4.75773 7.83 4.93773 7.29V5.03455H1.05545C0.441818 6.22636 0.09 7.57636 0.09 9C0.09 10.4236 0.441818 11.7736 1.05545 12.9655L4.93773 10.71Z" fill="#FBBC05"/>
                        <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.51864 0 2.53636 2.09182 1.05545 5.03455L4.93773 7.29C5.64545 5.16273 7.62955 3.57955 9 3.57955Z" fill="#EA4335"/>
                      </svg>
                      Google
                    </>
                  )}
                </button>

                {/* Microsoft Button - Temporarily disabled */}
                <button
                  id="auth-microsoft-btn"
                  disabled={true} // Disabled per user request until OAuth apps are configured
                  onClick={() => {}}
                  className="w-full py-3.5 bg-white border border-gray-200/50 rounded-2xl font-semibold text-sm text-gray-700 flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed shadow-sm"
                >
                  {socialLoading === "microsoft" ? (
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 23 23">
                        <rect x="0" y="0" width="10" height="10" fill="#f25022" />
                        <rect x="12" y="0" width="10" height="10" fill="#7fba00" />
                        <rect x="0" y="12" width="10" height="10" fill="#00a4ef" />
                        <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                      </svg>
                      Microsoft
                    </>
                  )}
                </button>
              </div>

              {/* Switch link */}
              <div className="text-center text-xs text-gray-400 font-semibold mt-6">
                Already have an account?{" "}
                <button 
                  id="welcome-to-login"
                  type="button"
                  onClick={() => {
                    changeScreen("login");
                  }} 
                  className="text-black hover:underline font-bold cursor-pointer"
                >
                  Log in instead
                </button>
              </div>

              {/* Agreement legal footer */}
              <div className="mt-8 text-[11px] font-medium text-gray-400 capitalize flex flex-col gap-0.5">
                <span>By continuing, you agree to the</span>
                <div className="space-x-1.5">
                  <a href="#" className="underline hover:text-gray-600 transition-colors">Terms of Service</a>
                  <span>&amp;</span>
                  <a href="#" className="underline hover:text-gray-600 transition-colors">Privacy Policy</a>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: Signup */}
          {screen === "signup" && (
            <motion.form
              key="signup-pane"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }}
              className="flex flex-col"
            >
              {/* Floating Back Arrow */}
              <div className="mb-6">
                <button
                  id="auth-signup-back"
                  type="button"
                  onClick={() => changeScreen("welcome")}
                  className="w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-all cursor-pointer border border-gray-100/50"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </button>
              </div>

              <div className="mb-4">
                <SayikorLogo />
              </div>

              <h2 id="auth-signup-title" className="text-2xl font-bold text-gray-800 text-center tracking-tight mb-6">
                Get Started with Sayikor
              </h2>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200/50 rounded-2xl text-[13px] font-semibold text-red-650 flex items-start gap-2.5 mb-6 text-left"
                >
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="flex-grow leading-normal">{authError}</span>
                  <button 
                    type="button" 
                    onClick={() => setAuthError(null)} 
                    className="text-red-400 hover:text-red-600 font-bold ml-1 cursor-pointer select-none text-base leading-none shrink-0"
                  >
                    &times;
                  </button>
                </motion.div>
              )}

              {/* Input section fields */}
              <div className="space-y-4">
                {/* Full name pair */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full name</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      id="signup-first-name"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                    />
                    <input
                      id="signup-last-name"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                  />
                </div>

                {/* Password Input with hide/show toggle */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="signup-pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                    />
                    <button
                      id="signup-pass-toggle"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Bullet guidelines */}
                  <div className="mt-3.5 space-y-2 pl-1">
                    <div className="flex items-center gap-2 text-xs">
                      {isMinLength ? (
                        <Check size={14} className="text-black font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block ml-1" />
                      )}
                      <span className={isMinLength ? "text-black/90 font-semibold" : "text-gray-400"}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {isNoPersonalInfo ? (
                        <Check size={14} className="text-black font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block ml-1" />
                      )}
                      <span className={isNoPersonalInfo ? "text-black/90 font-semibold" : "text-gray-400"}>
                        Don't include your name or email address
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create account button */}
              <div className="mt-8 space-y-4">
                <button
                  id="auth-signup-submit"
                  type="submit"
                  disabled={!isSignupFormValid || loading}
                  className="w-full py-4 bg-black disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black/95 rounded-2xl text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating account</span>
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>

                {/* Switch link */}
                <div className="text-center text-xs text-gray-400 font-semibold">
                  Already have an account?{" "}
                  <button 
                    id="signup-to-login"
                    type="button"
                    onClick={() => {
                      if (!firstName) setFirstName("User");
                      if (!lastName) setLastName("");
                      changeScreen("login");
                    }} 
                    className="text-black hover:underline font-bold cursor-pointer"
                  >
                    Log in
                  </button>
                </div>
              </div>
            </motion.form>
          )}



          {/* SCREEN 3: Welcome Back (Sign-in form) */}
          {screen === "login" && (
            <motion.form
              key="login-pane"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}
              className="flex flex-col"
            >
              {/* Back Arrow */}
              <div className="mb-4">
                <button
                  id="auth-login-back"
                  type="button"
                  onClick={() => changeScreen("welcome")}
                  className="w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-all cursor-pointer border border-gray-100/50"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Centered Sayikor Logo */}
              <div className="flex flex-col items-center text-center mt-2 mb-6">
                <SayikorLogo />
                <h2 id="auth-login-heading" className="text-2xl font-bold text-gray-800 tracking-tight">
                  Welcome Back
                </h2>
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200/50 rounded-2xl text-[13px] font-semibold text-red-650 flex items-start gap-2.5 mb-6 text-left"
                >
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="flex-grow leading-normal">{authError}</span>
                  <button 
                    type="button" 
                    onClick={() => setAuthError(null)} 
                    className="text-red-400 hover:text-red-650 font-bold ml-1 cursor-pointer select-none text-base leading-none shrink-0"
                  >
                    &times;
                  </button>
                </motion.div>
              )}

              {/* Form Input Section */}
              <div className="space-y-4 text-left">
                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                  />
                </div>

                {/* Password field and Forgot Link */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="login-pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                    />
                    <button
                      id="login-pass-toggle"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="text-right">
                    <button
                      id="login-forgot-pass-go"
                      type="button"
                      onClick={() => changeScreen("forgot_password")}
                      className="text-xs text-black font-extrabold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="mt-8 space-y-4">
                <button
                  id="auth-login-submit"
                  type="submit"
                  disabled={!password || loading}
                  className="w-full py-4 bg-black hover:bg-black/95 disabled:opacity-60 rounded-2xl text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Signing in</span>
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>

                <div className="text-center text-xs text-gray-400 font-semibold">
                  Don't have an account?{" "}
                  <button
                    id="login-to-signup"
                    type="button"
                    onClick={() => {
                      setFirstName("");
                      setLastName("");
                      changeScreen("signup");
                    }} 
                    className="text-black hover:underline font-bold cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </motion.form>
          )}

          {/* SCREEN 4: Reset Password Entry */}
          {screen === "forgot_password" && (
            <motion.form
              key="forgot-password-pane"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => { e.preventDefault(); handleSendResetLink(); }}
              className="flex flex-col text-center"
            >
              <div className="mb-4 text-left">
                <button
                  id="auth-forgot-back"
                  type="button"
                  onClick={() => changeScreen("login")}
                  className="w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-all cursor-pointer border border-gray-100/50"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </button>
              </div>

              <div className="mb-4">
                <SayikorLogo />
              </div>

              <h2 id="forgot-title" className="text-2xl font-bold text-gray-850 tracking-tight font-sans text-center mb-3">
                Reset your password
              </h2>
              <p id="forgot-subtitle" className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto font-medium mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200/50 rounded-2xl text-[13px] font-semibold text-red-650 flex items-start gap-2.5 mb-6 text-left"
                >
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="flex-grow leading-normal">{authError}</span>
                  <button 
                    type="button" 
                    onClick={() => setAuthError(null)} 
                    className="text-red-400 hover:text-red-650 font-bold ml-1 cursor-pointer select-none text-base leading-none shrink-0"
                  >
                    &times;
                  </button>
                </motion.div>
              )}

              <div className="space-y-5 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200/60 rounded-xl text-[14px] text-gray-750 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black"
                  />
                </div>

                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={!email || loading}
                  className="w-full py-4 bg-black hover:bg-black/95 disabled:opacity-60 rounded-2xl text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Send reset link
                </button>
              </div>
            </motion.form>
          )}
          {screen === "forgot_password_success" && (
            <motion.div
              key="forgot-success-pane"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col text-center"
            >
              <div className="mb-4">
                <SayikorLogo />
              </div>

              <h2 id="check-email-title" className="text-2xl font-bold text-gray-800 tracking-tight mb-4">
                Check your email
              </h2>
              <p id="check-email-subtitle" className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-8 font-medium">
                We've sent a password reset link to your email. Click the link in the email to reset your password. If you don't see the email, check your spam folder
              </p>

              <div className="space-y-4">
                <button
                  id="resend-reset-email"
                  onClick={handleSendResetLink}
                  className="w-full py-4 bg-black hover:bg-black/95 text-white font-semibold text-[15px] rounded-2xl transition-all cursor-pointer"
                >
                  Resend email
                </button>

                <div className="pt-2">
                  <button
                    id="back-to-login-forgot"
                    type="button"
                    onClick={() => changeScreen("login")}
                    className="text-xs text-black hover:underline font-bold cursor-pointer"
                  >
                    Back to Log in
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 8: Verify Your Email */}
          {screen === "verify_email" && (
            <motion.div
              key="verify-email-pane"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col text-center"
            >
              <div className="mb-4">
                <SayikorLogo />
              </div>

              <h2 id="verify-email-title" className="text-2xl font-bold text-gray-800 tracking-tight mb-4">
                Verify your email
              </h2>
              <p id="verify-email-subtitle" className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-8 font-medium">
                Please check your email for the verification link and directions. If you don't see the email, check your spam folder
              </p>

              <div className="space-y-5">
                {resentNotice && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold text-black mb-2 animate-fade-in flex items-center justify-center gap-1.5">
                    <Check size={14} className="text-green-600 font-bold" />
                    Verification link successfully resent to {email || "your address"}!
                  </div>
                )}

                <button
                  id="verify-email-btn"
                  onClick={handleVerifyEmailConfirm}
                  className="w-full py-4 bg-black hover:bg-black/95 text-white font-semibold text-[15px] rounded-2xl transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  Confirm & Go to Dashboard
                </button>

                <button
                  id="verify-email-resend"
                  onClick={() => {
                    setResentNotice(true);
                    setTimeout(() => setResentNotice(false), 3000);
                  }}
                  className="text-xs text-black font-extrabold block mx-auto hover:underline"
                >
                  Resend email
                </button>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    id="verify-back-to-landing"
                    type="button"
                    onClick={() => changeScreen("welcome")}
                    className="text-xs text-gray-400 hover:text-gray-655 font-bold transition-colors cursor-pointer"
                  >
                    Can't receive? Try other login methods
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
