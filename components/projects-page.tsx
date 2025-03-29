"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, RefreshCw, Download, Plus } from "lucide-react"
import CreateProjectDialog from "@/components/create-project-dialog"
import type { Project } from "@/lib/types"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("auth-token")
    if (!token) {
      router.push("/")
      return
    }

    try {
      const tokenData = JSON.parse(token)
      if (!tokenData.authenticated || tokenData.expiry < Date.now()) {
        localStorage.removeItem("auth-token")
        router.push("/")
        return
      }
    } catch (e) {
      localStorage.removeItem("auth-token")
      router.push("/")
      return
    }

    // Fetch projects
    fetchProjects()
  }, [router])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredProjects(filtered)
    }
  }, [searchQuery, projects])

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/projects")
      const data = await response.json()
      setProjects(data.projects || [])
      setFilteredProjects(data.projects || [])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPendingProjects = async () => {
    setIsRefreshing(true)
    try {
      const pendingIds = projects.filter((project) => project.status !== "completed").map((project) => project.id)

      if (pendingIds.length === 0) {
        return
      }

      const response = await fetch("/api/projects/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectIds: pendingIds }),
      })

      const data = await response.json()

      // Update projects with new statuses
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
            const updatedProject: Project | undefined = data.updatedProjects.find((p: Project) => p.id === project.id)
          return updatedProject ? { ...project, status: updatedProject.status } : project
        }),
      )
    } catch (error) {
      console.error("Failed to refresh projects:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const downloadProject = async (projectId: string, projectName: string) => {
    try {
      const response = await fetch("/api/projects/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: projectId }),
      })

      if (!response.ok) {
        throw new Error("Failed to download file")
      }

      const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${projectName}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download project:", error)
    }
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [...prev, newProject])
    setIsDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="mb-6 text-center text-4xl font-bold">
            <span className="text-pink-400">Ryan&apos;s</span> <span className="text-yellow-400">Crazy</span>{" "}
            <span className="text-green-400">Subtitle</span> <span className="text-blue-400">Emporium</span>
          </h1>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={refreshPendingProjects}
                disabled={isRefreshing}
                variant="outline"
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Status
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {!filteredProjects || filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">No projects found</p>
              </div>
            ) : (
              filteredProjects?.map((project) => (
                <Card key={project?.id} className="border-gray-700 bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-white">{project?.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Status:</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          project?.status === "completed"
                            ? "bg-green-900 text-green-300"
                            : project?.status === "pending"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-red-900 text-red-300"
                        }`}
                      >
                        {project?.status?.charAt(0).toUpperCase() + project?.status?.slice(1)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">Project ID: {project?.id}</p>
                  </CardContent>
                  <CardFooter>
                    {project?.status === "completed" && (
                      <Button
                        onClick={() => downloadProject(project.id, project.name)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}

