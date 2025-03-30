"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Project } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided")
}
// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  onProjectCreated: (project: Project) => void
}

export default function CreateProjectDialog({ open, onClose, onProjectCreated }: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const audioInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File, fileName: string): Promise<string> {
    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from("media")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }

    // Generate public URL (if needed)
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);
    return publicUrl;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectName.trim()) {
      setError("Project name is required")
      return
    }

    const audioFile = audioInputRef.current?.files?.[0]
    const textFile = textInputRef.current?.files?.[0]

    if (!audioFile) {
      setError("Audio file is required")
      return
    }
    if (!textFile) {
      setError("Subtitle text file is required")
      return
    }

    setIsSubmitting(true)
    setError("")

    let audioFileName = `${projectName}-audio.${audioFile.name.split('.').pop()}`
    let textFileName = `${projectName}-text.${textFile.name.split('.').pop()}`

    const audioPublicUrl = await uploadFile(audioFile, audioFileName)
    const textPublicUrl = await uploadFile(textFile, textFileName)

    if (!audioPublicUrl || !textPublicUrl) {
      setError("Failed to upload files")
      setIsSubmitting(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append("name", projectName)
      formData.append("audioPublicUrl", audioPublicUrl)
      formData.append("textPublicUrl", textPublicUrl)

      const response = await fetch("/api/projects/create", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create project")
      }

      const data = await response.json()
      onProjectCreated(data.project)

      // Reset form
      setProjectName("")
      if (audioInputRef.current) audioInputRef.current.value = ""
      if (textInputRef.current) textInputRef.current.value = ""
    } catch (error) {
      console.error("Error creating project:", error)
      setError(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-gray-700 bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-file">Audio File</Label>
            <Input
              id="audio-file"
              type="file"
              ref={audioInputRef}
              accept="audio/*"
              className="bg-gray-700 border-gray-600 file:bg-gray-600 file:text-white file:border-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-file">Subtitle Text File</Label>
            <Input
              id="text-file"
              type="file"
              ref={textInputRef}
              accept=".txt,.srt,.vtt"
              className="bg-gray-700 border-gray-600 file:bg-gray-600 file:text-white file:border-0"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

