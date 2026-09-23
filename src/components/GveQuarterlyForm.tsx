import { useState, useMemo } from "react"

import logoImg from "./logo.jpeg"

import {
  GveQuarterlyRecordData,
  createEmptyGveQuarterlyData,
  ARRAY_KEYS_15,
  MPPT_KEYS_15,
  CL_INV_KEYS_15,
  INV_KEYS_15,
  STRING_KEYS_15,
  GRID_PHASE_KEYS,
} from "../types/gveQuarterly"

import ReportPhotoUploader from "./ReportPhotoUploader"

import {
  getLastSiteName,
  saveLastSiteName,
  getRecentSiteNames,
} from "../lib/siteMemory"

import { useFormAutoSave } from "../hooks/useFormAutoSave"

import { AlertIcon, EditIcon } from "./Icons"

interface GveQuarterlyFormProps {
  initialData?: GveQuarterlyRecordData

  readOnly?: boolean

  author?: string

  isAdmin?: boolean

  reportId?: number | null

  onSave?: (data: GveQuarterlyRecordData, status: "Draft" | "Submitted") => void

  onCancel?: () => void

  onChange?: (data: GveQuarterlyRecordData) => void
}

type AuditCategoryTab = "general" | "pv_outdoor" | "cables_indoor" | "mppt_inverter" | "bess" | "grid_gen" | "earthing" | "equipment_ppes" | "tools_comments"

