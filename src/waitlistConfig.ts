/**
 * Google waitlist background submission configuration
 * 
 * Edit this file to customize where subscriber emails are sent in the background.
 * All submissions are also stored safely in the user's browser (localStorage) as a backup.
 */

export interface WaitlistConfig {
  // Method 1: Google Form Direct Submission (Highly Recommended!)
  // This submits directly to a Google Form in the background with zero authentication needed.
  // How to set up:
  // 1. Create a Google Form with a single "Email" input.
  // 2. Click "Get pre-filled link", enter a test email, click "Get link", and copy it.
  // 3. Your link will look like: https://docs.google.com/forms/d/e/[FORM_ID]/viewform?entry.123456789=test@email.com
  // 4. Change "viewform" in the URL to "formResponse". That is your googleFormUrl.
  // 5. "entry.123456789" is your emailEntryId.
  googleFormUrl: string;
  emailEntryId: string;

  // Method 2: Google Sheets Apps Script Web App URL (Alternative)
  // Deploys a simple web app using Google Sheets Apps Script.
  // Web App URL looks like: https://script.google.com/macros/s/[SCRIPT_ID]/exec
  webAppUrl: string;

  // Active submission method: "google_form" | "web_app" | "local_only"
  activeMethod: "google_form" | "web_app" | "local_only";
}

export const DEFAULT_WAITLIST_CONFIG: WaitlistConfig = {
  // ==========================================
  // HARDCODE YOUR GOOGLE FORM DETAILS HERE:
  // (Paste your values between the quotes to make it work automatically for all users on Vercel!)
  // ==========================================
  googleFormUrl: ((import.meta as any).env?.VITE_GOOGLE_FORM_URL as string) || "https://docs.google.com/forms/d/e/1FAIpQLSfAb5Hdb-j4jYHDLSlXC4Mrj4cb7OPe5c4yep6HsvPloMFEqA/formResponse", 
  emailEntryId: ((import.meta as any).env?.VITE_EMAIL_ENTRY_ID as string) || "entry.873405453", 
  webAppUrl: ((import.meta as any).env?.VITE_WEB_APP_URL as string) || "", 
  
  // Choose your default active submission method: "google_form" | "web_app" | "local_only"
  // Changing this to "google_form" enables background Google Form submission for everyone by default!
  activeMethod: (((import.meta as any).env?.VITE_ACTIVE_METHOD as "google_form" | "web_app" | "local_only") || "google_form"), 

  // ==========================================
  // 💡 TIP FOR HOSTING ON VERCEL:
  // Instead of hardcoding, you can also add these as Environment Variables in your Vercel Dashboard:
  // - VITE_GOOGLE_FORM_URL = (your form response URL)
  // - VITE_EMAIL_ENTRY_ID = (your entry ID, e.g. entry.123456789)
  // - VITE_ACTIVE_METHOD = google_form
  // ==========================================
};
