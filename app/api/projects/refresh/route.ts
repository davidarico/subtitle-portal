import { createClient } from '@supabase/supabase-js'
import { stat } from 'fs'
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { projectIds } = await request.json()

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: "Invalid project IDs" }, { status: 400 })
    }

    console.log("Project IDs to refresh:", projectIds)

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL and Anon Key must be provided")
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Get projects from Supabase, where status is pending
    const { data: projects, error } = await supabase.from("projects").select("id, third_party_id").in("id", projectIds)

    if (error) {
      throw error
    }

    // Check status with third-party API
    const updatedStatuses = await Promise.all(
      projects.map(async (project) => {
        const status = await getRevAIStatus(project.third_party_id)
        return {
          id: project.id,
          status: status === 'in_progress' ? 'pending' : status
        }
      }),
    )

    // Update statuses in Supabase
    for (const { id, status } of updatedStatuses) {
      await supabase.from("projects").update({ status }).eq("id", id)
    }

    return NextResponse.json({ updatedProjects: updatedStatuses })
  } catch (error) {
    console.error("Error refreshing projects:", error)
    return NextResponse.json({ error: "Failed to refresh projects" }, { status: 500 })
  }
}

async function getRevAIStatus(jobId: string): Promise<string> {
  const response = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.REVAI_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get job status: ${error}`);
  }

  const data = await response.json();
  if (!data.status) {
    throw new Error("Job status not found in response");
  }
  return data.status;
}