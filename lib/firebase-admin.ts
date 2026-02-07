import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const app =
  getApps().length === 0
    ? initializeApp({
        credential: applicationDefault(),
        projectId: process.env.GCP_PROJECT_ID || "evently-486001",
      })
    : getApps()[0]

export const adminAuth = getAuth(app)

/** Verify Firebase ID token from Authorization header. Returns uid or null. */
export async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  try {
    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}
