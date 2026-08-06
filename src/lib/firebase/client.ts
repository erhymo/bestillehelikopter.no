import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDEMO-not-a-real-key-placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Plain singletons — a lazy Proxy wrapper was used here before, but it wraps
// a bare `{}` object whose prototype chain never becomes `Firestore`/`Auth`,
// so SDK calls that type-check their first argument (e.g. Firestore's
// `collection()`) rejected it at runtime. `getAuth`/`getFirestore`/
// `getStorage` don't throw on a bad config — failures only surface on the
// actual network call — so eager initialization is just as safe.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

