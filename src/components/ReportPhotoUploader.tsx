import React, { useState, useRef, useCallback } from "react"
import {
  ReportAttachment,
  ReportAttachmentCategory,
  ATTACHMENT_CATEGORIES,
  formatFileSize,
} from "../types/attachment"
import { compressImageFile } from "../lib/imageCompression"
import {
  CameraIcon,
  FolderIcon,
  TrashIcon,
  CloudIcon,
  WifiOffIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "./Icons"
import { getStoredAppSettings } from "../lib/settingsStorage"

interface ReportPhotoUploaderProps {
  attachments: ReportAttachment[]
  onChange?: (attachments: ReportAttachment[]) => void
  readOnly?: boolean
  maxPhotos?: number
  title?: string
  description?: string
  siteName?: string
  author?: string
  isAdmin?: boolean
}

export default function ReportPhotoUploader({
  attachments = [],
  onChange,
  readOnly = false,
  maxPhotos = 20,
  title = "Site Photos & Visual Evidence",
  description = "Attach photos of PV arrays, inverters, battery bank, damages, or general site cleanliness. Images are compressed locally and available offline.",
  siteName,
  author,
  isAdmin = false,
}: ReportPhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(
    null,
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Handle file processing & compression
  const processFiles = async (fileList: FileList | File[]) => {
    if (readOnly || !onChange) return
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    )

    if (files.length === 0) return

    if (attachments.length + files.length > maxPhotos) {
      alert(`Maximum of ${maxPhotos} photos allowed per report.`)
      return
    }

    setIsProcessing(true)
    const newAttachments: ReportAttachment[] = []
    const appSettings = getStoredAppSettings()

    // Fetch GPS coordinates if watermark with GPS is enabled
    let gpsCoords: { latitude: number; longitude: number } | null = null
    if (
      appSettings.watermarkEnabled &&
      appSettings.watermarkIncludeGps &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      try {
        gpsCoords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => resolve(null),
            { timeout: 3500, enableHighAccuracy: true },
          )
        })
      } catch (e) {
        // Fallback
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProcessingStatus(
        `Watermarking & optimizing image ${i + 1} of ${files.length} (${file.name})...`,
      )

      try {
        const compressed = await compressImageFile(file, 1440, 0.8, {
          enabled: appSettings.watermarkEnabled,
          siteName: siteName || appSettings.defaultSiteName,
          author: author || "Field Technician",
          gpsCoords,
          opacity: isAdmin
            ? appSettings.watermarkAdminOpacity
            : appSettings.watermarkStaffOpacity,
        })
        const isOffline = !navigator.onLine

        const newAtt: ReportAttachment = {
          id: compressed.id,
          name: compressed.name,
          size: compressed.size,
          originalSize: compressed.originalSize,
          type: compressed.type,
          dataUrl: compressed.dataUrl,
          url: isOffline ? undefined : undefined, // Populated upon cloud sync
          storageProvider: isOffline ? "inline" : undefined,
          caption: "",
          category: "general",
          uploadedAt: new Date().toISOString(),
          width: compressed.width,
          height: compressed.height,
          isOfflineOnly: isOffline,
        }

        newAttachments.push(newAtt)
      } catch (err) {
        console.error(`Failed to process image ${file.name}`, err)
      }
    }

    setIsProcessing(false)
    setProcessingStatus(null)

    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments])
    }
  }

  // Drag & drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!readOnly) setIsDragging(true)
    },
    [readOnly],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (readOnly) return

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [readOnly, attachments],
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = ""
    }
  }

  // Field updaters for attachments
  const handleUpdateCaption = (id: string, caption: string) => {
    if (readOnly || !onChange) return
    onChange(attachments.map((a) => (a.id === id ? { ...a, caption } : a)))
  }

  const handleUpdateCategory = (
    id: string,
    category: ReportAttachmentCategory,
  ) => {
    if (readOnly || !onChange) return
    onChange(attachments.map((a) => (a.id === id ? { ...a, category } : a)))
  }

  const handleRemoveAttachment = (id: string) => {
    if (readOnly || !onChange) return
    onChange(attachments.filter((a) => a.id !== id))
  }

  const activePhoto =
    activeLightboxIndex !== null ? attachments[activeLightboxIndex] : null

  return (
    <div className="report-photo-uploader bg-card border border-border rounded-xl p-4 md:p-6 space-y-4 shadow-sm">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-display font-bold text-foreground tracking-tight">
              {title}
            </h3>
            {attachments.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                {attachments.length}{" "}
                {attachments.length === 1 ? "Photo" : "Photos"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {!readOnly && (
          <div className="no-print flex items-center gap-2">
            {/* Mobile Camera Shutter Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Take Photo with Camera"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Take Photo</span>
            </button>

            {/* File Browser Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>Upload Photos</span>
            </button>
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Dropzone (Hidden in readOnly mode) */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`no-print border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-border-hover bg-secondary/30 hover:bg-secondary/60"
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-primary font-medium animate-pulse">
                {processingStatus || "Compressing & saving images..."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 pointer-events-none">
              <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-1.5">
                <CameraIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-foreground">
                Drop site photos here, or{" "}
                <span className="text-primary underline">
                  browse from device
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                Supports JPG, PNG, WebP • Auto-compressed for offline storage &
                fast sync
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gallery Cards Grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {attachments.map((item, idx) => {
            const currentCat =
              ATTACHMENT_CATEGORIES.find((c) => c.value === item.category) ||
              ATTACHMENT_CATEGORIES[7]
            const imgSrc = item.dataUrl || item.url || ""

            return (
              <div
                key={item.id}
                className="group relative bg-secondary/60 border border-border hover:border-border-hover rounded-xl overflow-hidden shadow-sm flex flex-col transition-all duration-200"
              >
                {/* Image Thumbnail Container */}
                <div
                  onClick={() => setActiveLightboxIndex(idx)}
                  className="relative aspect-video w-full bg-black/40 overflow-hidden cursor-zoom-in group/img"
                >
                  <img
                    src={imgSrc}
                    alt={item.caption || item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                    loading="lazy"
                  />

                  {/* Top Floating Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    {/* Category pill */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur-md shadow ${currentCat.bgColor} ${currentCat.color} ${currentCat.borderColor}`}
                    >
                      {currentCat.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Forensic Watermark Badge */}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md inline-flex items-center gap-1">
                        <ShieldCheckIcon size={10} />
                        <span>Verified</span>
                      </span>

                      {/* Sync Status Badge */}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/75 text-zinc-300 border border-white/10 backdrop-blur-md inline-flex items-center gap-1">
                        {item.url && !item.isOfflineOnly ? (
                          <>
                            <CloudIcon className="w-3 h-3 text-sky-400" /> Cloud
                          </>
                        ) : (
                          <>
                            <WifiOffIcon className="w-3 h-3 text-amber-400" />{" "}
                            Offline
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Hover Overlay with Zoom Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/75 text-white text-xs font-mono font-medium backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                      <SearchIcon className="w-3.5 h-3.5" /> Click to Inspect
                    </span>
                  </div>
                </div>

                {/* Card Body & Controls */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    {/* Category Selector (or static label in readOnly) */}
                    {!readOnly ? (
                      <div>
                        <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                          Category / Tag:
                        </label>
                        <select
                          value={item.category || "general"}
                          onChange={(e) =>
                            handleUpdateCategory(
                              item.id,
                              e.target.value as ReportAttachmentCategory,
                            )
                          }
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                        >
                          {ATTACHMENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {/* Caption Input / Display */}
                    <div>
                      {!readOnly ? (
                        <div>
                          <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                            Observation Notes / Caption:
                          </label>
                          <textarea
                            value={item.caption || ""}
                            onChange={(e) =>
                              handleUpdateCaption(item.id, e.target.value)
                            }
                            placeholder="e.g. Inverter 2 overheating error code displayed..."
                            rows={2}
                            className="w-full bg-background border border-border rounded p-2 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-primary"
                          />
                        </div>
                      ) : (
                        item.caption && (
                          <p className="text-xs text-foreground leading-relaxed bg-background/50 p-2 rounded border border-border/50">
                            {item.caption}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Metadata & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{formatFileSize(item.size)}</span>
                      {item.originalSize && item.originalSize > item.size && (
                        <span className="text-emerald-400 font-bold">
                          (-
                          {Math.round(
                            (1 - item.size / item.originalSize) * 100,
                          )}
                          %)
                        </span>
                      )}
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(item.id)}
                        className="no-print text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/60 text-center text-xs font-mono text-muted-foreground">
          No site photos attached to this report yet.
        </div>
      )}

      {/* ─── Fullscreen Lightbox Modal ────────────────────────────────────────── */}
      {activeLightboxIndex !== null && activePhoto && (
        <div
          onClick={() => setActiveLightboxIndex(null)}
          className="no-print fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-zinc-950 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 text-white">
              <div className="flex items-center gap-3">
                <SearchIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-display font-bold truncate max-w-md">
                    {activePhoto.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span>
                      Photo {activeLightboxIndex + 1} of {attachments.length}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(activePhoto.size)}</span>
                    {activePhoto.width && activePhoto.height && (
                      <>
                        <span>•</span>
                        <span>
                          {activePhoto.width} × {activePhoto.height} px
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button */}
                <a
                  href={activePhoto.dataUrl || activePhoto.url}
                  download={activePhoto.name}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveLightboxIndex(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview Area */}
            <div className="relative flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[300px] max-h-[65vh] overflow-auto">
              <img
                src={activePhoto.dataUrl || activePhoto.url}
                alt={activePhoto.caption || activePhoto.name}
                className="max-w-full max-h-[60vh] object-contain rounded-md shadow-lg"
              />

              {/* Prev / Next Navigation Arrows */}
              {attachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLightboxIndex((prev) =>
                        prev !== null
                          ? (prev - 1 + attachments.length) % attachments.length
                          : 0,
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm transition-all"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLightboxIndex((prev) =>
                        prev !== null ? (prev + 1) % attachments.length : 0,
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm transition-all"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer & Information */}
            <div className="px-5 py-3.5 bg-zinc-900 border-t border-zinc-800 text-zinc-300 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-2xl">
                {activePhoto.caption ? (
                  <p className="text-zinc-200 text-xs font-sans">
                    <strong className="text-amber-400 font-mono uppercase text-[10px] mr-1.5">
                      Caption:
                    </strong>
                    {activePhoto.caption}
                  </p>
                ) : (
                  <p className="text-zinc-500 italic font-mono text-[11px]">
                    No caption provided
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-600/40 inline-flex items-center gap-1 shadow-xs">
                  <ShieldCheckIcon size={12} />
                  <span>
                    {isAdmin
                      ? "Forensically Verified (Admin Inspection)"
                      : "Forensic Watermark Baked"}
                  </span>
                </span>
                <span className="text-zinc-400">
                  Uploaded:{" "}
                  {new Date(activePhoto.uploadedAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {activePhoto.storageProvider === "cloudflare_r2"
                    ? "Cloudflare R2"
                    : activePhoto.storageProvider === "supabase"
                      ? "Supabase Cloud"
                      : "Offline Encoded"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
