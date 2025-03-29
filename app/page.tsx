"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/login-page"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("auth-token")
    if (token) {
      router.push("/projects")
    }
  }, [router])

  return <LoginPage />
}

