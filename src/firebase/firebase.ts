import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

function isLikelyValidApiKey(key?: string): boolean {
  if (!key) return false;
  // Typical Firebase Web API keys start with AIza and are ~39 chars
  return key.startsWith('AIza') && key.length >= 30;
}

function hasRequiredClientConfig(): boolean {
  return Boolean(
    isLikelyValidApiKey(firebaseConfig.apiKey) &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

// Initialize Firebase
const isBrowser = typeof window !== 'undefined';

let app: ReturnType<typeof getApp> | null = null;
let auth: any = null;
let dbInternal: Firestore | null = null;
let storageInternal: FirebaseStorage | null = null;

try {
  if (hasRequiredClientConfig()) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    dbInternal = getFirestore(app);
    storageInternal = getStorage(app);
    if (isBrowser) {
      auth = getAuth(app);
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error('Error setting auth persistence:', error);
      });
    }
  } else {
    // Log diagnostics once in dev
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[Firebase] Skipping initialization due to missing/invalid config', {
        hasApiKey: Boolean(firebaseConfig.apiKey),
        apiKeyLooksValid: isLikelyValidApiKey(firebaseConfig.apiKey),
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        appIdPresent: Boolean(firebaseConfig.appId)
      });
    }
  }
} catch (err) {
  console.error('[Firebase] Initialization error:', err);
}

// Proxies provide a stable, typed export that throws if used before initialization
export const db = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!dbInternal) {
      throw new Error('[Firebase] Firestore not initialized');
    }
    // @ts-ignore
    const value = dbInternal[prop as keyof Firestore];
    return typeof value === 'function' ? (value as Function).bind(dbInternal) : value;
  }
}) as Firestore;

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop, receiver) {
    if (!storageInternal) {
      throw new Error('[Firebase] Storage not initialized');
    }
    // @ts-ignore
    const value = storageInternal[prop as keyof FirebaseStorage];
    return typeof value === 'function' ? (value as Function).bind(storageInternal) : value;
  }
}) as FirebaseStorage;

export { app, auth };
