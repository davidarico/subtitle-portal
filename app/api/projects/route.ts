import { createClient } from '@supabase/supabase-js'
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // getSupabase URL and Anon Key from environment variables
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL and Anon Key must be provided")
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      projects: data.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.created_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

