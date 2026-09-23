export interface Member {
  id: number
  name: string
  role: string
  department: string
  lastReport: Date
  compliance: number
  initials: string
  color: string
  email?: string
  isAdmin?: boolean
}
