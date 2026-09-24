// ─── Multi-Cloud & Storage Providers Engine ──────────────────────────────────
// Supports: Supabase Storage, Cloudflare R2, and Zero-Config Inline DB Fallback

import { supabase } from "./supabase"
import { ReportAttachment, StorageProviderType } from "../types/attachment"
import { dataUrlToBlob } from "./imageCompression"

export interface StorageUploadResult {
  url: string
  storagePath: string
  provider: StorageProviderType
}

// Configurable environment variables for Cloudflare R2
const R2_UPLOAD_URL = import.meta.env.VITE_R2_UPLOAD_URL || ""
const R2_PUBLIC_BASE_URL = import.meta.env.VITE_R2_PUBLIC_URL || ""
const DEFAULT_SUPABASE_BUCKET = "report-attachments"

/**
 * Uploads an attachment to the best available remote cloud storage:
 * 1. Cloudflare R2 (if configured in environment)
 * 2. Supabase Storage bucket 'report-attachments'
 * 3. Graceful fallback to inline Base64 dataUrl (stored directly in DB row)
 */
export async function uploadAttachmentFile(
  attachment: ReportAttachment,
  reportAuthor: string = "technician",
): Promise<StorageUploadResult> {
  if (!attachment.dataUrl) {
    if (attachment.url) {
      return {
        url: attachment.url,
        storagePath: attachment.storagePath || "",
        provider: attachment.storageProvider || "supabase",
      }
    }
    throw new Error("No image payload or dataUrl found on attachment")
  }

  const blob = dataUrlToBlob(attachment.dataUrl)
  const sanitizedAuthor = reportAuthor.toLowerCase().replace(/[^a-z0-9]/g, "_")
  const ext = attachment.type.includes("png") ? "png" : "jpg"
  const filename = `${attachment.id}.${ext}`
  const storagePath = `reports/${sanitizedAuthor}/${filename}`

  // 1. Try Cloudflare R2 if configured
  if (R2_UPLOAD_URL) {
    try {
      const r2Response = await fetch(
        `${R2_UPLOAD_URL}?key=${encodeURIComponent(storagePath)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": attachment.type,
          },
          body: blob,
        },
      )

      if (r2Response.ok) {
        const publicUrl = R2_PUBLIC_BASE_URL
          ? `${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storagePath}`
          : (await r2Response.json())?.url || ""

        if (publicUrl) {
          return {
            url: publicUrl,
            storagePath,
            provider: "cloudflare_r2",
          }
        }
      }
    } catch (r2Err) {
      console.warn(
        "Cloudflare R2 upload attempt failed, falling back to Supabase:",
        r2Err,
      )
    }
  }

  // 2. Try Supabase Storage Bucket
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DEFAULT_SUPABASE_BUCKET)
      .upload(storagePath, blob, {
        contentType: attachment.type,
        upsert: true,
      })

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from(DEFAULT_SUPABASE_BUCKET)
        .getPublicUrl(storagePath)

      if (publicUrlData && publicUrlData.publicUrl) {
        return {
          url: publicUrlData.publicUrl,
          storagePath,
          provider: "supabase",
        }
      }
    } else if (uploadError) {
      if (
        uploadError.message?.toLowerCase().includes("not found") ||
        (uploadError as any)?.statusCode === "404"
      ) {
        console.error(
          "ReportFlow Storage Warning: Bucket 'report-attachments' not found in Supabase. Please create 'report-attachments' as a public bucket in your Supabase Dashboard (Storage -> New bucket). See docs/SUPABASE_SETUP.md for instructions.",
        )
      } else {
        console.warn(
          "Supabase storage upload returned error (falling back to inline JSONB):",
          uploadError.message,
        )
      }
    }
  } catch (supabaseErr) {
    console.warn(
      "Supabase storage upload unreachable (using inline compressed fallback):",
      supabaseErr,
    )
  }

  // 3. Zero-Config Fallback: Inline Base64 Data URI
  // Because images are client-compressed to ~100KB, they can be safely stored directly in JSONB columns
  return {
    url: attachment.dataUrl,
    storagePath: "inline_data_url",
    provider: "inline",
  }
}
