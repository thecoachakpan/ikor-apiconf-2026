/**
 * Google Sales Form background submission configuration
 * 
 * Customize where the Contact Sales submissions are sent in the background.
 * All submissions are stored in Firestore under /sales_inquiries/ and also locally in the browser as a backup.
 */

export interface SalesConfig {
  googleFormUrl: string;
  emailEntryId: string;
  seatsEntryId: string;
  roleEntryId: string;
  companyNameEntryId: string;
  companyWebsiteEntryId: string;
  companySizeEntryId: string;
  teamEntryId: string;
  timelineEntryId: string;
  specificQuestionEntryId: string;
  commentsEntryId: string;
  activeMethod: "google_form" | "local_only";
}

export const DEFAULT_SALES_CONFIG: SalesConfig = {
  // Hardcoded default values or ENV overrides
  googleFormUrl: ((import.meta as any).env?.VITE_SALES_GOOGLE_FORM_URL as string) || "https://docs.google.com/forms/d/e/1FAIpQLSel6eZ2VlCUkF69YwlebR1ND_Hh1NPhOZoSpEwtLivyPMQV5g/viewform", 
  emailEntryId: ((import.meta as any).env?.VITE_SALES_EMAIL_ENTRY_ID as string) || "entry.989203005",
  seatsEntryId: ((import.meta as any).env?.VITE_SALES_SEATS_ENTRY_ID as string) || "entry.1476722918",
  roleEntryId: ((import.meta as any).env?.VITE_SALES_ROLE_ENTRY_ID as string) || "entry.116374917",
  companyNameEntryId: ((import.meta as any).env?.VITE_SALES_COMPANY_NAME_ENTRY_ID as string) || "entry.2005620554",
  companyWebsiteEntryId: ((import.meta as any).env?.VITE_SALES_COMPANY_WEBSITE_ENTRY_ID as string) || "entry.1045781291",
  companySizeEntryId: ((import.meta as any).env?.VITE_SALES_COMPANY_SIZE_ENTRY_ID as string) || "entry.88275681",
  teamEntryId: ((import.meta as any).env?.VITE_SALES_TEAM_ENTRY_ID as string) || "entry.1085838044",
  timelineEntryId: ((import.meta as any).env?.VITE_SALES_TIMELINE_ENTRY_ID as string) || "entry.500835988",
  specificQuestionEntryId: ((import.meta as any).env?.VITE_SALES_QUESTION_ENTRY_ID as string) || "entry.901333501",
  commentsEntryId: ((import.meta as any).env?.VITE_SALES_COMMENTS_ENTRY_ID as string) || "entry.1234337936",
  
  activeMethod: (((import.meta as any).env?.VITE_SALES_ACTIVE_METHOD as "google_form" | "local_only") || "google_form"), 
};
