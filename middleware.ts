import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // This middleware doesn't actually check the token since we're doing that client-side
  // In a real application, you would validate the token here
  // This is just a placeholder for demonstration purposes
  return NextResponse.next()
}

export const config = {
  matcher: ["/projects/:path*"],
}

