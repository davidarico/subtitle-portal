import { createClient } from '@supabase/supabase-js'
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const name = formData.get("name") as string
    const audioFile = formData.get("audioFile") as File
    const textFile = formData.get("textFile") as File

    if (!name || !audioFile || !textFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Store project in Supabase
    // getSupabase URL and Anon Key from environment variables
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL and Anon Key must be provided")
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Step 1: Upload files to Supabase
    console.log("Uploading files to Supabase...")
    const audioFileName = `${name}-audio.${audioFile.name.split('.').pop()}`
    const textFileName = `${name}-text.${textFile.name.split('.').pop()}`
    const audioPublicUrl = await uploadToSupabase(audioFile, audioFileName)
    const textPublicUrl = await uploadToSupabase(textFile, textFileName)
    if (!audioPublicUrl || !textPublicUrl) {
      return NextResponse.json({ error: "Failed to upload files" }, { status: 500 })
    }

    // Step 2: Post to RevAI
    console.log("Posting to RevAI...")
    const jobId = await postToRevAI(audioPublicUrl, textPublicUrl, name)

    // Step 3: Store project in Supabase
    console.log("Storing project in Supabase...")
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        third_party_id: jobId,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      project: {
        id: data.id,
        name: data.name,
        status: data.status,
        createdAt: data.created_at,
        thirdPartyId: data.third_party_id,
      },
    })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

async function uploadToSupabase(file: File, fileName: string) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and Anon Key must be provided")
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error } = await supabase.storage
    .from("media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })
  if (error) {
    console.error("Error uploading file to Supabase:", error)
    throw new Error("Failed to upload file to Supabase")
  }

  // Generate public URL
  const publicUrl = supabase.storage
    .from("media")
    .getPublicUrl(fileName).data.publicUrl

  return publicUrl
}

async function postToRevAI(
  audioPublicUrl: string,
  textPublicUrl: string,
  name: string
): Promise<string> {
  const response = await fetch("https://api.rev.ai/alignment/v1/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REVAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_config: {
        url: audioPublicUrl,
      },
      source_transcript_config: {
        url: textPublicUrl,
      },
      metadata: name,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create job: ${error}`);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error("Job ID not found in response");
  }
  if (data.status !== "in_progress") {
    throw new Error(`Job status is not in progress: ${data.status}`);
  }
  return data.id;
}