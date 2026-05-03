import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  // Tell Next.js not to bundle these — they need to run as native Node modules
  serverExternalPackages: [
    "e2b",
    "firebase-admin",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    "google-auth-library",
    "google-gax",
  ],
}

export default nextConfig
