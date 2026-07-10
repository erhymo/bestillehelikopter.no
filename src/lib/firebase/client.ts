import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDEMO-not-a-real-key-placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Lazy-initialize auth/db/storage to avoid crashing at module evaluation
// when no real API key is configured (e.g. local dev without Firebase credentials).
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    if (!_auth) _auth = getAuth(app);
    return Reflect.get(_auth, prop, receiver);
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!_db) _db = getFirestore(app);
    return Reflect.get(_db, prop, receiver);
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop, receiver) {
    if (!_storage) _storage = getStorage(app);
    return Reflect.get(_storage, prop, receiver);
  },
});

export default app;

