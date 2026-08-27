import React, { useState, useRef, useMemo } from "react"
import logoImg from "./logo.jpeg"
import {
  GveQuarterlyRecordData,
  createEmptyGveQuarterlyData,
  ARRAY_KEYS_15,
  MPPT_KEYS_15,
  STRING_KEYS_15,
} from "../types/gveQuarterly"
import ReportPhotoUploader from "./ReportPhotoUploader"
import {
  getLastSiteName,
  saveLastSiteName,
  getRecentSiteNames,
} from "../lib/siteMemory"

interface GveQuarterlyFormProps {
  initialData?: GveQuarterlyRecordData
  readOnly?: boolean
  onSave?: (data: GveQuarterlyRecordData, status: "Draft" | "Submitted") => void
  onCancel?: () => void
  onChange?: (data: GveQuarterlyRecordData) => void
}

type AuditCategoryTab = "general" | "pv_outdoor" | "cables_indoor" | "mppt_inverter" | "bess" | "grid_gen" | "earthing" | "equipment_ppes" | "tools_comments"

export default function GveQuarterlyForm({
  initialData,
  readOnly = false,
  onSave,
  onCancel,
}: GveQuarterlyFormProps) {
  const [formData, setFormData] = useState<GveQuarterlyRecordData>(() => {
    if (initialData) return initialData
    const empty = createEmptyGveQuarterlyData()
    empty.siteName = getLastSiteName()
    return empty
  })

  const recentSites = useMemo(() => getRecentSiteNames(), [])

  const [activeCategory, setActiveCategory] =
    useState<AuditCategoryTab>("general")
  const [viewMode, setViewMode] = useState<"paper" | "interactive">(
    "interactive",
  )
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)
  const [activeSigField, setActiveSigField] =
    useState<"supervisor" | "operator" | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Direct Field Updaters
  const updateField = <K extends keyof GveQuarterlyRecordData,>(
    field: K,
    value: GveQuarterlyRecordData[K],
  ) => {
    if (readOnly) return
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateSubField = <K extends keyof GveQuarterlyRecordData,
  S extends keyof GveQuarterlyRecordData[K],>(
    section: K,
    subField: S,
    value: any,
  ) => {
    if (readOnly) return
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section] as any,
        [subField]: value,
      },
    }))
  }

  const updateArrayColumnValue = <K extends keyof GveQuarterlyRecordData,
  S extends keyof GveQuarterlyRecordData[K],>(
    section: K,
    subField: S,
    colKey: string,
    val: string,
  ) => {
    if (readOnly) return
    setFormData((prev) => {
      const sectionObj = prev[section] as any
      const currentSubMap = sectionObj[subField] || {}
      return {
        ...prev,
        [section]: {
          ...sectionObj,
          [subField]: {
            ...currentSubMap,
            [colKey]: val,
          },
        },
      }
    })
  }

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = "#005030"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !activeSigField) return
    const dataUrl = canvas.toDataURL("image/png")
    if (activeSigField === "supervisor") {
      updateField("supervisorSignature", dataUrl)
    } else {
      updateField("operatorSignature", dataUrl)
    }
    setActiveSigField(null)
  }

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault()
    saveLastSiteName(formData.siteName)
    if (onSave) {
      onSave(formData, "Draft")
    }
  }

  const handleSubmitFinal = (e: React.FormEvent) => {
    e.preventDefault()
    saveLastSiteName(formData.siteName)
    if (onSave) {
      onSave(formData, "Submitted")
    }
  }

  const handleTriggerPrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-4 w-full text-foreground">
      {/* Site Name Datalist */}
      <datalist id="reportflow-quarterly-sites-list">
        {recentSites.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Top Toolbar (No emojis) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-secondary/80 border border-border p-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-display font-600 uppercase tracking-wider text-foreground">
            Site Quarterly Maintenance Audit Form
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-emerald-300 border border-primary/40">
            ADMIN ONLY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-background rounded-md p-1 border border-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "interactive"
                  ? "bg-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Interactive Section View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("paper")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "paper"
                  ? "bg-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Physical Sheet View
            </button>
          </div>

          {/* Export / Print */}
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border transition-all"
          >
            Export to PDF / Print Preview
          </button>

          {!readOnly && onSave && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 font-mono px-3.5 py-1.5 rounded text-xs transition-all shadow-sm"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(true)}
                className="bg-primary hover:bg-primary-hover text-foreground font-semibold font-mono px-4 py-1.5 rounded text-xs transition-all shadow"
              >
                Publish Audit
              </button>
            </div>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs transition-all font-mono"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Category Navigation Tabs for Interactive Mode */}
      {viewMode === "interactive" && (
        <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/80 text-xs font-mono">
          {[
            { id: "general" as const, label: "1. General State" },
            {
              id: "pv_outdoor" as const,
              label: "2. PV Arrays & Outdoor Switch",
            },
            {
              id: "cables_indoor" as const,
              label: "3. Cable Mgmt & Indoor Switch",
            },
            { id: "mppt_inverter" as const, label: "4. MPPT & CL Inverters" },
            { id: "bess" as const, label: "5. Battery Inverters & BESS" },
            { id: "grid_gen" as const, label: "6. Grid & Generator" },
            { id: "earthing" as const, label: "7. Earthing System" },
            { id: "equipment_ppes" as const, label: "8. Equipment & PPEs" },
            { id: "tools_comments" as const, label: "9. Tools & Remarks" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? "bg-primary text-foreground border-primary font-bold"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Mode Content */}
      {viewMode === "interactive" ? (
        <div className="bg-card border border-border rounded-lg p-5 space-y-6">
          {/* Tab 1: General State & Personnel Metadata */}
          {activeCategory === "general" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Audit Header & Personnel Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  General site details and maintenance schedule parameters
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Site Name
                  </label>
                  <input
                    type="text"
                    list="reportflow-quarterly-sites-list"
                    value={formData.siteName}
                    disabled={readOnly}
                    onChange={(e) => updateField("siteName", e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={formData.preparedBy}
                    disabled={readOnly}
                    onChange={(e) => updateField("preparedBy", e.target.value)}
                    placeholder="Audit Auditor Name"
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Approved By
                  </label>
                  <input
                    type="text"
                    value={formData.approvedBy}
                    disabled={readOnly}
                    onChange={(e) => updateField("approvedBy", e.target.value)}
                    placeholder="Approving Engineer"
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Personnel Name
                  </label>
                  <input
                    type="text"
                    value={formData.personnelName}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateField("personnelName", e.target.value)
                    }
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    disabled={readOnly}
                    onChange={(e) => updateField("designation", e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Date of Maintenance
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    disabled={readOnly}
                    onChange={(e) => updateField("date", e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
                  />
                </div>
              </div>

              {/* General State of Power Plant */}
              <div className="pt-4 border-t border-border space-y-4">
                <h4 className="text-xs font-mono font-bold uppercase text-emerald-400">
                  General State of Power Plant
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      State of illumination / light fittings
                    </label>
                    <textarea
                      rows={2}
                      value={formData.generalState.illuminationLightFittings}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSubField(
                          "generalState",
                          "illuminationLightFittings",
                          e.target.value,
                        )
                      }
                      className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Cleanliness of surroundings
                    </label>
                    <textarea
                      rows={2}
                      value={formData.generalState.cleanlinessSurroundings}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSubField(
                          "generalState",
                          "cleanlinessSurroundings",
                          e.target.value,
                        )
                      }
                      className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      State of perimeter fence
                    </label>
                    <textarea
                      rows={2}
                      value={formData.generalState.statePerimeterFence}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSubField(
                          "generalState",
                          "statePerimeterFence",
                          e.target.value,
                        )
                      }
                      className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Cleanliness of powerhouse
                    </label>
                    <textarea
                      rows={2}
                      value={formData.generalState.cleanlinessPowerHouse}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSubField(
                          "generalState",
                          "cleanlinessPowerHouse",
                          e.target.value,
                        )
                      }
                      className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-secondary/40 p-4 rounded-lg border border-border flex flex-col gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">
                    Supervisor Sign-off
                  </span>
                  <div className="flex items-center justify-between">
                    {formData.supervisorSignature ? (
                      <img
                        src={formData.supervisorSignature}
                        alt="Supervisor Signature"
                        className="h-8 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        No signature attached
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setActiveSigField("supervisor")}
                        className="text-xs font-mono bg-primary text-foreground px-3 py-1 rounded"
                      >
                        Sign Pad
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-secondary/40 p-4 rounded-lg border border-border flex flex-col gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">
                    Operator Sign-off
                  </span>
                  <div className="flex items-center justify-between">
                    {formData.operatorSignature ? (
                      <img
                        src={formData.operatorSignature}
                        alt="Operator Signature"
                        className="h-8 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        No signature attached
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setActiveSigField("operator")}
                        className="text-xs font-mono bg-primary text-foreground px-3 py-1 rounded"
                      >
                        Sign Pad
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: PV Arrays & Outdoor Switchgear */}
          {activeCategory === "pv_outdoor" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  PV Arrays & Outdoor Switchgear Inspection (Array 1 – 15)
                </h3>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-border">Parameter</th>
                      {ARRAY_KEYS_15.slice(0, 8).map((k) => (
                        <th
                          key={k}
                          className="p-2 border-b border-border text-center"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {[
                      { key: "pvModuleRating", label: "Module Rating" },
                      { key: "numberOfPvPerArray", label: "PV / Array" },
                      { key: "alignmentOfPvs", label: "PV Alignment" },
                      { key: "measuredVoc", label: "Measured Voc" },
                      { key: "expectedVoc", label: "Expected Voc" },
                      {
                        key: "measuredVmpBreakerInput",
                        label: "Vmp Breaker Input",
                      },
                      { key: "measuredImp", label: "Measured Imp" },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td className="p-2 font-bold text-foreground bg-secondary/30">
                          {label}
                        </td>
                        {ARRAY_KEYS_15.slice(0, 8).map((colKey) => (
                          <td key={colKey} className="p-1">
                            <input
                              type="text"
                              value={
                                (formData.pvArrays as any)[key]?.[colKey] || ""
                              }
                              disabled={readOnly}
                              onChange={(e) =>
                                updateArrayColumnValue(
                                  "pvArrays",
                                  key as any,
                                  colKey,
                                  e.target.value,
                                )
                              }
                              className="w-full text-center bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Cable Management & Indoor Switchgear */}
          {activeCategory === "cables_indoor" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Cable Management & Indoor Switchgear (Array 1 – 15)
                </h3>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-border">
                        Indoor Switchgear Item
                      </th>
                      {ARRAY_KEYS_15.slice(0, 8).map((k) => (
                        <th
                          key={k}
                          className="p-2 border-b border-border text-center"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {[
                      { key: "connectedToEquipment", label: "Connected To" },
                      { key: "dcSurgeCondition", label: "DC Surge" },
                      { key: "breakerCondition", label: "Breaker Status" },
                      { key: "fusesCondition", label: "Fuses Condition" },
                      { key: "cableTermination", label: "Cable Termination" },
                      { key: "cableManagement", label: "Cable Management" },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td className="p-2 font-bold text-foreground bg-secondary/30">
                          {label}
                        </td>
                        {ARRAY_KEYS_15.slice(0, 8).map((colKey) => (
                          <td key={colKey} className="p-1">
                            <input
                              type="text"
                              value={
                                (formData.indoorPvSwitchgear as any)[key]?.[
                                  colKey
                                ] || ""
                              }
                              disabled={readOnly}
                              onChange={(e) =>
                                updateArrayColumnValue(
                                  "indoorPvSwitchgear",
                                  key as any,
                                  colKey,
                                  e.target.value,
                                )
                              }
                              className="w-full text-center bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: MPPT & CL Inverters */}
          {activeCategory === "mppt_inverter" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  MPPT Controllers & Central/Combiner Inverters
                </h3>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-border">
                        MPPT Metric
                      </th>
                      {MPPT_KEYS_15.slice(0, 8).map((k) => (
                        <th
                          key={k}
                          className="p-2 border-b border-border text-center"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {[
                      { key: "status", label: "MPPT Status" },
                      {
                        key: "measuredPvInputVoltage",
                        label: "Input Voltage (V)",
                      },
                      {
                        key: "measuredOutputVoltage",
                        label: "Output Voltage (V)",
                      },
                      {
                        key: "measuredInputCurrent",
                        label: "Input Current (A)",
                      },
                      {
                        key: "measuredOutputCurrent",
                        label: "Output Current (A)",
                      },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td className="p-2 font-bold text-foreground bg-secondary/30">
                          {label}
                        </td>
                        {MPPT_KEYS_15.slice(0, 8).map((colKey) => (
                          <td key={colKey} className="p-1">
                            <input
                              type="text"
                              value={
                                (formData.mppt as any)[key]?.[colKey] || ""
                              }
                              disabled={readOnly}
                              onChange={(e) =>
                                updateArrayColumnValue(
                                  "mppt",
                                  key as any,
                                  colKey,
                                  e.target.value,
                                )
                              }
                              className="w-full text-center bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Battery Inverters & BESS */}
          {activeCategory === "bess" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Battery Inverter & BESS Storage Health
                </h3>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-border">
                        BESS String
                      </th>
                      {STRING_KEYS_15.slice(0, 8).map((k) => (
                        <th
                          key={k}
                          className="p-2 border-b border-border text-center"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {[
                      { key: "physicalCondition", label: "Physical Condition" },
                      { key: "voltage", label: "String Voltage" },
                      { key: "current", label: "String Current" },
                      { key: "generalTemperature", label: "Temperature" },
                      {
                        key: "batteryDisconnectSwitchgearStatus",
                        label: "Disconnect Switch",
                      },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td className="p-2 font-bold text-foreground bg-secondary/30">
                          {label}
                        </td>
                        {STRING_KEYS_15.slice(0, 8).map((colKey) => (
                          <td key={colKey} className="p-1">
                            <input
                              type="text"
                              value={
                                (formData.bess as any)[key]?.[colKey] || ""
                              }
                              disabled={readOnly}
                              onChange={(e) =>
                                updateArrayColumnValue(
                                  "bess",
                                  key as any,
                                  colKey,
                                  e.target.value,
                                )
                              }
                              className="w-full text-center bg-background border border-border rounded px-1 py-0.5 text-xs text-foreground"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: Grid Distribution & Diesel Generator */}
          {activeCategory === "grid_gen" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Grid Phase Distribution & Diesel Generator
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    Diesel Generator 1 & 2
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-muted-foreground">
                        Generator Remark / Status
                      </label>
                      <input
                        type="text"
                        value={formData.dieselGenerator.remark}
                        disabled={readOnly}
                        onChange={(e) =>
                          updateSubField(
                            "dieselGenerator",
                            "remark",
                            e.target.value,
                          )
                        }
                        className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground">
                        DG 1 Diesel Level
                      </label>
                      <input
                        type="text"
                        value={
                          formData.dieselGenerator.dieselLevel["DG 1"] || ""
                        }
                        disabled={readOnly}
                        onChange={(e) =>
                          updateArrayColumnValue(
                            "dieselGenerator",
                            "dieselLevel",
                            "DG 1",
                            e.target.value,
                          )
                        }
                        className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    Grid & Generator Comments
                  </h4>
                  <textarea
                    rows={4}
                    value={formData.otherCommentGridLineAndGenerator}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateField(
                        "otherCommentGridLineAndGenerator",
                        e.target.value,
                      )
                    }
                    className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Earthing System */}
          {activeCategory === "earthing" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Earthing Resistance Test Results (Ohms)
                </h3>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-secondary text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-border">
                        Item / Equipment
                      </th>
                      <th className="p-2 border-b border-border">
                        Earth Resistance Value
                      </th>
                      <th className="p-2 border-b border-border">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {formData.earthingSystem.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2 font-bold text-foreground">
                          {item.itemEquipment}
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={item.values}
                            disabled={readOnly}
                            onChange={(e) => {
                              const updated = [...formData.earthingSystem]
                              updated[idx].values = e.target.value
                              updateField("earthingSystem", updated)
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={item.remark}
                            disabled={readOnly}
                            onChange={(e) => {
                              const updated = [...formData.earthingSystem]
                              updated[idx].remark = e.target.value
                              updateField("earthingSystem", updated)
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 8: Equipment Maintenance & PPEs */}
          {activeCategory === "equipment_ppes" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Safety PPE Inventory & Equipment Maintenance Status
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PPE List */}
                <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    Available PPEs
                  </h4>
                  <div className="space-y-2">
                    {formData.ppesList.map((ppe, idx) => (
                      <div
                        key={ppe.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-bold text-foreground w-1/3 truncate">
                          {ppe.name}
                        </span>
                        <input
                          type="text"
                          value={ppe.condition}
                          disabled={readOnly}
                          onChange={(e) => {
                            const updated = [...formData.ppesList]
                            updated[idx].condition = e.target.value
                            updateField("ppesList", updated)
                          }}
                          className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground w-1/4"
                        />
                        <input
                          type="text"
                          value={ppe.remark}
                          disabled={readOnly}
                          onChange={(e) => {
                            const updated = [...formData.ppesList]
                            updated[idx].remark = e.target.value
                            updateField("ppesList", updated)
                          }}
                          className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground w-1/3"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipment Maintenance */}
                <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    Equipment Maintenance
                  </h4>
                  <div className="space-y-2">
                    {formData.equipmentMaintenance
                      .slice(0, 4)
                      .map((eq, idx) => (
                        <div
                          key={eq.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-bold text-foreground w-1/3 truncate">
                            {eq.name}
                          </span>
                          <input
                            type="text"
                            value={eq.status}
                            disabled={readOnly}
                            onChange={(e) => {
                              const updated = [...formData.equipmentMaintenance]
                              updated[idx].status = e.target.value
                              updateField("equipmentMaintenance", updated)
                            }}
                            className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground w-1/4"
                          />
                          <input
                            type="text"
                            value={eq.remarks}
                            disabled={readOnly}
                            onChange={(e) => {
                              const updated = [...formData.equipmentMaintenance]
                              updated[idx].remarks = e.target.value
                              updateField("equipmentMaintenance", updated)
                            }}
                            className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground w-1/3"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 9: Tools & Final Audit Remarks */}
          {activeCategory === "tools_comments" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                  Tools Inventory & Comprehensive Audit Remarks
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-mono">
                    Comment on Operators
                  </label>
                  <textarea
                    rows={3}
                    value={formData.commentOnOperators}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateField("commentOnOperators", e.target.value)
                    }
                    className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-mono">
                    Comment on Security Personnel
                  </label>
                  <textarea
                    rows={3}
                    value={formData.commentOnSecurityPersonnel}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateField("commentOnSecurityPersonnel", e.target.value)
                    }
                    className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase text-emerald-400">
                  General Executive Remark
                </label>
                <textarea
                  rows={4}
                  value={formData.generalRemark}
                  disabled={readOnly}
                  onChange={(e) => updateField("generalRemark", e.target.value)}
                  className="w-full bg-secondary border border-border rounded p-3 text-xs text-foreground mt-1"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Physical Paper Sheet View (1:1 replica of SITE QUARTERLY MAINTENANCE TEMPLATE.pdf) */
        <div className="print-area paper-sheet p-6 rounded-lg overflow-x-auto border border-zinc-400 bg-white text-black font-sans">
          {/* Header with Logo on TOP LEFT */}
          <div className="flex items-stretch border-2 border-black mb-1">
            <div className="w-48 p-2 border-r-2 border-black flex flex-col justify-center items-center text-center shrink-0 bg-white">
              <img
                src={logoImg}
                alt="GVE Logo"
                className="max-h-12 max-w-full object-contain"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center py-2 bg-white">
              <h1 className="text-base font-extrabold text-black uppercase tracking-wider">
                SITE QUARTERLY MAINTENANCE TEMPLATE
              </h1>
            </div>
          </div>

          {/* Metadata Block */}
          <div className="border-2 border-black text-[10px] font-bold mb-3 divide-y divide-black text-black">
            <div className="grid grid-cols-2 divide-x divide-black p-1.5">
              <div>
                PREPARED BY: {formData.preparedBy || "ILECHUKWU CLEMENT"}
              </div>
              <div>DATE: {formData.preparedByDate}</div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-black p-1.5">
              <div>APPROVED BY: {formData.approvedBy || "IFEANYI ORAJAKA"}</div>
              <div>DATE: {formData.approvedByDate}</div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-black p-1.5 bg-zinc-100">
              <div>PERSONNEL: {formData.personnelName}</div>
              <div>DESIGNATION: {formData.designation}</div>
              <div>DATE: {formData.date}</div>
            </div>
          </div>

          {/* Section: General State */}
          <div className="border-2 border-black mb-3">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              GENERAL STATE OF POWER PLANT
            </div>
            <div className="p-2 space-y-2 text-[10px] text-black">
              <p>
                <strong>Illumination / Light Fittings:</strong>{" "}
                {formData.generalState.illuminationLightFittings}
              </p>
              <p>
                <strong>Cleanliness of Surroundings:</strong>{" "}
                {formData.generalState.cleanlinessSurroundings}
              </p>
              <p>
                <strong>State of Perimeter Fence:</strong>{" "}
                {formData.generalState.statePerimeterFence}
              </p>
              <p>
                <strong>Cleanliness of Power House:</strong>{" "}
                {formData.generalState.cleanlinessPowerHouse}
              </p>
            </div>
          </div>

          {/* Section: Earthing System Summary */}
          <div className="border-2 border-black mb-3">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              EARTHING SYSTEM RESISTANCE SUMMARY
            </div>
            <div className="p-2 grid grid-cols-3 gap-2 text-[10px] text-black">
              {formData.earthingSystem.map((e) => (
                <div
                  key={e.id}
                  className="border border-zinc-400 p-1 bg-zinc-50"
                >
                  <span className="font-bold block">{e.itemEquipment}</span>
                  <span>
                    {e.values} - {e.remark}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 border-2 border-black p-3 text-[10px] font-bold text-black">
            <div>
              <p>Supervisor Signature & Date:</p>
              {formData.supervisorSignature ? (
                <img
                  src={formData.supervisorSignature}
                  alt="Supervisor Signature"
                  className="h-6 mt-1 object-contain"
                />
              ) : (
                <span className="text-zinc-400 italic">Not signed</span>
              )}
            </div>
            <div>
              <p>Operator Signature & Date:</p>
              {formData.operatorSignature ? (
                <img
                  src={formData.operatorSignature}
                  alt="Operator Signature"
                  className="h-6 mt-1 object-contain"
                />
              ) : (
                <span className="text-zinc-400 italic">Not signed</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Photo & Evidence Uploader at End of Report */}
      <ReportPhotoUploader
        attachments={formData.attachments || []}
        onChange={(attachments) => updateField("attachments", attachments)}
        readOnly={readOnly}
        title="Quarterly Site Audit Photos & Visual Evidence"
        description="Attach photos for all 9 audit categories (PV, Inverters, BESS, Earthing, PPEs, Switchgear, Site condition). Works offline and auto-syncs."
      />

      {/* PDF Export & Print Modal (No emojis) */}
      {showPdfModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-950">
              <div>
                <h3 className="text-sm font-display font-bold text-foreground">
                  Live PDF Export & Physical Print Preview
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Official 1:1 format replica of Site Quarterly Maintenance
                  Template
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-primary hover:bg-primary-hover text-foreground font-bold px-4 py-2 rounded shadow"
                >
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="text-muted-foreground hover:text-foreground px-3 py-1.5"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-800 flex justify-center">
              <div className="w-full max-w-3xl scale-95 origin-top bg-white text-black p-6 rounded shadow-2xl">
                <div className="flex items-stretch border-2 border-black mb-1">
                  <div className="w-44 p-2 border-r-2 border-black flex flex-col justify-center items-center text-center shrink-0">
                    <img
                      src={logoImg}
                      alt="GVE Logo"
                      className="max-h-10 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-center py-2">
                    <h1 className="text-sm font-extrabold text-black uppercase">
                      SITE QUARTERLY MAINTENANCE TEMPLATE
                    </h1>
                  </div>
                </div>

                <div className="border-2 border-black text-[10px] font-bold mb-2 p-2 divide-y divide-black">
                  <div>SITE: {formData.siteName}</div>
                  <div>
                    PREPARED BY: {formData.preparedBy} (
                    {formData.preparedByDate})
                  </div>
                  <div>
                    APPROVED BY: {formData.approvedBy} (
                    {formData.approvedByDate})
                  </div>
                </div>

                <div className="border border-black p-2 mb-2 text-[9px]">
                  <p className="font-bold border-b border-black pb-1 mb-1">
                    GENERAL REMARK
                  </p>
                  <p>{formData.generalRemark}</p>
                </div>

                {/* Print Attached Photos Section */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-4 pt-3 border-t-2 border-black">
                    <h4 className="text-[10px] font-bold uppercase text-black mb-2">
                      ATTACHED AUDIT PHOTOS & VISUAL FINDINGS (
                      {formData.attachments.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="border border-black p-1 bg-white flex flex-col gap-1"
                        >
                          <img
                            src={att.dataUrl || att.url}
                            alt={att.caption || att.name}
                            className="w-full h-28 object-cover border border-zinc-300"
                          />
                          <div className="text-[8px] font-mono leading-tight">
                            <span className="font-bold uppercase">
                              [{att.category || "GENERAL"}]:{" "}
                            </span>
                            <span>{att.caption || att.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Canvas Modal (No emojis) */}
      {activeSigField && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-display font-bold text-foreground mb-1 font-mono uppercase">
              Digital Signature Pad (
              {activeSigField === "supervisor" ? "Supervisor" : "Operator"})
            </h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              Sign below using mouse or touchscreen to authorize audit document
            </p>
            <div className="bg-white rounded border border-zinc-400 overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-40 cursor-crosshair touch-none"
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-amber-400 hover:underline"
              >
                Clear Pad
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSigField(null)}
                  className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="bg-primary hover:bg-primary-hover text-foreground font-medium px-4 py-1.5 rounded"
                >
                  Attach Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2nd Verification Modal (No emojis) */}
      {showSubmitConfirmModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4 text-white">
            <div>
              <h3 className="text-sm font-display font-bold text-white">
                Confirm Final Publication
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                2-Step Verification Check (Admin Mode)
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to publish this Site Quarterly Maintenance
              Audit Report? Once published, it will be added to executive
              records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-3.5 py-1.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowSubmitConfirmModal(false)
                  handleSubmitFinal(e)
                }}
                className="px-4 py-1.5 rounded bg-primary text-foreground font-bold hover:bg-primary-hover shadow"
              >
                Confirm & Publish Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
