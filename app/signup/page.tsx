"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Signup is now handled by Google OAuth on the landing page.
// Redirect to login which has the same "Continue with Google" flow.
export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, [router])

  return null
}
