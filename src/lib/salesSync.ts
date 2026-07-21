import { DEFAULT_SALES_CONFIG, SalesConfig } from "../salesConfig";

export interface SalesSubmission {
  email: string;
  seats: string;
  role: string;
  companyName: string;
  companyWebsite: string;
  companySize: string;
  team: string;
  timeline: string;
  specificQuestion: string;
  comments: string;
  submittedAt: string;
  synced: boolean;
  method: string;
}

// Load sales config from localStorage or defaults
export const loadSalesConfig = (): SalesConfig => {
  try {
    const saved = localStorage.getItem("sayikor_sales_settings");
    if (saved) {
      return {
        ...DEFAULT_SALES_CONFIG,
        ...JSON.parse(saved),
      };
    }
  } catch (e) {
    console.error("Failed to load sales configuration from localStorage:", e);
  }
  return DEFAULT_SALES_CONFIG;
};

// Save sales config to localStorage
export const saveSalesConfig = (config: Partial<SalesConfig>) => {
  try {
    const current = loadSalesConfig();
    const updated = { ...current, ...config };
    localStorage.setItem("sayikor_sales_settings", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save sales configuration:", e);
    throw e;
  }
};

// Get local sales submissions from localStorage
export const getLocalSalesSubmissions = (): SalesSubmission[] => {
  try {
    const saved = localStorage.getItem("sayikor_sales_submissions");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to retrieve local sales submissions:", e);
  }
  return [];
};

// Save sales submissions locally
const saveLocalSalesSubmissions = (list: SalesSubmission[]) => {
  try {
    localStorage.setItem("sayikor_sales_submissions", JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save sales submissions locally:", e);
  }
};

// Submit complete sales form payload to Google Form in the background
export const submitSalesToGoogleForm = async (
  config: SalesConfig,
  submission: Omit<SalesSubmission, "submittedAt" | "synced" | "method">
): Promise<boolean> => {
  if (!config.googleFormUrl) return false;

  try {
    let url = config.googleFormUrl.trim();
    if (url.includes("/viewform")) {
      url = url.replace("/viewform", "/formResponse");
    } else if (!url.endsWith("/formResponse")) {
      if (url.includes("/d/e/") && !url.includes("/formResponse")) {
        const base = url.split("?")[0];
        url = `${base.endsWith("/") ? base : base + "/"}formResponse`;
      }
    }

    const formData = new URLSearchParams();
    if (config.emailEntryId) formData.append(config.emailEntryId.trim(), submission.email.trim());
    if (config.seatsEntryId) formData.append(config.seatsEntryId.trim(), submission.seats.trim());
    if (config.roleEntryId) formData.append(config.roleEntryId.trim(), submission.role.trim());
    if (config.companyNameEntryId) formData.append(config.companyNameEntryId.trim(), submission.companyName.trim());
    if (config.companyWebsiteEntryId) formData.append(config.companyWebsiteEntryId.trim(), submission.companyWebsite.trim());
    if (config.companySizeEntryId) formData.append(config.companySizeEntryId.trim(), submission.companySize.trim());
    if (config.teamEntryId) formData.append(config.teamEntryId.trim(), submission.team.trim());
    if (config.timelineEntryId) formData.append(config.timelineEntryId.trim(), submission.timeline.trim());
    if (config.specificQuestionEntryId) formData.append(config.specificQuestionEntryId.trim(), submission.specificQuestion.trim());
    if (config.commentsEntryId) formData.append(config.commentsEntryId.trim(), submission.comments.trim());

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    return true;
  } catch (e) {
    console.error("Google Form sales submission failed:", e);
    return false;
  }
};

// Orchestrate the submission of a Contact Sales form entry using local storage
export const submitSalesForm = async (
  formData: Omit<SalesSubmission, "submittedAt" | "synced" | "method">
): Promise<{ synced: boolean; method: string }> => {
  const config = loadSalesConfig();
  const submittedAt = new Date().toISOString();
  let synced = false;
  let methodUsed = "local_only";

  // 1. Submit to Google Form if active and URL is set
  if (config.activeMethod === "google_form" && config.googleFormUrl) {
    synced = await submitSalesToGoogleForm(config, formData);
    methodUsed = "google_form";
  }

  // 2. Prepare the local submission
  const fullSubmission: SalesSubmission = {
    ...formData,
    submittedAt,
    synced,
    method: methodUsed,
  };

  // 3. Save locally
  const list = getLocalSalesSubmissions();
  list.unshift(fullSubmission);
  saveLocalSalesSubmissions(list);

  return { synced, method: methodUsed };
};
