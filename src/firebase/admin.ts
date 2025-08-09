import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
const apps = getApps();
function ensureInitialized(): boolean {
  const apps = getApps();
  if (apps.length) return true;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return false;
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
    storageBucket: `${projectId}.appspot.com`
  });
  return true;
}

export const adminAuth = new Proxy({}, {
  get(_target, prop) {
    if (!ensureInitialized()) {
      throw new Error('Firebase Admin not initialized: missing FIREBASE_ADMIN_* env vars');
    }
    return (getAuth() as any)[prop as any];
  }
}) as unknown as ReturnType<typeof getAuth>;

export const adminDb = new Proxy({}, {
  get(_target, prop) {
    if (!ensureInitialized()) {
      throw new Error('Firebase Admin not initialized: missing FIREBASE_ADMIN_* env vars');
    }
    return (getFirestore() as any)[prop as any];
  }
}) as unknown as ReturnType<typeof getFirestore>;