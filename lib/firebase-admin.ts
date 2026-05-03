/**
 * lib/firebase-admin.ts
 *
 * Server-only Firebase Admin SDK.
 * Import this in ALL API routes instead of lib/firebase.ts.
 *
 * Uses Google Cloud REST transport — no gRPC, no browser offline semantics,
 * no "client is offline" errors on Windows/Node.js environments.
 */

if (typeof window !== "undefined") {
  throw new Error("lib/firebase-admin must not be imported on the client — use app/actions/student instead")
}

import { getApps, initializeApp, cert, App } from "firebase-admin/app"
import { getFirestore, Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId   = process.env.FIREBASE_PROJECT_ID   ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId)   throw new Error("Missing FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID")
  if (!clientEmail) throw new Error("Missing FIREBASE_CLIENT_EMAIL")
  if (!privateKey)  throw new Error("Missing FIREBASE_PRIVATE_KEY")

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export const adminApp     = getAdminApp()
export const adminDb: Firestore = getFirestore(adminApp)
// settings() can only be called once per Firestore instance — guard against hot-reload re-evaluation
try { adminDb.settings({ ignoreUndefinedProperties: true }) } catch { /* already set */ }
export const adminStorage = getStorage(adminApp)
