import { createClient } from '@supabase/supabase-js'
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL and Anon Key must be provided")
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Get project from Supabase
    const { data: project, error } = await supabase
      .from("projects")
      .select("third_party_id, status, name")
      .eq("id", projectId)
      .single()

    if (error) {
      throw error
    }

    if (project.status !== "completed") {
      return NextResponse.json({ error: "Project is not completed yet" }, { status: 400 })
    }

    // Call third-party API to get the file
    const jsonString = await getRevAITranscript(project.third_party_id)

    if (!jsonString) {
      return NextResponse.json({ error: "Failed to retrieve file" }, { status: 500 })
    }

    return NextResponse.json(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${project.name}.json"`,
      },
    })
  } catch (error) {
    console.error("Error downloading project:", error)
    return NextResponse.json({ error: "Failed to download project" }, { status: 500 })
  }
}

async function getRevAITranscript(jobId: string): Promise<any> {
  const response = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}/transcript`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.REVAI_API_KEY}`,
      Accept: "application/vnd.rev.transcript.v1.0+json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get job transcript: ${error}`);
  }

  const transcriptData = await response.json();
  return transcriptData;
}