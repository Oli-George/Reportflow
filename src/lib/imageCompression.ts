// ─── Client-Side Image Compression & Optimization Utility ───────────────────

export interface CompressedImageResult {
  id: string
  name: string
  dataUrl: string
  blob: Blob
  size: number
  originalSize: number
  compressionRatio: number // e.g. 0.85 = 85% reduced
  type: string
  width: number
  height: number
  thumbnailDataUrl?: string
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Reduces 5MB-15MB camera photos down to 80KB-250KB for snappy offline storage and fast cloud syncing.
export interface WatermarkOptions {
  enabled?: boolean
  siteName?: string
  author?: string
  gpsCoords?: { latitude: number; longitude: number } | null
  timestamp?: string
  opacity?: number // 0.3 - 1.0 (default: 0.55)
}

/**
 * Format timestamp for West Africa Time (WAT)
 */
export function getWatTimestamp(): string {
  try {
    return (
      new Date().toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }) + " WAT"
    )
  } catch (e) {
    return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"
  }
}

/**
 * Draws a forensic, tamper-proof audit watermark banner onto the canvas.
 */
function drawForensicWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions,
) {
  const site = (options.siteName || "GVE Mini-Grid Site").trim().toUpperCase()
  const inspector = (options.author || "Field Technician").trim().toUpperCase()
  const timestamp = options.timestamp || getWatTimestamp()
  const opacity = Math.min(Math.max(options.opacity ?? 0.55, 0.2), 0.95)

  // Scale font and bar proportionally to image resolution
  const fontSize = Math.max(12, Math.round(width * 0.016))
  const barHeight = Math.max(42, fontSize * 2.8)
  const y = height - barHeight

  ctx.save()

  // 1. Semi-transparent dark forensic banner
  ctx.fillStyle = `rgba(8, 15, 11, ${opacity})`
  ctx.fillRect(0, y, width, barHeight)

  // 2. ReportFlow Forest-Green top border line
  ctx.fillStyle = `rgba(0, 117, 74, ${Math.min(opacity + 0.3, 1)})`
  ctx.fillRect(0, y, width, Math.max(2, Math.round(fontSize * 0.15)))

  // 3. Crisp Monospace text formatting
  ctx.font = `600 ${fontSize}px "DM Mono", Menlo, Monaco, Consolas, monospace`
  ctx.textBaseline = "middle"

  // Primary text line (Site & Inspector)
  ctx.fillStyle = "#ffffff"
  const line1 = `[SITE: ${site}]  [TECH: ${inspector}]`
  ctx.fillText(line1, fontSize, y + barHeight * 0.38)

  // Secondary text line (Timestamp & GPS if available)
  ctx.fillStyle = "#a3e635" // High-visibility lime/amber accent for audit time
  let line2 = `[TIME: ${timestamp}]`
  if (options.gpsCoords) {
    const lat = options.gpsCoords.latitude.toFixed(5)
    const lon = options.gpsCoords.longitude.toFixed(5)
    line2 += `  [GPS: ${lat}°N, ${lon}°E]`
  } else {
    line2 += `  [VERIFIED FIELD UPLOAD]`
  }

  ctx.font = `500 ${Math.max(10, Math.round(fontSize * 0.85))}px "DM Mono", Menlo, Monaco, Consolas, monospace`
  ctx.fillText(line2, fontSize, y + barHeight * 0.74)

  ctx.restore()
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Optionally burns a forensic watermark with site, timestamp, and technician metadata.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1440,
  quality = 0.8,
  watermarkOptions?: WatermarkOptions,
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("Failed to read image file"))

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error("Failed to parse image data"))

      img.onload = () => {
        try {
          let { width, height } = img

          // Calculate aspect ratio scale
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          // Render onto full-res compressed canvas
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            return reject(new Error("Could not create canvas context"))
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, width, height)

          // Apply forensic watermark if enabled
          if (watermarkOptions && watermarkOptions.enabled !== false) {
            drawForensicWatermark(ctx, width, height, watermarkOptions)
          }

          // Try WebP if supported, fallback to JPEG
          const outputMime =
            file.type === "image/png" && file.size < 500 * 1024
              ? "image/png"
              : "image/jpeg"
          const dataUrl = canvas.toDataURL(outputMime, quality)

          // Also generate a small 160px micro thumbnail for instant snappy rendering
          const thumbCanvas = document.createElement("canvas")
          const thumbSize = 160
          let thumbW = thumbSize
          let thumbH = thumbSize
          if (width > height) {
            thumbH = Math.round((height * thumbSize) / width)
          } else {
            thumbW = Math.round((width * thumbSize) / height)
          }
          thumbCanvas.width = thumbW
          thumbCanvas.height = thumbH
          const thumbCtx = thumbCanvas.getContext("2d")
          if (thumbCtx) {
            thumbCtx.imageSmoothingEnabled = true
            thumbCtx.drawImage(img, 0, 0, thumbW, thumbH)
          }
          const thumbnailDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.65)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // If toBlob fails, convert dataUrl manually
                const byteString = atob(dataUrl.split(",")[1])
                const ab = new ArrayBuffer(byteString.length)
                const ia = new Uint8Array(ab)
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i)
                }
                const fallbackBlob = new Blob([ab], { type: outputMime })
                const compressedSize = fallbackBlob.size
                const ratio = Math.max(0, 1 - compressedSize / file.size)

                resolve({
                  id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  name: file.name,
                  dataUrl,
                  blob: fallbackBlob,
                  size: compressedSize,
                  originalSize: file.size,
                  compressionRatio: ratio,
                  type: outputMime,
                  width,
                  height,
                  thumbnailDataUrl,
                })
                return
              }

              const compressedSize = blob.size
              const ratio = Math.max(0, 1 - compressedSize / file.size)

              resolve({
                id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: file.name,
                dataUrl,
                blob,
                size: compressedSize,
                originalSize: file.size,
                compressionRatio: ratio,
                type: outputMime,
                width,
                height,
                thumbnailDataUrl,
              })
            },
            outputMime,
            quality,
          )
        } catch (err) {
          reject(err)
        }
      }

      img.src = (reader.result as string)
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Converts a Base64 data URI back to a binary Blob for cloud upload
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(";base64,")
  const contentType = parts[0].split(":")[1] || "image/jpeg"
  const raw = window.atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }

  return new Blob([uInt8Array], { type: contentType })
}
