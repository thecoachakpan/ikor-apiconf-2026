import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Public structure for waitlist settings
export interface SheetsConfig {
  spreadsheetId: string | null;
  webAppUrl: string | null;
  updatedAt: string;
}

// Fetch Google Sheets configuration from Firestore or local storage fallback
export const getSheetsConfig = async (): Promise<SheetsConfig | null> => {
  // First, load from localStorage for instant offline access and seamless fallback
  let localConfig: SheetsConfig | null = null;
  try {
    const saved = localStorage.getItem("sayikor_sheets_config");
    if (saved) {
      localConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Failed to read config from localStorage:", e);
  }

  try {
    const docRef = doc(db, "settings", "google_sheets");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const remoteConfig = docSnap.data() as SheetsConfig;
      // Update local cache
      try {
        localStorage.setItem("sayikor_sheets_config", JSON.stringify(remoteConfig));
      } catch (e) {}
      return remoteConfig;
    }
  } catch (e) {
    // Suppress verbose Firestore errors (such as 'client is offline') and use the local backup gracefully
    console.log("Firestore offline/unavailable, using local configuration backup.", e);
  }

  return localConfig;
};

// Save Google Sheets configuration to Firestore and local storage
export const saveSheetsConfig = async (config: Partial<SheetsConfig>) => {
  const mergedConfig: SheetsConfig = {
    spreadsheetId: config.spreadsheetId || null,
    webAppUrl: config.webAppUrl || null,
    updatedAt: new Date().toISOString()
  };

  // Always write to local storage first for offline-first reliability
  try {
    localStorage.setItem("sayikor_sheets_config", JSON.stringify(mergedConfig));
  } catch (e) {
    console.warn("Failed to write config to localStorage:", e);
  }

  // Attempt to write to Firestore in the background
  try {
    const docRef = doc(db, "settings", "google_sheets");
    await setDoc(docRef, mergedConfig, { merge: true });
  } catch (e) {
    console.warn("Firestore offline/unavailable. Configuration saved locally and will sync when online.", e);
  }
};

// Save subscriber to Firestore with graceful local fallback
export const saveSubscriberToFirestore = async (email: string, synced: boolean = false) => {
  try {
    const q = query(collection(db, "waitlist"), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      await addDoc(collection(db, "waitlist"), {
        email: email.toLowerCase(),
        submittedAt: new Date().toISOString(),
        synced: synced
      });
    } else {
      // Update existing
      const docRef = doc(db, "waitlist", querySnapshot.docs[0].id);
      await updateDoc(docRef, { synced: synced });
    }
  } catch (e) {
    console.warn("Firestore offline/unavailable. Waitlist subscriber saved locally and will retry online.", e);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Force refresh token retrieve if possible or require sign-in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenDirectly = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const createSpreadsheet = async (title: string, accessToken: string): Promise<string> => {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: { title: "Waitlist" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Email" }, userEnteredFormat: { textFormat: { bold: true } } },
                    { userEnteredValue: { stringValue: "Submitted At" }, userEnteredFormat: { textFormat: { bold: true } } },
                    { userEnteredValue: { stringValue: "Sync Date" }, userEnteredFormat: { textFormat: { bold: true } } },
                  ]
                }
              ]
            }
          ]
        }
      ]
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Spreadsheet creation failed:", errText);
    throw new Error("Failed to create spreadsheet");
  }
  const data = await res.json();
  return data.spreadsheetId;
};

export const appendRowToSpreadsheet = async (spreadsheetId: string, rowValues: string[], accessToken: string) => {
  const range = "Waitlist!A:C";
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error("Row append failed:", errText);
    throw new Error("Failed to append row to spreadsheet");
  }
  return await res.json();
};

export const checkSpreadsheetExists = async (spreadsheetId: string, accessToken: string): Promise<boolean> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

