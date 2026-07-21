import { DEFAULT_WAITLIST_CONFIG, WaitlistConfig } from "../waitlistConfig";

export interface WaitlistSubscriber {
  email: string;
  submittedAt: string;
  synced: boolean;
  method: string;
}

// Load waitlist configuration (localStorage overrides DEFAULT_WAITLIST_CONFIG)
export const loadWaitlistConfig = (): WaitlistConfig => {
  try {
    const saved = localStorage.getItem("sayikor_waitlist_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_WAITLIST_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.error("Failed to load waitlist configuration from localStorage:", e);
  }
  return DEFAULT_WAITLIST_CONFIG;
};

// Save waitlist configuration overrides to localStorage
export const saveWaitlistConfig = (config: Partial<WaitlistConfig>) => {
  try {
    const current = loadWaitlistConfig();
    const updated = { ...current, ...config };
    localStorage.setItem("sayikor_waitlist_settings", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save waitlist configuration:", e);
    throw e;
  }
};

// Get local subscriber list from localStorage
export const getLocalSubscribers = (): WaitlistSubscriber[] => {
  try {
    const saved = localStorage.getItem("sayikor_waitlist_emails");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to retrieve local waitlist subscribers:", e);
  }
  return [];
};

// Save subscriber list back to localStorage
const saveLocalSubscribers = (list: WaitlistSubscriber[]) => {
  try {
    localStorage.setItem("sayikor_waitlist_emails", JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save waitlist subscribers locally:", e);
  }
};

// Direct submission to Google Form in the background
export const submitToGoogleForm = async (
  formUrl: string,
  entryId: string,
  email: string
): Promise<boolean> => {
  if (!formUrl || !entryId) return false;

  try {
    // Standardize URL to formResponse
    let url = formUrl.trim();
    if (url.includes("/viewform")) {
      url = url.replace("/viewform", "/formResponse");
    } else if (!url.endsWith("/formResponse")) {
      // Append if it's just the base Google form ID
      if (url.includes("/d/e/") && !url.includes("/formResponse")) {
        const base = url.split("?")[0];
        url = `${base.endsWith("/") ? base : base + "/"}formResponse`;
      }
    }

    const formData = new URLSearchParams();
    formData.append(entryId.trim(), email.trim());

    // Submit using 'no-cors' so Google receives the POST successfully
    // without triggering CORS blocking alerts on client browsers.
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    return true;
  } catch (e) {
    console.error("Google Form background submission failed:", e);
    return false;
  }
};

// Direct submission to Google Sheets Apps Script Web App
export const submitToWebApp = async (
  webAppUrl: string,
  email: string,
  submittedAt: string
): Promise<boolean> => {
  if (!webAppUrl) return false;

  try {
    await fetch(webAppUrl.trim(), {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        submittedAt: submittedAt,
      }),
    });
    return true;
  } catch (e) {
    console.error("Apps Script Web App submission failed:", e);
    return false;
  }
};

// Perform submission based on configured active method
export const submitWaitlistEmail = async (email: string): Promise<{ synced: boolean; method: string }> => {
  const config = loadWaitlistConfig();
  const submittedAt = new Date().toISOString();
  let synced = false;
  let methodUsed = "local_only";

  if (config.activeMethod === "google_form" && config.googleFormUrl && config.emailEntryId) {
    synced = await submitToGoogleForm(config.googleFormUrl, config.emailEntryId, email);
    methodUsed = "google_form";
  } else if (config.activeMethod === "web_app" && config.webAppUrl) {
    synced = await submitToWebApp(config.webAppUrl, email, submittedAt);
    methodUsed = "web_app";
  }

  // Update/Save locally in browser as safety backup
  const list = getLocalSubscribers();
  const exists = list.some((item) => item.email.toLowerCase() === email.toLowerCase());

  if (!exists) {
    list.unshift({
      email: email.toLowerCase(),
      submittedAt,
      synced,
      method: methodUsed,
    });
    saveLocalSubscribers(list);
  } else {
    // If it exists, update sync status
    const updated = list.map((item) => {
      if (item.email.toLowerCase() === email.toLowerCase()) {
        return { ...item, synced: synced || item.synced, method: methodUsed };
      }
      return item;
    });
    saveLocalSubscribers(updated);
  }

  return { synced, method: methodUsed };
};

// Retry/sync an individual subscriber that failed previously
export const syncIndividualSubscriber = async (sub: WaitlistSubscriber): Promise<boolean> => {
  const config = loadWaitlistConfig();
  let synced = false;

  if (config.activeMethod === "google_form" && config.googleFormUrl && config.emailEntryId) {
    synced = await submitToGoogleForm(config.googleFormUrl, config.emailEntryId, sub.email);
  } else if (config.activeMethod === "web_app" && config.webAppUrl) {
    synced = await submitToWebApp(config.webAppUrl, sub.email, sub.submittedAt);
  }

  if (synced) {
    const list = getLocalSubscribers();
    const updated = list.map((item) => {
      if (item.email.toLowerCase() === sub.email.toLowerCase() && item.submittedAt === sub.submittedAt) {
        return { ...item, synced: true };
      }
      return item;
    });
    saveLocalSubscribers(updated);
  }

  return synced;
};
