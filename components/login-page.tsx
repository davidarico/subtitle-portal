"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password === "ian") {
      // Set token with expiry date (1 month)
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 1)

      const tokenData = {
        expiry: expiryDate.getTime(),
        authenticated: true,
      }

      localStorage.setItem("auth-token", JSON.stringify(tokenData))
      router.push("/projects")
    } else {
      setError("Invalid password")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border-gray-800 bg-gray-800 shadow-xl">
        <CardHeader>
          <h1 className="text-center text-3xl font-bold">
            <span className="text-pink-400">Ryan&apos;s</span> <span className="text-yellow-400">Crazy</span>{" "}
            <span className="text-green-400">Subtitle</span> <span className="text-blue-400">Emporium</span>
          </h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

