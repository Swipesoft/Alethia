/**
 * lib/firebase.ts — Browser-only Firebase Web SDK
 *
 * ONLY import this in client components (pages, hooks, browser-side code).
 * API routes must use lib/firebase-admin.ts instead.
 */
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Plain getFirestore — no memory cache, no long polling flags.
// This is browser-only. API routes use firebase-admin.ts.
export const db      = getFirestore(app)
export const storage = getStorage(app)
export default app
