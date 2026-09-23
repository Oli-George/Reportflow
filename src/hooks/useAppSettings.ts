import { useState, useEffect, useCallback } from "react"
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  MiniGridSite,
  getStoredAppSettings,
  saveStoredAppSettings,
  getStoredMiniGridSites,
  saveStoredMiniGridSites,
} from "../lib/settingsStorage"

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(getStoredAppSettings)
  const [sites, setSites] = useState<MiniGridSite[]>(getStoredMiniGridSites)

  // Listen for cross-component and cross-tab settings changes
  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>
      if (customEvent.detail) {
        setSettings(customEvent.detail)
      } else {
        setSettings(getStoredAppSettings())
      }
    }

    const handleSitesChange = (e: Event) => {
      const customEvent = e as CustomEvent<MiniGridSite[]>
      if (customEvent.detail) {
        setSites(customEvent.detail)
      } else {
        setSites(getStoredMiniGridSites())
      }
    }

    window.addEventListener("reportflow_settings_changed", handleSettingsChange)
    window.addEventListener("reportflow_sites_changed", handleSitesChange)

    return () => {
      window.removeEventListener(
        "reportflow_settings_changed",
        handleSettingsChange,
      )
      window.removeEventListener("reportflow_sites_changed", handleSitesChange)
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      saveStoredAppSettings(next)
      return next
    })
  }, [])

  const addSite = useCallback((site: Omit<MiniGridSite, "id">) => {
    const newSite: MiniGridSite = {
      ...site,
      id: `site-${Date.now()}`,
    }
    setSites((prev) => {
      const next = [newSite, ...prev]
      saveStoredMiniGridSites(next)
      return next
    })
    return newSite
  }, [])

  const updateSite = useCallback(
    (id: string, updates: Partial<MiniGridSite>) => {
      setSites((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        saveStoredMiniGridSites(next)
        return next
      })
    },
    [],
  )

  const deleteSite = useCallback((id: string) => {
    setSites((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveStoredMiniGridSites(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS)
    saveStoredAppSettings(DEFAULT_APP_SETTINGS)
  }, [])

  return {
    settings,
    updateSettings,
    sites,
    addSite,
    updateSite,
    deleteSite,
    resetSettings,
  }
}
