import "server-only";
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

function getApp() {
  if (getApps().length > 0) return getApps()[0];

  if (hasCredentials) {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Fallback: initialize without credentials (works with emulators via GOOGLE_APPLICATION_CREDENTIALS)
  console.warn(
    "[firebase-admin] Ingen service account-credentials funnet. " +
      "Sett FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL og FIREBASE_PRIVATE_KEY i .env.local. " +
      "Admin SDK-avhengige ruter vil feile.",
  );
  return initializeApp({ projectId: "demo-project" });
}

const app = getApp();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
export default app;

