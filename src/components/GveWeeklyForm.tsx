import React, { useState, useRef } from 'react'
import logoImg from './logo.jpeg'
import {
  GveWeeklyRecordData,
  OutageFaultEntry,
  createEmptyGveWeeklyData,
  createDefaultOutageEntry,
} from '../types/gveWeekly'
import { ReportAttachment } from '../types/attachment'
import ReportPhotoUploader from './ReportPhotoUploader'

interface GveWeeklyFormProps {
  initialData?: GveWeeklyRecordData
  readOnly?: boolean
  onSave?: (data: GveWeeklyRecordData, status: 'Draft' | 'Submitted') => void
  onCancel?: () => void
}

export default function GveWeeklyForm({
  initialData,
  readOnly = false,
  onSave,
  onCancel,
}: GveWeeklyFormProps) {
  const [formData, setFormData] = useState<GveWeeklyRecordData>(() => {
    return initialData || createEmptyGveWeeklyData()
  })

  const [viewMode, setViewMode] = useState<'paper' | 'interactive'>('paper')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)
  const [activeSigField, setActiveSigField] = useState<'supervisor' | 'operator' | null>(null)
  
  // HTML5 Canvas signature pad refs & state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Direct state updaters
  const updateField = <K extends keyof GveWeeklyRecordData>(field: K, value: GveWeeklyRecordData[K]) => {
    if (readOnly) return
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateOutage = (id: string, field: keyof OutageFaultEntry, value: string) => {
    if (readOnly) return
    setFormData((prev) => ({
      ...prev,
      outages: prev.outages.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const handleAddOutageRow = () => {
    if (readOnly) return
    const count = formData.outages.length + 1
    const dayLabel = `DAY ${Math.ceil(count / 2)}`
    const newEntry = createDefaultOutageEntry(dayLabel, count)
    setFormData((prev) => ({ ...prev, outages: [...prev.outages, newEntry] }))
  }

  const handleRemoveOutageRow = (id: string) => {
    if (readOnly) return
    setFormData((prev) => ({
      ...prev,
      outages: prev.outages.filter((item) => item.id !== id),
    }))
  }

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
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
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#005030'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !activeSigField) return
    const dataUrl = canvas.toDataURL('image/png')
    if (activeSigField === 'supervisor') {
      updateField('supervisorSignature', dataUrl)
    } else {
      updateField('operatorSignature', dataUrl)
    }
    setActiveSigField(null)
  }

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave) {
      onSave(formData, 'Draft')
    }
  }

  const handleSubmitFinal = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave) {
      onSave(formData, 'Submitted')
    }
  }

  const handleTriggerPrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-secondary/80 border border-border p-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-display font-600 text-foreground uppercase tracking-wider">
            Weekly Site Report Form
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-background rounded-md p-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode('paper')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'paper'
                  ? 'bg-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📄 Physical Sheet View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'interactive'
                  ? 'bg-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚡ Fast Grid View
            </button>
          </div>

          {/* Export / Print Button */}
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export to PDF / Live Preview
          </button>

          {!readOnly && onSave && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 font-mono px-3.5 py-1.5 rounded text-xs transition-all shadow-sm active:translate-y-px"
                title="Save as Draft to edit later before submitting"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(true)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground font-semibold px-4 py-1.5 rounded text-xs transition-all shadow active:translate-y-px"
                title="Submit final report for Admin review"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Submit Report
              </button>
            </div>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Physical Form Render */}
      {viewMode === 'paper' ? (
        <div className="print-area paper-sheet p-4 md:p-6 rounded-lg overflow-x-auto border border-zinc-400 bg-white text-black font-sans">
          
          {/* Header Section: Logo on Top Left */}
          <div className="flex items-stretch border-2 border-black mb-0.5 bg-white">
            {/* Top Left Logo Container */}
            <div className="w-48 p-2 border-r-2 border-black flex flex-col justify-center items-center text-center bg-white shrink-0">
              <img src={logoImg} alt="GVE Logo" className="max-h-12 max-w-full object-contain" />
            </div>

            {/* Title */}
            <div className="flex-1 flex flex-col justify-center items-center py-3 bg-white">
              <h1 className="text-base font-extrabold tracking-widest text-black uppercase">
                WEEKLY SITE REPORT FORM
              </h1>
            </div>
          </div>

          {/* Site Name & Personnel Sign-off Grid */}
          <div className="border-2 border-black text-[11px] font-bold text-black mt-3 mb-3">
            {/* Row 1: Site Name */}
            <div className="flex items-center border-b border-black">
              <div className="w-44 px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                SITE NAME
              </div>
              <div className="flex-1 px-2 py-1">
                <input type="text" value={formData.siteName} disabled={readOnly}
                  onChange={(e) => updateField('siteName', e.target.value)} placeholder="Enter site location name..."
                  className="w-full bg-transparent font-medium border-none outline-none text-black" />
              </div>
            </div>

            {/* Row 2: Supervisor */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 flex items-center border-r border-black">
                <div className="w-44 px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  SUPERVISOR'S NAME
                </div>
                <div className="flex-1 px-2 py-1">
                  <input
                    type="text"
                    value={formData.supervisorName}
                    disabled={readOnly}
                    onChange={(e) => updateField('supervisorName', e.target.value)}
                    placeholder="Supervisor Name"
                    className="w-full bg-transparent font-medium border-none outline-none text-black"
                  />
                </div>
              </div>
              <div className="col-span-3 flex items-center border-r border-black">
                <div className="px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  SIGNATURE
                </div>
                <div className="flex-1 px-2 py-1 flex items-center justify-between">
                  {formData.supervisorSignature ? (
                    <img src={formData.supervisorSignature} alt="Sig" className="h-6 max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">Not signed</span>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setActiveSigField('supervisor')}
                      className="no-print text-[9px] bg-emerald-800 text-white px-1.5 py-0.5 rounded ml-1 font-mono hover:bg-emerald-700 shrink-0"
                    >
                      Sign
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-3 flex items-center">
                <div className="px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  DATE
                </div>
                <div className="flex-1 px-2 py-1">
                  <input
                    type="date"
                    value={formData.supervisorDate}
                    disabled={readOnly}
                    onChange={(e) => updateField('supervisorDate', e.target.value)}
                    className="w-full bg-transparent font-mono border-none outline-none text-black"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Operator */}
            <div className="grid grid-cols-12">
              <div className="col-span-6 flex items-center border-r border-black">
                <div className="w-44 px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  OPERATOR'S NAME
                </div>
                <div className="flex-1 px-2 py-1">
                  <input
                    type="text"
                    value={formData.operatorName}
                    disabled={readOnly}
                    onChange={(e) => updateField('operatorName', e.target.value)}
                    placeholder="Operator Name"
                    className="w-full bg-transparent font-medium border-none outline-none text-black"
                  />
                </div>
              </div>
              <div className="col-span-3 flex items-center border-r border-black">
                <div className="px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  SIGNATURE
                </div>
                <div className="flex-1 px-2 py-1 flex items-center justify-between">
                  {formData.operatorSignature ? (
                    <img src={formData.operatorSignature} alt="Sig" className="h-6 max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">Not signed</span>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setActiveSigField('operator')}
                      className="no-print text-[9px] bg-emerald-800 text-white px-1.5 py-0.5 rounded ml-1 font-mono hover:bg-emerald-700 shrink-0"
                    >
                      Sign
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-3 flex items-center">
                <div className="px-2 py-1.5 bg-zinc-100 border-r border-black font-bold uppercase shrink-0">
                  DATE
                </div>
                <div className="flex-1 px-2 py-1">
                  <input
                    type="date"
                    value={formData.operatorDate}
                    disabled={readOnly}
                    onChange={(e) => updateField('operatorDate', e.target.value)}
                    className="w-full bg-transparent font-mono border-none outline-none text-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: OVERALL CLEANLINESS OF FACILITY */}
          <div className="border-2 border-black mb-3">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              OVERALL CLEANLINESS OF FACILITY
            </div>
            <div className="p-2 space-y-2 text-[10px] font-bold text-black">
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 border-b border-dotted border-zinc-400 pb-2">
                <span className="w-48 shrink-0 pt-1">Comment on Power house:</span>
                <textarea rows={2} value={formData.powerHouseComment} disabled={readOnly} onChange={(e) => updateField('powerHouseComment', e.target.value)}
                  placeholder="Enter comments on power house cleanliness & condition..."
                  className="flex-1 w-full bg-zinc-50 border border-zinc-400 rounded p-1 text-[11px] font-normal text-black outline-none focus:border-black"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-1">
                <span className="w-48 shrink-0 pt-1">Comment on Environment:</span>
                <textarea rows={2} value={formData.environmentComment} disabled={readOnly}
                  onChange={(e) => updateField('environmentComment', e.target.value)}
                  placeholder="Enter comments on surrounding environment cleanliness..."
                  className="flex-1 w-full bg-zinc-50 border border-zinc-400 rounded p-1 text-[11px] font-normal text-black outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          {/* Section 2: OUTAGES/FAULTS OVER THE WEEK */}
          <div className="border-2 border-black mb-3">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              OUTAGES/FAULTS OVER THE WEEK
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-[10px] border-collapse bg-white">
                <thead>
                  <tr className="bg-zinc-100 text-black font-bold uppercase text-[9px] border-b border-black">
                    <th className="w-20 p-1 border-r border-black">DAYS</th>
                    <th className="w-28 p-1 border-r border-black">DATE</th>
                    <th className="w-24 p-1 border-r border-black">TIME OUT</th>
                    <th className="w-28 p-1 border-r border-black">TIME RESTORED</th>
                    <th className="p-1 border-r border-black">REMARK</th>
                    {!readOnly && <th className="no-print w-8 p-1">DEL</th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.outages.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-400 hover:bg-zinc-50 text-[10px] h-7">
                      <td className="border-r border-black p-1 font-bold bg-zinc-50 text-center">
                        <input type="text" value={entry.day} disabled={readOnly} 
                        onChange={(e) => updateOutage(entry.id, 'day', e.target.value)} 
                        className="w-full text-center font-bold text-black uppercase bg-transparent" />
                      </td>
                      <td className="border-r border-black p-1">
                        <input type="date" value={entry.date} disabled={readOnly}
                          onChange={(e) => updateOutage(entry.id, 'date', e.target.value)}
                          className="w-full text-center font-mono text-black bg-transparent" />
                      </td>
                      <td className="border-r border-black p-1">
                        <input type="text" value={entry.timeOut} disabled={readOnly}
                          onChange={(e) => updateOutage(entry.id, 'timeOut', e.target.value)}
                          placeholder="e.g. 10:30 AM"
                          className="w-full text-center font-mono text-black bg-transparent" />
                      </td>
                      <td className="border-r border-black p-1">
                        <input type="text" value={entry.timeRestored} disabled={readOnly}
                          onChange={(e) => updateOutage(entry.id, 'timeRestored', e.target.value)}
                          placeholder="e.g. 11:15 AM"
                          className="w-full text-center font-mono text-black bg-transparent" />
                      </td>
                      <td className="border-r border-black p-1 text-left">
                        <input type="text" value={entry.remark} disabled={readOnly}
                          onChange={(e) => updateOutage(entry.id, 'remark', e.target.value)}
                          placeholder="Enter remark / fault cause..."
                          className="w-full font-normal text-black bg-transparent px-1" />
                      </td>
                      {!readOnly && (
                        <td className="no-print p-1 text-center">
                          <button type="button" onClick={() => handleRemoveOutageRow(entry.id)} 
                           className="text-red-600 font-bold hover:text-red-800">
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly && (
              <div className="no-print p-1.5 bg-zinc-100 border-t border-black flex justify-start">
                <button type="button" onClick={handleAddOutageRow}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] px-3 py-1 rounded font-mono font-medium">
                  + Add Outage Entry Row
                </button>
              </div>
            )}
          </div>

          {/* Section 3: EQUIPMENT REMARKS */}
          <div className="border-2 border-black mb-3">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              WEEKLY EQUIPMENT REMARKS
            </div>
            <div className="divide-y divide-zinc-400 text-[10px] font-bold text-black">
              {[
                { field: 'remarkBess' as const, label: 'REMARK ON BESS' },
                { field: 'remarkInverters' as const, label: 'REMARK ON INVERTERS' },
                { field: 'remarkChargeControllers' as const, label: 'REMARK ON CHARGE CONTROLLERS' },
                { field: 'remarkDieselGenerator' as const, label: 'REMARK ON DIESEL GENERATOR' },
                { field: 'remarkCoolingSystem' as const, label: 'REMARK ON COOLING SYSTEM' },
                { field: 'remarkMeteringVending' as const, label: 'REMARK ON METERING/VENDING' },
                { field: 'remarkGridLine' as const, label: 'REMARK ON GRID LINE' },
                { field: 'remarkFireExtinguisherSafetyTools' as const, label: 'REMARK ON FIRE EXTINGUISHER AND SAFETY TOOLS' },
                { field: 'remarkSpds' as const, label: 'REMARK ON SPDs' },
              ].map(({ field, label }) => (
                <div key={field} className="flex flex-col sm:flex-row sm:items-start p-1.5 gap-1">
                  <span className="w-72 shrink-0 uppercase tracking-wide font-extrabold text-[10px] pt-1">
                    {label}
                  </span>
                  <input type="text" value={formData[field]} disabled={readOnly} onChange={(e) => updateField(field, e.target.value)}
                    placeholder={`Enter details for ${label.toLowerCase()}...`}
                    className="flex-1 w-full bg-zinc-50 border border-zinc-300 rounded p-1 text-[11px] font-normal text-black outline-none focus:border-black" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: WEEKLY ACTIVITIES & COMMENTS */}
          <div className="border-2 border-black">
            <div className="bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-wider text-center py-1 border-b border-black">
              WEEKLY LOG & GENERAL COMMENTS
            </div>
            <div className="divide-y divide-zinc-400 text-[10px] font-bold text-black">
              {[
                { field: 'visitorReceived' as const, label: 'VISITOR RECEIVED WITHIN THE WEEK' },
                { field: 'maintenanceCarriedOut' as const, label: 'MAINTENANCE CARRIED OUT WITHIN THE WEEK' },
                { field: 'housekeepingActivities' as const, label: 'HOUSE KEEPING ACTIVITIES WITHIN THE WEEK' },
                { field: 'anyOtherComment' as const, label: 'ANY OTHER COMMENT' },
              ].map(({ field, label }) => (
                <div key={field} className="flex flex-col sm:flex-row sm:items-start p-1.5 gap-1">
                  <span className="w-72 shrink-0 uppercase tracking-wide font-extrabold text-[10px] pt-1">
                    {label}
                  </span>
                  <textarea rows={2} value={formData[field]} disabled={readOnly} onChange={(e) => updateField(field, e.target.value)}
                    placeholder={`Enter details for ${label.toLowerCase()}...`}
                    className="flex-1 w-full bg-zinc-50 border border-zinc-300 rounded p-1 text-[11px] font-normal text-black outline-none focus:border-black"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* Fast Grid Interactive Mode */
        <div className="bg-card border border-border rounded-lg p-5 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/50 p-4 rounded-lg border border-border">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase font-bold">Site Name</label>
              <input
                type="text"
                value={formData.siteName}
                disabled={readOnly}
                onChange={(e) => updateField('siteName', e.target.value)}
                placeholder="e.g. Kuka Renewable Site"
                className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase font-bold">Supervisor Name</label>
              <input
                type="text"
                value={formData.supervisorName}
                disabled={readOnly}
                onChange={(e) => updateField('supervisorName', e.target.value)}
                placeholder="Supervisor Name"
                className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase font-bold">Operator Name</label>
              <input
                type="text"
                value={formData.operatorName}
                disabled={readOnly}
                onChange={(e) => updateField('operatorName', e.target.value)}
                placeholder="Operator Name"
                className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground mt-1"
              />
            </div>
          </div>

          {/* Cleanliness */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">
              Facility Cleanliness
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Power House Comment</label>
                <textarea rows={3} value={formData.powerHouseComment}
                  disabled={readOnly} onChange={(e) => updateField('powerHouseComment', e.target.value)}
                  className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Environment Comment</label>
                <textarea rows={3} value={formData.environmentComment} disabled={readOnly}
                  onChange={(e) => updateField('environmentComment', e.target.value)}
                  className="w-full bg-secondary border border-border rounded p-2 text-xs text-foreground mt-1" />
              </div>
            </div>
          </div>

          {/* Equipment Remarks */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">
              Equipment Remarks Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { field: 'remarkBess' as const, label: 'BESS' },
                { field: 'remarkInverters' as const, label: 'Inverters' },
                { field: 'remarkChargeControllers' as const, label: 'Charge Controllers' },
                { field: 'remarkDieselGenerator' as const, label: 'Diesel Generator' },
                { field: 'remarkCoolingSystem' as const, label: 'Cooling System' },
                { field: 'remarkMeteringVending' as const, label: 'Metering / Vending' },
                { field: 'remarkGridLine' as const, label: 'Grid Line' },
                { field: 'remarkFireExtinguisherSafetyTools' as const, label: 'Safety / Fire Tools' },
                { field: 'remarkSpds' as const, label: 'SPDs' },
              ].map(({ field, label }) => (
                <div key={field} className="bg-secondary/40 border border-border/70 p-3 rounded-md">
                  <label className="text-xs font-mono font-bold text-foreground block">{label}</label>
                  <input type="text" value={formData[field]} disabled={readOnly} onChange={(e) => updateField(field, e.target.value)}
                    placeholder="Status / remark..."
                    className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Photo & Evidence Uploader at End of Report */}
      <ReportPhotoUploader
        attachments={formData.attachments || []}
        onChange={(attachments) => updateField('attachments', attachments)}
        readOnly={readOnly}
        title="Weekly Site Photos & Visual Evidence"
        description="Attach photos of power house condition, equipment status, damage or maintenance work performed."
      />

      {/* Live PDF Export & Print Modal */}
      {showPdfModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">📄</span>
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground">
                    Live PDF Export & Physical Print Preview
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Official 1:1 format replica of Weekly Site Report Form
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-primary hover:bg-primary-hover text-white font-mono text-xs px-4 py-2 rounded flex items-center gap-1.5 shadow"
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm px-3 py-1.5"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-800 flex justify-center">
              <div className="w-full max-w-3xl scale-95 origin-top">
                {/* Print Sheet Copy */}
                <div className="paper-sheet p-6 rounded shadow-2xl bg-white text-black font-sans">
                  {/* Header: Logo Top Left */}
                  <div className="flex items-stretch border-2 border-black mb-1">
                    <div className="w-44 p-2 border-r-2 border-black flex flex-col justify-center items-center text-center shrink-0">
                      <img src={logoImg} alt="GVE Logo" className="max-h-10 max-w-full object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center py-2">
                      <h1 className="text-sm font-extrabold text-black uppercase">WEEKLY SITE REPORT FORM</h1>
                    </div>
                  </div>

                  <div className="border-2 border-black text-[10px] font-bold text-black mb-2 divide-y divide-black">
                    <div className="p-1">SITE NAME: {formData.siteName}</div>
                    <div className="grid grid-cols-2 divide-x divide-black p-1">
                      <div>SUPERVISOR: {formData.supervisorName}</div>
                      <div>DATE: {formData.supervisorDate}</div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-black p-1">
                      <div>OPERATOR: {formData.operatorName}</div>
                      <div>DATE: {formData.operatorDate}</div>
                    </div>
                  </div>

                  <div className="border border-black p-2 mb-2 text-[9px]">
                    <p className="font-bold border-b border-black pb-1 mb-1 uppercase">Cleanliness Comments</p>
                    <p><strong>Power House:</strong> {formData.powerHouseComment || 'N/A'}</p>
                    <p><strong>Environment:</strong> {formData.environmentComment || 'N/A'}</p>
                  </div>

                  <div className="border border-black p-2 text-[9px]">
                    <p className="font-bold border-b border-black pb-1 mb-1 uppercase">Equipment Remarks</p>
                    <div className="grid grid-cols-2 gap-1">
                      <p><strong>BESS:</strong> {formData.remarkBess}</p>
                      <p><strong>Inverters:</strong> {formData.remarkInverters}</p>
                      <p><strong>Charge Controllers:</strong> {formData.remarkChargeControllers}</p>
                      <p><strong>Generator:</strong> {formData.remarkDieselGenerator}</p>
                      <p><strong>Cooling:</strong> {formData.remarkCoolingSystem}</p>
                      <p><strong>Metering:</strong> {formData.remarkMeteringVending}</p>
                      <p><strong>Grid:</strong> {formData.remarkGridLine}</p>
                      <p><strong>SPDs:</strong> {formData.remarkSpds}</p>
                    </div>
                  </div>

                  {/* Print Attached Photos Section */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-black">
                      <h4 className="text-[10px] font-bold uppercase text-black mb-2">
                        ATTACHED WEEKLY INSPECTION PHOTOS & EVIDENCE ({formData.attachments.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {formData.attachments.map((att) => (
                          <div key={att.id} className="border border-black p-1 bg-white flex flex-col gap-1">
                            <img
                              src={att.dataUrl || att.url}
                              alt={att.caption || att.name}
                              className="w-full h-28 object-cover border border-zinc-300"
                            />
                            <div className="text-[8px] font-mono leading-tight">
                              <span className="font-bold uppercase">[{att.category || 'GENERAL'}]: </span>
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
        </div>
      )}

      {/* Signature Canvas Modal */}
      {activeSigField && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-display font-bold text-foreground mb-1">
              Digital Signature Pad ({activeSigField === 'supervisor' ? 'Supervisor' : 'Operator'})
            </h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              Sign below using touch or cursor to authorize report
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
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs font-mono text-amber-400 hover:underline"
              >
                Clear Pad
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSigField(null)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-medium px-4 py-1.5 rounded"
                >
                  Attach Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2nd Verification Submit Modal */}
      {showSubmitConfirmModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-600 flex items-center justify-center text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white">Confirm Final Submission</h3>
                <p className="text-xs text-zinc-400 font-mono">2-Step Verification Check</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to finalize and submit this Weekly Site Report? Once submitted, it will be locked and sent to Site Administrators for formal compliance review.
            </p>

            <div className="p-3 rounded bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs font-mono space-y-1">
              <p className="font-bold text-amber-400 flex items-center gap-1">
                <span>💡</span> Accidental click?
              </p>
              <p>If you meant to save your progress and continue working later, select <strong>"Save as Draft"</strong> in the main screen.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-3.5 py-1.5 rounded text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button type="button" onClick={(e) => {
                setShowSubmitConfirmModal(false)
                handleSubmitFinal(e)
              }}
                className="px-4 py-1.5 rounded text-xs font-mono bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow flex items-center gap-1.5">
                 Confirm & Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
