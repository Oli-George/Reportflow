export interface Deadline {
  id: number
  title: string
  department: string
  dueDate: string
  description?: string
  priority?: "High" | "Medium" | "Low"
  createdAt?: string
}
