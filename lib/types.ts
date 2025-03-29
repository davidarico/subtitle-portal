export interface Project {
  id: string
  name: string
  status: "pending" | "completed" | "failed"
  createdAt: string
}

