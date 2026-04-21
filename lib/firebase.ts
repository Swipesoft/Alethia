import { initializeApp, getApps, getApp } from "firebase/app"
import { initializeFirestore, memoryLocalCache, getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Use in-memory cache: the app runs in Next.js API routes (Node.js) where
// IndexedDB is unavailable. The default getFirestore() enables disk-based
// offline persistence whose compaction mutex fires on concurrent writes.
export const db = (() => {
  try {
    return initializeFirestore(app, { localCache: memoryLocalCache() })
  } catch {
    // initializeFirestore throws if called twice on the same app instance
    // (e.g. hot-reload in dev). Fall back to the already-initialised instance.
    return getFirestore(app)
  }
})()

export const storage = getStorage(app)
export default app
