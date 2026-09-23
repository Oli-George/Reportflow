import { useState, useEffect, useRef, useCallback } from "react"
import { draftStorage, FormDraft } from "../lib/draftStorage"

export interface UseFormAutoSaveProps<T> {
  formType: "gveDaily" | "gveWeekly" | "gveQuarterly"
  author: string
  reportId?: number | null
  formData: T
  siteName?: string
  title?: string
  intervalMs?: number // Default: 10000 (10 seconds)
  enabled?: boolean
  readOnly?: boolean
}

export function useFormAutoSave<T>({
  formType,
  author,
  reportId,
  formData,
  siteName,
  title,
  intervalMs = 10000,
  enabled = true,
  readOnly = false,
}: UseFormAutoSaveProps<T>) {
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [recoveredDraft, setRecoveredDraft] = useState<FormDraft<T> | null>(
    null,
  )
  const [hasDismissedRecovery, setHasDismissedRecovery] = useState(false)

  const lastSavedSerializedRef = useRef<string>("")
  const isInitialMountRef = useRef(true)
  const formDataRef = useRef<T>(formData)
  formDataRef.current = formData

  const siteNameRef = useRef<string | undefined>(siteName)
  siteNameRef.current = siteName

  const titleRef = useRef<string | undefined>(title)
  titleRef.current = title

  // Check for existing unsubmitted draft on mount
  useEffect(() => {
    if (readOnly || !author) return

    let isSubscribed = true

    async function checkExistingDraft() {
      try {
        const draft = await draftStorage.getDraft<T>(formType, author, reportId)
        if (!isSubscribed || !draft) return

        // Compare draft data with initial formData to see if there's meaningful work saved
        const draftStr = JSON.stringify(draft.formData)
        const initialStr = JSON.stringify(formDataRef.current)

        if (draftStr !== initialStr && draft.lastSavedAt) {
          setRecoveredDraft(draft)
        }
      } catch (err) {
        console.warn("Error checking for auto-save draft:", err)
      }
    }

    checkExistingDraft()

    return () => {
      isSubscribed = false
    }
  }, [formType, author, reportId, readOnly])

  // Save current form state immediately
  const saveImmediately = useCallback(async () => {
    if (readOnly || !enabled || !author) return

    try {
      setIsSaving(true)
      const currentSerialized = JSON.stringify(formDataRef.current)
      const draftId = draftStorage.generateDraftId(formType, author, reportId)

      const draftItem: FormDraft<T> = {
        id: draftId,
        formType,
        author,
        reportId: reportId ?? null,
        siteName: siteNameRef.current,
        title: titleRef.current,
        formData: formDataRef.current,
        lastSavedAt: new Date().toISOString(),
      }

      await draftStorage.saveDraft(draftItem)
      lastSavedSerializedRef.current = currentSerialized
      setLastSavedTime(new Date())
    } catch (e) {
      console.warn("Failed auto-saving draft:", e)
    } finally {
      setIsSaving(false)
    }
  }, [formType, author, reportId, enabled, readOnly])

  // Periodic 10-second auto-save interval
  useEffect(() => {
    if (readOnly || !enabled || !author) return

    // Initialize initial serialized state
    if (isInitialMountRef.current) {
      lastSavedSerializedRef.current = JSON.stringify(formData)
      isInitialMountRef.current = false
    }

    const interval = setInterval(() => {
      const currentSerialized = JSON.stringify(formDataRef.current)
      if (currentSerialized !== lastSavedSerializedRef.current) {
        saveImmediately()
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs, enabled, readOnly, author, saveImmediately, formData])

  // Restore recovered draft
  const restoreDraft = useCallback((): T | null => {
    if (!recoveredDraft) return null
    const data = recoveredDraft.formData
    lastSavedSerializedRef.current = JSON.stringify(data)
    setLastSavedTime(new Date(recoveredDraft.lastSavedAt))
    setRecoveredDraft(null)
    setHasDismissedRecovery(true)
    return data
  }, [recoveredDraft])

  // Discard recovered draft
  const discardDraft = useCallback(async () => {
    setRecoveredDraft(null)
    setHasDismissedRecovery(true)
    await draftStorage.deleteDraft(formType, author, reportId)
  }, [formType, author, reportId])

  // Clear draft on form submit or permanent save
  const clearDraft = useCallback(async () => {
    setRecoveredDraft(null)
    setHasDismissedRecovery(true)
    await draftStorage.deleteDraft(formType, author, reportId)
  }, [formType, author, reportId])

  return {
    lastSavedTime,
    isSaving,
    recoveredDraft: hasDismissedRecovery ? null : recoveredDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
    saveImmediately,
  }
}
