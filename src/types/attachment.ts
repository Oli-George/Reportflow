// ─── Report Attachment Types ──────────────────────────────────────────────────

export type ReportAttachmentCategory = "pv_array" | "inverter" | "battery" | "generator" | "safety" | "cleanliness" | "damage" | "general" | "other"

export type StorageProviderType = "supabase" | "cloudflare_r2" | "inline"

export interface ReportAttachment {
  id: string
  name: string
  size: number // compressed size in bytes
  originalSize?: number // uncompressed file size
  type: string // MIME type e.g. 'image/jpeg'
  dataUrl?: string // Base64 data URI for instant offline preview & fallback persistence
  url?: string // Remote CDN / public URL once synced
  storageProvider?: StorageProviderType
  storagePath?: string // Remote bucket key / path
  caption?: string
  category?: ReportAttachmentCategory
  uploadedAt: string // ISO timestamp
  width?: number
  height?: number
  isOfflineOnly?: boolean
}

export interface CategoryOption {
  value: ReportAttachmentCategory
  label: string
  color: string
  bgColor: string
  borderColor: string
}

export const ATTACHMENT_CATEGORIES: CategoryOption[] = [
  {
    value: "pv_array",
    label: "PV Array & Modules",
    color: "text-amber-400",
    bgColor: "bg-amber-950/40",
    borderColor: "border-amber-700/50",
  },
  {
    value: "inverter",
    label: "Inverter & MPPT",
    color: "text-sky-400",
    bgColor: "bg-sky-950/40",
    borderColor: "border-sky-700/50",
  },
  {
    value: "battery",
    label: "Battery & BESS",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/40",
    borderColor: "border-emerald-700/50",
  },
  {
    value: "generator",
    label: "Diesel Generator",
    color: "text-orange-400",
    bgColor: "bg-orange-950/40",
    borderColor: "border-orange-700/50",
  },
  {
    value: "safety",
    label: "Safety & PPE / Fire",
    color: "text-red-400",
    bgColor: "bg-red-950/40",
    borderColor: "border-red-700/50",
  },
  {
    value: "cleanliness",
    label: "Facility Cleanliness",
    color: "text-teal-400",
    bgColor: "bg-teal-950/40",
    borderColor: "border-teal-700/50",
  },
  {
    value: "damage",
    label: "Fault / Damage Evidence",
    color: "text-rose-400",
    bgColor: "bg-rose-950/40",
    borderColor: "border-rose-700/50",
  },
  {
    value: "general",
    label: "General Site Overview",
    color: "text-indigo-400",
    bgColor: "bg-indigo-950/40",
    borderColor: "border-indigo-700/50",
  },
  {
    value: "other",
    label: "Other / Miscellaneous",
    color: "text-zinc-400",
    bgColor: "bg-zinc-800/60",
    borderColor: "border-zinc-700/50",
  },
]

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