export default function GveQuarterlyForm({
  initialData,

  readOnly = false,

  author,

  isAdmin = false,

  reportId,

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

  const [viewMode, setViewMode] = useState<"paper" | "interactive">("paper")

  const [activePaperPage, setActivePaperPage] = useState<number | "all">("all")

  const [showPdfModal, setShowPdfModal] = useState(false)

  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)

  const [title, setTitle] = useState(
    initialData?.title ||
      (initialData?.siteName
        ? `Quarterly Site Inspection Form — ${initialData.siteName}`
        : formData.siteName
          ? `Quarterly Site Inspection Form — ${formData.siteName}`
          : "Quarterly Site Inspection Form"),
  )

  const [titleError, setTitleError] = useState<string | null>(null)

  // Continuous 10-second IndexedDB Auto-Save

  const currentFormData: GveQuarterlyRecordData = useMemo(
    () => ({
      ...formData,

      title: title.trim(),
    }),

    [formData, title],
  )

  const {
    lastSavedTime,

    isSaving,

    recoveredDraft,

    restoreDraft,

    discardDraft,

    clearDraft,
  } = useFormAutoSave<GveQuarterlyRecordData>({
    formType: "gveQuarterly",

    author: author || "GVE Administrator",

    reportId,

    formData: currentFormData,

    siteName: formData.siteName,

    title,

    readOnly,
  })

  const handleRestoreDraft = () => {
    const restored = restoreDraft()

    if (restored) {
      setFormData(restored)

      if (restored.title) setTitle(restored.title)
    }
  }

  // Direct Field Updaters

  const updateField = <K extends keyof GveQuarterlyRecordData,>(
    field: K,

    value: GveQuarterlyRecordData[K],
  ) => {
    if (readOnly) return

    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === "siteName") {
      const sName = value as string || ""

      setTitle(
        sName
          ? `Quarterly Site Inspection Form — ${sName}`
          : "Quarterly Site Inspection Form",
      )

      if (titleError) setTitleError(null)
    }
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

  const extractSiteNameFromQuarterlyTitle = (titleText: string): string => {
    if (!titleText) return ""

    const trimmed = titleText.trim()

    if (/Quarterly Site Inspection/i.test(trimmed)) {
      const after = trimmed
        .replace(/Quarterly Site Inspection( Form)?\s*[—–\-]\s*/i, "")
        .trim()

      if (after && after !== trimmed) return after

      const before = trimmed
        .split(/Quarterly Site Inspection/i)[0]
        .trim()
        .replace(/[—–\-]\s*$/, "")
        .trim()

      if (before) return before
    }

    if (/[—–]/.test(trimmed)) {
      return trimmed.split(/[—–]/)[0].trim()
    }

    return trimmed
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)

    if (titleError) setTitleError(null)

    const extractedSite = extractSiteNameFromQuarterlyTitle(val)

    setFormData((prev) => ({ ...prev, siteName: extractedSite }))
  }

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setTitleError("Report name is required")

      return
    }

    if (formData.siteName) saveLastSiteName(formData.siteName)

    await clearDraft()

    onSave?.({ ...formData, title: title.trim() }, "Draft")
  }

  const handlePublishAudit = async () => {
    if (!title.trim()) {
      setTitleError("Report name is required")

      return
    }

    if (!formData.siteName.trim()) {
      alert("Please specify a Site Name before submitting.")

      return
    }

    if (formData.siteName) saveLastSiteName(formData.siteName)

    await clearDraft()

    onSave?.({ ...formData, title: title.trim() }, "Submitted")

    setShowSubmitConfirmModal(false)
  }

  const handleTriggerPrint = () => {
    window.print()
  }

  // Helper component for 15-column array rows in Physical Sheet View

  const render15ColRow = (
    label: string,

    colKeys: string[],

    valuesMap: { [key: string]: string } | undefined,

    onValueChange: (k: string, v: string) => void,

    readOnlyMode: boolean,
  ) => (
    <tr className="border-b border-zinc-400 hover:bg-zinc-50/50">
      <td className="p-1 border-r border-black font-semibold text-[9px] bg-zinc-50/80 leading-tight w-44 min-w-[170px] whitespace-normal">
        {label}
      </td>
      {colKeys.map((k) => (
        <td
          key={k}
          className="p-0 border-r border-dashed border-zinc-400 text-center min-w-[48px]"
        >
          <input
            type="text"
            value={valuesMap?.[k] || ""}
            disabled={readOnlyMode}
            onChange={(e) => onValueChange(k, e.target.value)}
            className="w-full h-full py-1 px-0.5 text-center text-[9px] font-mono bg-transparent border-none outline-none text-black focus:bg-amber-50 focus:ring-1 focus:ring-emerald-500"
          />
        </td>
      ))}
    </tr>
  )

  // Subheader banner helper

  const renderSectionHeader = (titleText: string) => (
    <div className="bg-white border-2 border-black text-black font-bold text-[10px] uppercase tracking-wider text-center py-1 mb-0.5 shadow-sm">
      {titleText}
    </div>
  )

  // Dotted note footer helper

  const renderFootnote = (customText?: string) => (
    <div className="text-[8px] italic text-zinc-700 text-center py-0.5 mb-2 font-mono">
      {customText ||
        "Please provide detailed remark on separate sheet where necessary. Pictures (with time stamp) are essential"}
    </div>
  )

  // Clean page footer (page number only on right, no signatures)

  const renderPageFooter = (pageNum: number) => (
    <div className="mt-4 pt-2 border-t border-zinc-300 flex items-center justify-end text-[10px] font-bold text-zinc-800 font-mono">
      <span>Page {pageNum} of 10</span>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 1

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage1 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Top Header Block: Left Meta + Right Meta + GVE Logo */}
      <div className="flex flex-col md:flex-row items-stretch border-2 border-black mb-3 bg-white">
        {/* Left 5 Rows */}
        <div className="flex-1 border-b md:border-b-0 md:border-r-2 border-black text-[9.5px]">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-5 p-1.5 font-bold border-r border-black bg-zinc-50">
              Name of pesonnel
            </div>
            <div className="col-span-7 p-1">
              <input
                type="text"
                value={formData.personnelName}
                disabled={readOnly}
                onChange={(e) => updateField("personnelName", e.target.value)}
                placeholder="Personnel name"
                className="w-full text-[9.5px] font-medium bg-transparent border-none outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-5 p-1.5 font-bold border-r border-black bg-zinc-50">
              Designation
            </div>
            <div className="col-span-7 p-1">
              <input
                type="text"
                value={formData.designation}
                disabled={readOnly}
                onChange={(e) => updateField("designation", e.target.value)}
                placeholder="Field Engineer / Tech"
                className="w-full text-[9.5px] font-medium bg-transparent border-none outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-5 p-1.5 font-bold border-r border-black bg-zinc-50">
              Date of most recent maintenance
            </div>
            <div className="col-span-7 p-1">
              <input
                type="date"
                value={formData.dateMostRecentMaintenance}
                disabled={readOnly}
                onChange={(e) =>
                  updateField("dateMostRecentMaintenance", e.target.value)
                }
                className="w-full text-[9.5px] bg-transparent border-none outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-5 p-1.5 font-bold border-r border-black bg-zinc-50">
              Date
            </div>
            <div className="col-span-7 p-1">
              <input
                type="date"
                value={formData.date}
                disabled={readOnly}
                onChange={(e) => updateField("date", e.target.value)}
                className="w-full text-[9.5px] font-bold bg-transparent border-none outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-5 p-1.5 font-bold border-r border-black bg-zinc-50">
              Date of next scheduled maintenance
            </div>
            <div className="col-span-7 p-1">
              <input
                type="date"
                value={formData.dateNextScheduledMaintenance}
                disabled={readOnly}
                onChange={(e) =>
                  updateField("dateNextScheduledMaintenance", e.target.value)
                }
                className="w-full text-[9.5px] bg-transparent border-none outline-none"
              />
            </div>
          </div>
        </div>

        {/* Middle Block: Prepared By & Approved By */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r-2 border-black flex flex-col justify-between text-[9.5px]">
          <div className="border-b border-black p-1.5 flex-1 flex flex-col justify-center">
            <div className="font-bold text-zinc-700 text-[8.5px] uppercase">
              Prepared by
            </div>
            <input
              type="text"
              value={formData.preparedBy}
              disabled={readOnly}
              onChange={(e) => updateField("preparedBy", e.target.value)}
              placeholder="ILECHUKWU CLEMENT"
              className="font-bold uppercase text-[9.5px] bg-transparent border-none outline-none text-black"
            />
            <div className="flex items-center gap-1 mt-1 text-[8.5px]">
              <span className="font-bold">DATE:</span>
              <input
                type="date"
                value={formData.preparedByDate}
                disabled={readOnly}
                onChange={(e) => updateField("preparedByDate", e.target.value)}
                className="bg-transparent border-none outline-none text-[8.5px]"
              />
            </div>
          </div>

          <div className="p-1.5 flex-1 flex flex-col justify-center bg-zinc-50/50">
            <div className="font-bold text-zinc-700 text-[8.5px] uppercase">
              Approved by
            </div>
            <input
              type="text"
              value={formData.approvedBy}
              disabled={readOnly}
              onChange={(e) => updateField("approvedBy", e.target.value)}
              placeholder="IFEANYI ORAJAKA"
              className="font-bold uppercase text-[9.5px] bg-transparent border-none outline-none text-black"
            />
            <div className="flex items-center gap-1 mt-1 text-[8.5px]">
              <span className="font-bold">DATE:</span>
              <input
                type="date"
                value={formData.approvedByDate}
                disabled={readOnly}
                onChange={(e) => updateField("approvedByDate", e.target.value)}
                className="bg-transparent border-none outline-none text-[8.5px]"
              />
            </div>
          </div>
        </div>

        {/* Top Right: GVE Official Logo */}
        <div className="w-full md:w-52 p-3 flex flex-col justify-center items-center text-center bg-white shrink-0">
          <img
            src={logoImg}
            alt="GVE Logo"
            className="max-h-12 max-w-full object-contain mb-1"
          />
          <span className="text-[7.5px] italic text-zinc-600 font-sans">
            "...Creating a Reliable Renewable Energy Future!!!"
          </span>
        </div>
      </div>

      {/* Section: General State of Power Plant */}
      {renderSectionHeader("GENERAL STATE OF POWER PLANT")}
      <div className="border-2 border-black mb-1 overflow-x-auto text-[9.5px]">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 font-bold w-52 bg-zinc-50 border-r border-black align-top">
                State of illumination/light fittings
              </td>
              <td className="p-1.5">
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
                  className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
                  placeholder="Record illumination details and fittings condition..."
                />
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold w-52 bg-zinc-50 border-r border-black align-top">
                Cleanliness of surroundings
              </td>
              <td className="p-1.5">
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
                  className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
                  placeholder="Record site yard cleanliness and overgrowth state..."
                />
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold w-52 bg-zinc-50 border-r border-black align-top">
                State of perimeter fence
              </td>
              <td className="p-1.5">
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
                  className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
                  placeholder="Record perimeter fencing and razor wire security..."
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 font-bold w-52 bg-zinc-50 border-r border-black align-top">
                Cleanliness of power house
              </td>
              <td className="p-1.5">
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
                  className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
                  placeholder="Record powerhouse interior cleanliness and ventilation..."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section: Conditions of Support Structure */}
      {renderSectionHeader("CONDITIONS OF SUPPORT STRUCTURE")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                ITEM / PARAMETER
              </th>
              {ARRAY_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Concrete base",
              ARRAY_KEYS_15,
              formData.supportStructure.concreteBase,
              (k, v) =>
                updateArrayColumnValue(
                  "supportStructure",
                  "concreteBase",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Nuts and bolts",
              ARRAY_KEYS_15,
              formData.supportStructure.nutsAndBolts,
              (k, v) =>
                updateArrayColumnValue(
                  "supportStructure",
                  "nutsAndBolts",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Spacers and End clamps",
              ARRAY_KEYS_15,
              formData.supportStructure.spacersAndEndClamps,
              (k, v) =>
                updateArrayColumnValue(
                  "supportStructure",
                  "spacersAndEndClamps",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Anti rust condition",
              ARRAY_KEYS_15,
              formData.supportStructure.antiRustCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "supportStructure",
                  "antiRustCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {renderPageFooter(1)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 2

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage2 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Section 1: PV Arrays */}
      {renderSectionHeader("PV ARRAYS")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                PV PARAMETER
              </th>
              {ARRAY_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "PV module rating",
              ARRAY_KEYS_15,
              formData.pvArrays.pvModuleRating,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "pvModuleRating", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Number of PV per array",
              ARRAY_KEYS_15,
              formData.pvArrays.numberOfPvPerArray,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "numberOfPvPerArray", k, v),
              readOnly,
            )}
            {render15ColRow(
              "PV connection configuration",
              ARRAY_KEYS_15,
              formData.pvArrays.pvConnectionConfig,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "pvConnectionConfig", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Allignment of PVs",
              ARRAY_KEYS_15,
              formData.pvArrays.alignmentOfPvs,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "alignmentOfPvs", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured Voc",
              ARRAY_KEYS_15,
              formData.pvArrays.measuredVoc,
              (k, v) => updateArrayColumnValue("pvArrays", "measuredVoc", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Expected Voc",
              ARRAY_KEYS_15,
              formData.pvArrays.expectedVoc,
              (k, v) => updateArrayColumnValue("pvArrays", "expectedVoc", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured Vmp at breaker input",
              ARRAY_KEYS_15,
              formData.pvArrays.measuredVmpBreakerInput,
              (k, v) =>
                updateArrayColumnValue(
                  "pvArrays",
                  "measuredVmpBreakerInput",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured Vmp at breaker output",
              ARRAY_KEYS_15,
              formData.pvArrays.measuredVmpBreakerOutput,
              (k, v) =>
                updateArrayColumnValue(
                  "pvArrays",
                  "measuredVmpBreakerOutput",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Calculated Vmp",
              ARRAY_KEYS_15,
              formData.pvArrays.calculatedVmp,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "calculatedVmp", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured Imp",
              ARRAY_KEYS_15,
              formData.pvArrays.measuredImp,
              (k, v) => updateArrayColumnValue("pvArrays", "measuredImp", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Calculated Imp",
              ARRAY_KEYS_15,
              formData.pvArrays.calculatedImp,
              (k, v) =>
                updateArrayColumnValue("pvArrays", "calculatedImp", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Date/Time readings were taken",
              ARRAY_KEYS_15,
              formData.pvArrays.dateTimeReadingsTaken,
              (k, v) =>
                updateArrayColumnValue(
                  "pvArrays",
                  "dateTimeReadingsTaken",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section 2: Outdoor Switchgear & Cables */}
      {renderSectionHeader("OUT DOOR SWITCH GEAR AND CABLES")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                OUTDOOR PARAMETER
              </th>
              {ARRAY_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "DC surge",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.dcSurge,
              (k, v) =>
                updateArrayColumnValue("outdoorSwitchgear", "dcSurge", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Breaker",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.breaker,
              (k, v) =>
                updateArrayColumnValue("outdoorSwitchgear", "breaker", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Fuses",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.fuses,
              (k, v) =>
                updateArrayColumnValue("outdoorSwitchgear", "fuses", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Switch gear enclosure",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.switchgearEnclosure,
              (k, v) =>
                updateArrayColumnValue(
                  "outdoorSwitchgear",
                  "switchgearEnclosure",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cable termination",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.cableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "outdoorSwitchgear",
                  "cableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cable labels",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.cableLabels,
              (k, v) =>
                updateArrayColumnValue(
                  "outdoorSwitchgear",
                  "cableLabels",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cables",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.cables,
              (k, v) =>
                updateArrayColumnValue("outdoorSwitchgear", "cables", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Conditions of Safety labels",
              ARRAY_KEYS_15,
              formData.outdoorSwitchgear.conditionsSafetyLabels,
              (k, v) =>
                updateArrayColumnValue(
                  "outdoorSwitchgear",
                  "conditionsSafetyLabels",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section 3: Cable Management and Routing */}
      {renderSectionHeader("CABLE MANAGEMENT AND ROUTING")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                ROUTING PARAMETER
              </th>
              {ARRAY_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Condition of PVC pipes",
              ARRAY_KEYS_15,
              formData.cableManagement.conditionPvcPipes,
              (k, v) =>
                updateArrayColumnValue(
                  "cableManagement",
                  "conditionPvcPipes",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Arrangement of cables",
              ARRAY_KEYS_15,
              formData.cableManagement.arrangementCables,
              (k, v) =>
                updateArrayColumnValue(
                  "cableManagement",
                  "arrangementCables",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Chamber condition",
              ARRAY_KEYS_15,
              formData.cableManagement.chamberCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "cableManagement",
                  "chamberCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Slabs condition",
              ARRAY_KEYS_15,
              formData.cableManagement.slabsCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "cableManagement",
                  "slabsCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {renderPageFooter(2)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 3

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage3 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Section 1: Indoor PV Switchgear */}
      {renderSectionHeader("INDOOR PV SWITCH GEAR AND CABLES")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                INDOOR SWITCHGEAR
              </th>
              {ARRAY_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Connected to which equipment",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.connectedToEquipment,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "connectedToEquipment",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "DC surge condition",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.dcSurgeCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "dcSurgeCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Breaker condition",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.breakerCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "breakerCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Fuses condition",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.fusesCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "fusesCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Switch gear enclosure/support",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.switchgearEnclosureSupport,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "switchgearEnclosureSupport",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cable termination",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.cableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "cableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cable labels",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.cableLabels,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "cableLabels",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cables condition",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.cablesCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "cablesCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "cable management",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.cableManagement,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "cableManagement",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Conditions of Safety labels",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.conditionsSafetyLabels,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "conditionsSafetyLabels",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured Voc",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.measuredVoc,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "measuredVoc",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Expected Voc",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.expectedVoc,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "expectedVoc",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured Vmp at breaker input",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.measuredVmpBreakerInput,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "measuredVmpBreakerInput",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured Vmp at breaker output",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.measuredVmpBreakerOutput,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "measuredVmpBreakerOutput",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Calculated Vmp",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.calculatedVmp,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "calculatedVmp",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured Imp",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.measuredImp,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "measuredImp",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Calculated Imp",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.calculatedImp,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "calculatedImp",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Date/Time readings were taken",
              ARRAY_KEYS_15,
              formData.indoorPvSwitchgear.dateTimeReadingsTaken,
              (k, v) =>
                updateArrayColumnValue(
                  "indoorPvSwitchgear",
                  "dateTimeReadingsTaken",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section 2: MPPT */}
      {renderSectionHeader("MPPT")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                MPPT PARAMETER
              </th>
              {MPPT_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Status",
              MPPT_KEYS_15,
              formData.mppt.status,
              (k, v) => updateArrayColumnValue("mppt", "status", k, v),
              readOnly,
            )}
            {render15ColRow(
              "input cable condition",
              MPPT_KEYS_15,
              formData.mppt.inputCableCondition,
              (k, v) =>
                updateArrayColumnValue("mppt", "inputCableCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "output cable condition",
              MPPT_KEYS_15,
              formData.mppt.outputCableCondition,
              (k, v) =>
                updateArrayColumnValue("mppt", "outputCableCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "input cable size",
              MPPT_KEYS_15,
              formData.mppt.inputCableSize,
              (k, v) => updateArrayColumnValue("mppt", "inputCableSize", k, v),
              readOnly,
            )}
            {render15ColRow(
              "output cable size",
              MPPT_KEYS_15,
              formData.mppt.outputCableSize,
              (k, v) => updateArrayColumnValue("mppt", "outputCableSize", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Condition of input cable termination",
              MPPT_KEYS_15,
              formData.mppt.conditionInputCableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "mppt",
                  "conditionInputCableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Condition of output cable termination",
              MPPT_KEYS_15,
              formData.mppt.conditionOutputCableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "mppt",
                  "conditionOutputCableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Output breaker condition",
              MPPT_KEYS_15,
              formData.mppt.outputBreakerCondition,
              (k, v) =>
                updateArrayColumnValue("mppt", "outputBreakerCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "output breaker rating",
              MPPT_KEYS_15,
              formData.mppt.outputBreakerRating,
              (k, v) =>
                updateArrayColumnValue("mppt", "outputBreakerRating", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured PV Input voltage",
              MPPT_KEYS_15,
              formData.mppt.measuredPvInputVoltage,
              (k, v) =>
                updateArrayColumnValue("mppt", "measuredPvInputVoltage", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured output voltage",
              MPPT_KEYS_15,
              formData.mppt.measuredOutputVoltage,
              (k, v) =>
                updateArrayColumnValue("mppt", "measuredOutputVoltage", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured input current",
              MPPT_KEYS_15,
              formData.mppt.measuredInputCurrent,
              (k, v) =>
                updateArrayColumnValue("mppt", "measuredInputCurrent", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured output current",
              MPPT_KEYS_15,
              formData.mppt.measuredOutputCurrent,
              (k, v) =>
                updateArrayColumnValue("mppt", "measuredOutputCurrent", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Date/Time readings were taken",
              MPPT_KEYS_15,
              formData.mppt.dateTimeReadingsTaken,
              (k, v) =>
                updateArrayColumnValue("mppt", "dateTimeReadingsTaken", k, v),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {renderPageFooter(3)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 4

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage4 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Section: CL Inverter */}
      {renderSectionHeader("CL INVERTER")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                CL INVERTER PARAMETER
              </th>
              {CL_INV_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Device condition",
              CL_INV_KEYS_15,
              formData.clInverter.deviceCondition,
              (k, v) =>
                updateArrayColumnValue("clInverter", "deviceCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "PV input cable condition",
              CL_INV_KEYS_15,
              formData.clInverter.pvInputCableCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "pvInputCableCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "PV input cable size",
              CL_INV_KEYS_15,
              formData.clInverter.pvInputCableSize,
              (k, v) =>
                updateArrayColumnValue("clInverter", "pvInputCableSize", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Condition of PV input cable termination",
              CL_INV_KEYS_15,
              formData.clInverter.conditionPvInputCableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "conditionPvInputCableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Condition of AC cable termination",
              CL_INV_KEYS_15,
              formData.clInverter.conditionAcCableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "conditionAcCableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC SPD arrestor 1 condition",
              CL_INV_KEYS_15,
              formData.clInverter.acSpdArrestor1Condition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "acSpdArrestor1Condition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "DC SPD arrestor 1 condition",
              CL_INV_KEYS_15,
              formData.clInverter.dcSpdArrestor1Condition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "dcSpdArrestor1Condition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "DC SPD arrestor 2 condition",
              CL_INV_KEYS_15,
              formData.clInverter.dcSpdArrestor2Condition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "dcSpdArrestor2Condition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC breaker condition",
              CL_INV_KEYS_15,
              formData.clInverter.acBreakerCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "acBreakerCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC RCCB condition",
              CL_INV_KEYS_15,
              formData.clInverter.acRccbCondition,
              (k, v) =>
                updateArrayColumnValue("clInverter", "acRccbCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Condition of FUSES",
              CL_INV_KEYS_15,
              formData.clInverter.conditionOfFuses,
              (k, v) =>
                updateArrayColumnValue("clInverter", "conditionOfFuses", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Measured average PV Input voltage",
              CL_INV_KEYS_15,
              formData.clInverter.measuredAveragePvInputVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "measuredAveragePvInputVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured output voltage",
              CL_INV_KEYS_15,
              formData.clInverter.measuredOutputVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "measuredOutputVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured output current",
              CL_INV_KEYS_15,
              formData.clInverter.measuredOutputCurrent,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "measuredOutputCurrent",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "input cable condition",
              CL_INV_KEYS_15,
              formData.clInverter.inputCableCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "inputCableCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "output cable condition",
              CL_INV_KEYS_15,
              formData.clInverter.outputCableCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "outputCableCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Date/Time readings were taken",
              CL_INV_KEYS_15,
              formData.clInverter.dateTimeReadingsTaken,
              (k, v) =>
                updateArrayColumnValue(
                  "clInverter",
                  "dateTimeReadingsTaken",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {renderPageFooter(4)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 5

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage5 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Section 1: Battery Inverter */}
      {renderSectionHeader("BATTERY INVERTER")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                BATTERY INVERTER
              </th>
              {INV_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Device condition",
              INV_KEYS_15,
              formData.batteryInverter.deviceCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "deviceCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Device configuration",
              INV_KEYS_15,
              formData.batteryInverter.deviceConfiguration,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "deviceConfiguration",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "BESS cable connection condition",
              INV_KEYS_15,
              formData.batteryInverter.bessCableConnectionCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "bessCableConnectionCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "BESS cable connection size",
              INV_KEYS_15,
              formData.batteryInverter.bessCableConnectionSize,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "bessCableConnectionSize",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "BESS cable termination condition",
              INV_KEYS_15,
              formData.batteryInverter.bessCableTerminationCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "bessCableTerminationCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC input cable connection condition",
              INV_KEYS_15,
              formData.batteryInverter.acInputCableConnectionCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acInputCableConnectionCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC input cable connection size",
              INV_KEYS_15,
              formData.batteryInverter.acInputCableConnectionSize,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acInputCableConnectionSize",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC input cable termination condition",
              INV_KEYS_15,
              formData.batteryInverter.acInputCableTerminationCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acInputCableTerminationCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC output cable connection condition",
              INV_KEYS_15,
              formData.batteryInverter.acOutputCableConnectionCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acOutputCableConnectionCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC output cable connection size",
              INV_KEYS_15,
              formData.batteryInverter.acOutputCableConnectionSize,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acOutputCableConnectionSize",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC output cable termination condition",
              INV_KEYS_15,
              formData.batteryInverter.acOutputCableTerminationCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acOutputCableTerminationCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Communication cable status",
              INV_KEYS_15,
              formData.batteryInverter.communicationCableStatus,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "communicationCableStatus",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC SPD 1 condition",
              INV_KEYS_15,
              formData.batteryInverter.acSpd1Condition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acSpd1Condition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC SPD 2 condition",
              INV_KEYS_15,
              formData.batteryInverter.acSpd2Condition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acSpd2Condition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC breaker condition",
              INV_KEYS_15,
              formData.batteryInverter.acBreakerCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acBreakerCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "AC RCCB condition",
              INV_KEYS_15,
              formData.batteryInverter.acRccbCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "acRccbCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Inverter DC breaker condition",
              INV_KEYS_15,
              formData.batteryInverter.inverterDcBreakerCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "inverterDcBreakerCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured DC voltage",
              INV_KEYS_15,
              formData.batteryInverter.measuredDcVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "measuredDcVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured AC output voltage",
              INV_KEYS_15,
              formData.batteryInverter.measuredAcOutputVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "measuredAcOutputVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured AC input voltage",
              INV_KEYS_15,
              formData.batteryInverter.measuredAcInputVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "measuredAcInputVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Measured DC current",
              INV_KEYS_15,
              formData.batteryInverter.measuredDcCurrent,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "measuredDcCurrent",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Date/Time readings were taken",
              INV_KEYS_15,
              formData.batteryInverter.dateTimeReadingsTaken,
              (k, v) =>
                updateArrayColumnValue(
                  "batteryInverter",
                  "dateTimeReadingsTaken",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section 2: BESS */}
      {renderSectionHeader("BESS")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-44 text-left">
                BESS PARAMETER
              </th>
              {STRING_KEYS_15.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "Physical condition",
              STRING_KEYS_15,
              formData.bess.physicalCondition,
              (k, v) =>
                updateArrayColumnValue("bess", "physicalCondition", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Voltage",
              STRING_KEYS_15,
              formData.bess.voltage,
              (k, v) => updateArrayColumnValue("bess", "voltage", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Current",
              STRING_KEYS_15,
              formData.bess.current,
              (k, v) => updateArrayColumnValue("bess", "current", k, v),
              readOnly,
            )}
            {render15ColRow(
              "General temperation",
              STRING_KEYS_15,
              formData.bess.generalTemperature,
              (k, v) =>
                updateArrayColumnValue("bess", "generalTemperature", k, v),
              readOnly,
            )}
            {render15ColRow(
              "Battery disconnect switch gear status",
              STRING_KEYS_15,
              formData.bess.batteryDisconnectSwitchgearStatus,
              (k, v) =>
                updateArrayColumnValue(
                  "bess",
                  "batteryDisconnectSwitchgearStatus",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "BUSBAR status/cable termination status",
              STRING_KEYS_15,
              formData.bess.busbarStatusCableTerminationStatus,
              (k, v) =>
                updateArrayColumnValue(
                  "bess",
                  "busbarStatusCableTerminationStatus",
                  k,
                  v,
                ),
              readOnly,
            )}
          </tbody>
        </table>
      </div>
      {renderFootnote(
        "Please provide detailed remark on separate sheet for individual battery. Pictures (with time stamp) are essential",
      )}

      {renderPageFooter(5)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 6

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage6 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Section 1: Grid Distribution */}
      {renderSectionHeader("GRID DISTRIBUTION")}
      <div className="border-2 border-black mb-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-48 text-left">
                FEEDER & PHASE
              </th>
              {GRID_PHASE_KEYS.map((k) => (
                <th
                  key={k}
                  className="p-1 border-r border-black text-center min-w-[48px]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {render15ColRow(
              "isolation fuse/Feeder pillar condition",
              GRID_PHASE_KEYS,
              formData.gridDistribution.isolationFuseFeederPillarCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "gridDistribution",
                  "isolationFuseFeederPillarCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Cable termination",
              GRID_PHASE_KEYS,
              formData.gridDistribution.cableTermination,
              (k, v) =>
                updateArrayColumnValue(
                  "gridDistribution",
                  "cableTermination",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "cable condition",
              GRID_PHASE_KEYS,
              formData.gridDistribution.cableCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "gridDistribution",
                  "cableCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Grid condition",
              GRID_PHASE_KEYS,
              formData.gridDistribution.gridCondition,
              (k, v) =>
                updateArrayColumnValue(
                  "gridDistribution",
                  "gridCondition",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Grid L-N voltage",
              GRID_PHASE_KEYS,
              formData.gridDistribution.gridLnVoltage,
              (k, v) =>
                updateArrayColumnValue(
                  "gridDistribution",
                  "gridLnVoltage",
                  k,
                  v,
                ),
              readOnly,
            )}
            {render15ColRow(
              "Grid current",
              GRID_PHASE_KEYS,
              formData.gridDistribution.gridCurrent,
              (k, v) =>
                updateArrayColumnValue("gridDistribution", "gridCurrent", k, v),
              readOnly,
            )}
          </tbody>
        </table>
      </div>

      {/* Section 2: Diesel Generator */}
      {renderSectionHeader("DIESEL GENERATOR")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse text-[9.5px]">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-[8.5px] font-bold">
              <th className="p-1 border-r border-black w-48 text-left">
                GENERATOR PARAMETER
              </th>
              <th className="p-1 border-r border-black text-center w-24">
                DG 1
              </th>
              <th className="p-1 border-r border-black text-center w-24">
                DG 2
              </th>
              <th className="p-1 border-black text-left">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Equipment condition",
                key: "equipmentCondition" as const,
              },

              { label: "Last use date/time", key: "lastUseDateTime" as const },

              { label: "Diesel level", key: "dieselLevel" as const },

              { label: "Cable condition", key: "cableCondition" as const },

              {
                label: "Cable termination condition",
                key: "cableTerminationCondition" as const,
              },

              { label: "Run time", key: "runTime" as const },

              { label: "Last serviced date", key: "lastServicedDate" as const },

              {
                label: "Next scheduled service date",
                key: "nextScheduledServiceDate" as const,
              },
            ].map(({ label, key }) => (
              <tr key={key} className="border-b border-zinc-400">
                <td className="p-1 border-r border-black font-semibold text-[9px] bg-zinc-50">
                  {label}
                </td>
                <td className="p-0 border-r border-dashed border-zinc-400 text-center">
                  <input
                    type="text"
                    value={formData.dieselGenerator[key]?.["DG 1"] || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateArrayColumnValue(
                        "dieselGenerator",
                        key,
                        "DG 1",
                        e.target.value,
                      )
                    }
                    className="w-full h-full py-1 text-center text-[9px] font-mono bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0 border-r border-black text-center">
                  <input
                    type="text"
                    value={formData.dieselGenerator[key]?.["DG 2"] || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateArrayColumnValue(
                        "dieselGenerator",
                        key,
                        "DG 2",
                        e.target.value,
                      )
                    }
                    className="w-full h-full py-1 text-center text-[9px] font-mono bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    value={formData.dieselGenerator.remark || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSubField(
                        "dieselGenerator",
                        "remark",
                        e.target.value,
                      )
                    }
                    placeholder="Generator state notes..."
                    className="w-full text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderFootnote()}

      {/* Section 3: Any Other Comment on Grid Line and Generator */}
      <div className="border-2 border-black mt-3 mb-1 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          ANY OTHER COMENT ON GRID LINE AND GENERATOR
        </div>
        <textarea
          rows={4}
          value={formData.otherCommentGridLineAndGenerator}
          disabled={readOnly}
          onChange={(e) =>
            updateField("otherCommentGridLineAndGenerator", e.target.value)
          }
          placeholder="Record notes on grid line stability, feeder breaker trips, generator diesel consumption, or synchronizing status..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {renderPageFooter(6)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 7

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage7 = (isPrint = false) => {
    // Split into left list (35 items) and right list (31 items)

    const leftEarthingItems = formData.earthingSystem.slice(0, 35)

    const rightEarthingItems = formData.earthingSystem.slice(35)

    return (
      <div
        className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
          isPrint ? "print-page" : ""
        }`}
      >
        {renderSectionHeader("EARTHING SYSTEM")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-2 border-black p-1 mb-1">
          {/* Left Table */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full border-collapse text-[8.5px]">
              <thead>
                <tr className="border-b border-black bg-zinc-100 font-bold">
                  <th className="p-1 border-r border-black text-left">
                    ITEM/EQUIPMENT
                  </th>
                  <th className="p-1 border-r border-black text-center w-20">
                    VALUES
                  </th>
                  <th className="p-1 border-black text-left w-24">REMARK</th>
                </tr>
              </thead>
              <tbody>
                {leftEarthingItems.map((e, idx) => (
                  <tr key={e.id || idx} className="border-b border-zinc-300">
                    <td className="p-1 border-r border-black font-medium">
                      {e.itemEquipment}
                    </td>
                    <td className="p-0 border-r border-black text-center">
                      <input
                        type="text"
                        value={e.values}
                        disabled={readOnly}
                        onChange={(ev) => {
                          const updated = [...formData.earthingSystem]

                          updated[idx].values = ev.target.value

                          updateField("earthingSystem", updated)
                        }}
                        className="w-full py-0.5 text-center text-[8.5px] font-mono bg-transparent border-none outline-none"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={e.remark}
                        disabled={readOnly}
                        onChange={(ev) => {
                          const updated = [...formData.earthingSystem]

                          updated[idx].remark = ev.target.value

                          updateField("earthingSystem", updated)
                        }}
                        className="w-full py-0.5 px-1 text-[8.5px] bg-transparent border-none outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Table */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full border-collapse text-[8.5px]">
              <thead>
                <tr className="border-b border-black bg-zinc-100 font-bold">
                  <th className="p-1 border-r border-black text-left">
                    ITEM/EQUIPMENT
                  </th>
                  <th className="p-1 border-r border-black text-center w-20">
                    VALUE
                  </th>
                  <th className="p-1 border-black text-left w-24">REMARK</th>
                </tr>
              </thead>
              <tbody>
                {rightEarthingItems.map((e, rIdx) => {
                  const globalIdx = 35 + rIdx

                  return (
                    <tr
                      key={e.id || globalIdx}
                      className="border-b border-zinc-300"
                    >
                      <td className="p-1 border-r border-black font-medium">
                        {e.itemEquipment}
                      </td>
                      <td className="p-0 border-r border-black text-center">
                        <input
                          type="text"
                          value={e.values}
                          disabled={readOnly}
                          onChange={(ev) => {
                            const updated = [...formData.earthingSystem]

                            updated[globalIdx].values = ev.target.value

                            updateField("earthingSystem", updated)
                          }}
                          className="w-full py-0.5 text-center text-[8.5px] font-mono bg-transparent border-none outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={e.remark}
                          disabled={readOnly}
                          onChange={(ev) => {
                            const updated = [...formData.earthingSystem]

                            updated[globalIdx].remark = ev.target.value

                            updateField("earthingSystem", updated)
                          }}
                          className="w-full py-0.5 px-1 text-[8.5px] bg-transparent border-none outline-none"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {renderPageFooter(7)}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 8

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage8 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Top Table: Scheduled Maintenance Status */}
      <div className="border-2 border-black mb-3 overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 font-bold">
              <th className="p-1 border-r border-black text-left w-52">
                EQUIPMENT ITEM
              </th>
              <th className="p-1 border-r border-black text-center w-28">
                STATUS
              </th>
              <th className="p-1 border-r border-black text-center w-36">
                Date last maintained
              </th>
              <th className="p-1 border-r border-black text-center w-36">
                Date for next scheduled maintenance
              </th>
              <th className="p-1 border-black text-left">REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {formData.equipmentMaintenance.map((eq, idx) => (
              <tr key={eq.id || idx} className="border-b border-zinc-400">
                <td className="p-1 border-r border-black font-semibold bg-zinc-50">
                  {eq.name}
                </td>
                <td className="p-0 border-r border-dashed border-zinc-400 text-center">
                  <input
                    type="text"
                    value={eq.status}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.equipmentMaintenance]

                      updated[idx].status = e.target.value

                      updateField("equipmentMaintenance", updated)
                    }}
                    className="w-full py-1 text-center font-mono text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0 border-r border-dashed border-zinc-400 text-center">
                  <input
                    type="date"
                    value={eq.dateLastMaintained}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.equipmentMaintenance]

                      updated[idx].dateLastMaintained = e.target.value

                      updateField("equipmentMaintenance", updated)
                    }}
                    className="w-full py-0.5 text-center text-[8.5px] bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0 border-r border-black text-center">
                  <input
                    type="date"
                    value={eq.dateNextScheduled}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.equipmentMaintenance]

                      updated[idx].dateNextScheduled = e.target.value

                      updateField("equipmentMaintenance", updated)
                    }}
                    className="w-full py-0.5 text-center text-[8.5px] bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0">
                  <input
                    type="text"
                    value={eq.remarks}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.equipmentMaintenance]

                      updated[idx].remarks = e.target.value

                      updateField("equipmentMaintenance", updated)
                    }}
                    placeholder="Maintenance remark..."
                    className="w-full py-1 px-1 text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Table: List of Available PPEs in Site */}
      {renderSectionHeader("LIST OF AVAILABLE PPES IN SITE AND CONDITION")}
      <div className="border-2 border-black mb-1 overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 font-bold">
              <th className="p-1 border-r border-black text-left w-64">PPE</th>
              <th className="p-1 border-r border-black text-center w-36">
                CONDITION
              </th>
              <th className="p-1 border-black text-left">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {formData.ppesList.map((ppe, idx) => (
              <tr key={ppe.id || idx} className="border-b border-zinc-400">
                <td className="p-1 border-r border-black font-semibold bg-zinc-50">
                  {ppe.name}
                </td>
                <td className="p-0 border-r border-dashed border-zinc-400 text-center">
                  <input
                    type="text"
                    value={ppe.condition}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.ppesList]

                      updated[idx].condition = e.target.value

                      updateField("ppesList", updated)
                    }}
                    className="w-full py-1 text-center font-mono text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0">
                  <input
                    type="text"
                    value={ppe.remark}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.ppesList]

                      updated[idx].remark = e.target.value

                      updateField("ppesList", updated)
                    }}
                    placeholder="Quantity / remark..."
                    className="w-full py-1 px-1 text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPageFooter(8)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 9

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage9 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Top Table: List of Available Tools */}
      {renderSectionHeader("LIST OF AVAILABLE TOOLS IN SITE AND CONDITION")}
      <div className="border-2 border-black mb-3 overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 font-bold">
              <th className="p-1 border-r border-black text-left w-64">
                TOOLS
              </th>
              <th className="p-1 border-r border-black text-center w-36">
                CONDITION
              </th>
              <th className="p-1 border-black text-left">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {formData.toolsList.map((tool, idx) => (
              <tr key={tool.id || idx} className="border-b border-zinc-400">
                <td className="p-1 border-r border-black font-semibold bg-zinc-50">
                  {tool.name}
                </td>
                <td className="p-0 border-r border-dashed border-zinc-400 text-center">
                  <input
                    type="text"
                    value={tool.condition}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.toolsList]

                      updated[idx].condition = e.target.value

                      updateField("toolsList", updated)
                    }}
                    className="w-full py-1 text-center font-mono text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
                <td className="p-0">
                  <input
                    type="text"
                    value={tool.remark}
                    disabled={readOnly}
                    onChange={(e) => {
                      const updated = [...formData.toolsList]

                      updated[idx].remark = e.target.value

                      updateField("toolsList", updated)
                    }}
                    placeholder="Tool status / remark..."
                    className="w-full py-1 px-1 text-[9px] bg-transparent border-none outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Middle Box: Comment on operators */}
      <div className="border-2 border-black mb-3 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          Comment on operators
        </div>
        <textarea
          rows={4}
          value={formData.commentOnOperators}
          disabled={readOnly}
          onChange={(e) => updateField("commentOnOperators", e.target.value)}
          placeholder="Record observations regarding operator log adherence, shift handovers, and system checks..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {/* Bottom Box: Comment on security personnels */}
      <div className="border-2 border-black mb-1 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          Coment on security pesonnels
        </div>
        <textarea
          rows={4}
          value={formData.commentOnSecurityPersonnel}
          disabled={readOnly}
          onChange={(e) =>
            updateField("commentOnSecurityPersonnel", e.target.value)
          }
          placeholder="Record notes on site guard coverage, visitors logbook integrity, fence checks, and security incidents..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {renderPageFooter(9)}
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────

  // PHYSICAL PAGE 10

  // ──────────────────────────────────────────────────────────────────────────

  const renderPhysicalPage10 = (isPrint = false) => (
    <div
      className={`page-sheet bg-white text-black p-4 md:p-6 rounded-lg border-2 border-black mb-8 shadow-sm ${
        isPrint ? "print-page" : ""
      }`}
    >
      {/* Top Box: Comment on safety signage */}
      <div className="border-2 border-black mb-3 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          Coment on safety signage
        </div>
        <textarea
          rows={4}
          value={formData.commentOnSafetySignage}
          disabled={readOnly}
          onChange={(e) =>
            updateField("commentOnSafetySignage", e.target.value)
          }
          placeholder="Record notes on high-voltage warnings, PPE signs, emergency contact boards, and extinguisher tags..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {/* Middle Box: Comment on metering / vending / customers */}
      <div className="border-2 border-black mb-3 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          Coment on metering/ vending/ customers
        </div>
        <textarea
          rows={4}
          value={formData.commentOnMeteringVendingCustomers}
          disabled={readOnly}
          onChange={(e) =>
            updateField("commentOnMeteringVendingCustomers", e.target.value)
          }
          placeholder="Record vending gateway status, customer complaints, meter calibrations, and tariff configurations..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {/* Bottom Box: GENERAL REMARK */}
      <div className="border-2 border-black mb-1 p-2 bg-white">
        <div className="font-bold text-[9px] uppercase tracking-wider text-zinc-800 mb-1">
          GENERAL REMARK
        </div>
        <textarea
          rows={5}
          value={formData.generalRemark}
          disabled={readOnly}
          onChange={(e) => updateField("generalRemark", e.target.value)}
          placeholder="Overall executive engineering summary of quarterly site maintenance..."
          className="w-full bg-transparent border-none outline-none text-[9.5px] leading-relaxed resize-none"
        />
      </div>

      {renderPageFooter(10)}
    </div>
  )

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Site Name Datalist */}
      <datalist id="reportflow-quarterly-sites-list">
        {recentSites.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Top Toolbar */}
      <div className="no-print flex flex-col gap-3 bg-secondary/80 border border-border p-3 rounded-lg backdrop-blur-sm">
        {/* Row 1: Report Name */}
        <div className="w-full flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <label
                htmlFor="quarterly-report-name-input"
                className="text-[10px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5"
              >
                <span>Report Name</span>
                {titleError && (
                  <span className="text-rose-400 font-bold text-[9px] bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded animate-pulse">
                    Required
                  </span>
                )}
              </label>
              {titleError && (
                <span className="text-[10px] font-mono text-rose-400 font-medium inline-flex items-center gap-1">
                  <AlertIcon className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{titleError}</span>
                </span>
              )}
            </div>
            {readOnly ? (
              <h2 className="text-sm font-display font-600 text-foreground truncate">
                {title ||
                  `Quarterly Maintenance Audit Form — ${formData.siteName || "GVE Site"}`}
              </h2>
            ) : (
              <div className="relative flex items-center">
                <input
                  id="quarterly-report-name-input"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter quarterly audit report name..."
                  className={`w-full bg-background/90 border text-xs font-semibold px-2.5 py-1.5 rounded outline-none transition-all ${
                    titleError
                      ? "border-rose-500 ring-2 ring-rose-500/50 text-rose-200 bg-rose-950/20"
                      : "border-border text-foreground hover:border-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  }`}
                />
                <span className="absolute right-2 text-zinc-400 pointer-events-none flex items-center">
                  <EditIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Action Buttons with Close button on the extreme right */}
        <div className="w-full flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-save status indicator (Strictly NO emojis) */}
            {!readOnly && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-secondary/80 border border-border text-[11px] font-mono text-muted-foreground shrink-0">
                {isSaving ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                    <span>Saving draft...</span>
                  </>
                ) : lastSavedTime ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Auto-saved locally</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                    <span>Auto-save active</span>
                  </>
                )}
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-background rounded-md p-1 border border-border text-xs font-mono shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("paper")}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === "paper"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Physical Sheet View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("interactive")}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === "interactive"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fast Grid View
              </button>
            </div>

            {/* Export / Print Preview Button */}
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border transition-all shrink-0"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Export to PDF / Live Preview
            </button>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ml-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs transition-all font-mono shrink-0"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Draft Recovery Notification Banner (Strictly NO emojis) */}
      {recoveredDraft && (
        <div className="mb-2 p-3 rounded-lg bg-secondary border border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>
              Unsaved local draft from{" "}
              {new Date(recoveredDraft.lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",

                minute: "2-digit",
              })}{" "}
              found for {recoveredDraft.siteName || "this site"}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-all text-xs cursor-pointer"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="px-2.5 py-1 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded transition-all text-xs cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Physical Sheet View Pagination Navigator */}
      {viewMode === "paper" && (
        <div className="no-print flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-border/80 text-xs font-mono">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">
              Sheets:
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setActivePaperPage(pg)}
                className={`px-2.5 py-1 rounded text-xs transition-all border cursor-pointer ${
                  activePaperPage === pg
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Page {pg}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActivePaperPage("all")}
              className={`px-3 py-1 rounded text-xs transition-all border ${
                activePaperPage === "all"
                  ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              View All 10 Pages
            </button>
          </div>
        </div>
      )}

      {/* Category Navigation Tabs for Interactive Mode */}
      {viewMode === "interactive" && (
        <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/80 text-xs font-mono">
          {[
            { id: "general" as const, label: "1. General & Support" },

            { id: "pv_outdoor" as const, label: "2. PV & Outdoor Switch" },

            { id: "cables_indoor" as const, label: "3. Cable & Indoor Switch" },

            { id: "mppt_inverter" as const, label: "4. MPPT & CL Inverter" },

            { id: "bess" as const, label: "5. Battery Inverter & BESS" },

            { id: "grid_gen" as const, label: "6. Grid & Diesel Gen" },

            { id: "earthing" as const, label: "7. Earthing System" },

            { id: "equipment_ppes" as const, label: "8. Equipment & PPEs" },

            { id: "tools_comments" as const, label: "9. Tools & Remarks" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all border cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Main View Mode Renders */}
      {viewMode === "paper" ? (
        <div className="print-area paper-sheet w-full overflow-x-auto">
          {(activePaperPage === 1 || activePaperPage === "all") &&
            renderPhysicalPage1()}
          {(activePaperPage === 2 || activePaperPage === "all") &&
            renderPhysicalPage2()}
          {(activePaperPage === 3 || activePaperPage === "all") &&
            renderPhysicalPage3()}
          {(activePaperPage === 4 || activePaperPage === "all") &&
            renderPhysicalPage4()}
          {(activePaperPage === 5 || activePaperPage === "all") &&
            renderPhysicalPage5()}
          {(activePaperPage === 6 || activePaperPage === "all") &&
            renderPhysicalPage6()}
          {(activePaperPage === 7 || activePaperPage === "all") &&
            renderPhysicalPage7()}
          {(activePaperPage === 8 || activePaperPage === "all") &&
            renderPhysicalPage8()}
          {(activePaperPage === 9 || activePaperPage === "all") &&
            renderPhysicalPage9()}
          {(activePaperPage === 10 || activePaperPage === "all") &&
            renderPhysicalPage10()}
        </div>
      ) : (
        /* Fast Interactive Grid View */

        <div className="bg-card border border-border rounded-lg p-5 space-y-6">
          {activeCategory === "general" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 1: General State & Support Structure
                </h3>
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Illumination & Light Fittings
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
                  <label className="text-xs font-mono text-muted-foreground uppercase">
                    Cleanliness of Surroundings
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
              </div>
            </div>
          )}

          {activeCategory === "pv_outdoor" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 2: PV Arrays & Outdoor Switchgear
                </h3>
              </div>
              <div className="overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  Full 15-array table editor. You can also edit in Physical
                  Sheet View for 1:1 format replica.
                </p>
                {renderPhysicalPage2()}
              </div>
            </div>
          )}

          {activeCategory === "cables_indoor" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 3: Indoor PV Switchgear & MPPT
                </h3>
              </div>
              {renderPhysicalPage3()}
            </div>
          )}

          {activeCategory === "mppt_inverter" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 4: CL Inverter Form
                </h3>
              </div>
              {renderPhysicalPage4()}
            </div>
          )}

          {activeCategory === "bess" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 5: Battery Inverters & BESS Strings
                </h3>
              </div>
              {renderPhysicalPage5()}
            </div>
          )}

          {activeCategory === "grid_gen" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 6: Grid Distribution & Diesel Generators
                </h3>
              </div>
              {renderPhysicalPage6()}
            </div>
          )}

          {activeCategory === "earthing" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 7: Earthing System Resistances
                </h3>
              </div>
              {renderPhysicalPage7()}
            </div>
          )}

          {activeCategory === "equipment_ppes" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Page 8: Equipment Maintenance & PPEs
                </h3>
              </div>
              {renderPhysicalPage8()}
            </div>
          )}

          {activeCategory === "tools_comments" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                  Pages 9 & 10: Tools, Operator Comments & Executive Remarks
                </h3>
              </div>
              {renderPhysicalPage9()}
              {renderPhysicalPage10()}
            </div>
          )}
        </div>
      )}

      {/* Report Photo & Evidence Uploader */}
      <ReportPhotoUploader
        attachments={formData.attachments || []}
        onChange={(attachments) => updateField("attachments", attachments)}
        readOnly={readOnly}
        siteName={formData.siteName}
        author={author}
        isAdmin={isAdmin}
        title="Quarterly Site Audit Photos & Visual Evidence"
        description="Attach photos for all audit categories (PV, Inverters, BESS, Earthing, PPEs, Switchgear, Site condition). Forensically watermarked and offline capable."
      />

      {/* Bottom Actions Bar (Save Draft & Submit Audit) */}
      {!readOnly && onSave && (
        <div className="no-print bg-secondary/80 border border-border p-4 rounded-xl shadow-sm mt-2">
          <div className="grid grid-cols-2 gap-3 w-full font-mono">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="w-full flex items-center justify-center gap-2 bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:translate-y-px"
              title="Save as Draft to edit later before submitting"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitConfirmModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-foreground font-semibold px-4 py-2.5 rounded-lg text-xs transition-all shadow active:translate-y-px"
              title="Submit final audit for formal review"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Publish Audit
            </button>
          </div>
        </div>
      )}

      {/* PDF Export & Print Modal (Renders all 10 pages in 1:1 format) */}
      {showPdfModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-950">
              <div>
                <h3 className="text-sm font-display font-bold text-foreground">
                  Live PDF Export & Physical Print Preview
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Official 1:1 format replica of Site Quarterly Maintenance
                  Template (All 10 Pages)
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-primary hover:bg-primary-hover text-foreground font-bold px-4 py-2 rounded shadow flex items-center gap-1.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
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
              <div className="w-full max-w-4xl bg-white text-black p-4 rounded shadow-2xl space-y-6">
                {renderPhysicalPage1(true)}
                {renderPhysicalPage2(true)}
                {renderPhysicalPage3(true)}
                {renderPhysicalPage4(true)}
                {renderPhysicalPage5(true)}
                {renderPhysicalPage6(true)}
                {renderPhysicalPage7(true)}
                {renderPhysicalPage8(true)}
                {renderPhysicalPage9(true)}
                {renderPhysicalPage10(true)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showSubmitConfirmModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-display font-bold text-foreground mb-2">
              Publish Quarterly Site Audit?
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to finalize and publish this quarterly audit
              for{" "}
              <strong className="text-foreground">
                {formData.siteName || "Site"}
              </strong>
              ?
            </p>
            <div className="flex items-center justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-3 py-1.5 rounded border border-border hover:bg-secondary text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishAudit}
                className="bg-primary hover:bg-primary-hover text-foreground font-bold px-4 py-1.5 rounded shadow"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
