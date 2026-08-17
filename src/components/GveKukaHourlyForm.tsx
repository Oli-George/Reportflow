import React, { useState, useRef } from 'react'
import logoImg from './logo.jpeg'
import {
  GveKukaRecordData,
  GveKukaHourlyEntry,
  DEFAULT_12HR_TIMES,
  createEmptyGveEntry,
} from '../types/gveKuka'

interface GveKukaHourlyFormProps {
  initialData?: GveKukaRecordData
  readOnly?: boolean
  onSave?: (data: GveKukaRecordData, status: 'Draft' | 'Submitted') => void
  onCancel?: () => void
}

export default function GveKukaHourlyForm({
  initialData,
  readOnly = false,
  onSave,
  onCancel,
}: GveKukaHourlyFormProps) {
  const today = new Date()
  const defaultDateStr = today.toISOString().split('T')[0]
  const defaultDayStr = today.toLocaleDateString('en-US', { weekday: 'long' })
  const defaultYearStr = today.getFullYear().toString()

  const [date, setDate] = useState(initialData?.date || defaultDateStr)
  const [day, setDay] = useState(initialData?.day || defaultDayStr)
  const [year, setYear] = useState(initialData?.year || defaultYearStr)
  const [title] = useState(initialData?.title || `GVE Site Hourly Record — ${defaultDateStr}`)

  const [entries, setEntries] = useState<GveKukaHourlyEntry[]>(() => {
    if (initialData?.entries && initialData.entries.length > 0) {
      return initialData.entries
    }
    return DEFAULT_12HR_TIMES.map((time, idx) => createEmptyGveEntry(time, idx))
  })

  const [viewMode, setViewMode] = useState<'paper' | 'interactive'>('paper')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)
  const [signatureCanvasOpen, setSignatureCanvasOpen] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleEntryChange = (
    id: string,
    section: keyof GveKukaHourlyEntry,
    field: string,
    value: string
  ) => {
    if (readOnly) return
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry
        if (section === 'time' || section === 'operatorName' || section === 'operatorSignature') {
          return { ...entry, [section]: value }
        }
        const subObj = entry[section] as Record<string, string>
        return {
          ...entry,
          [section]: {
            ...subObj,
            [field]: value,
          },
        }
      })
    )
  }

  const handleAddRow = () => {
    if (readOnly) return
    const lastTime = entries[entries.length - 1]?.time || '12:00 PM'
    const newEntry = createEmptyGveEntry(`${lastTime} (Extra)`, entries.length)
    setEntries((prev) => [...prev, newEntry])
  }

  const handleRemoveRow = (id: string) => {
    if (readOnly || entries.length <= 1) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
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

  const saveSignature = (entryId: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, operatorSignature: dataUrl } : e))
    )
    setSignatureCanvasOpen(null)
  }

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave) {
      onSave({
        siteName: 'GVE KUKA SITE',
        title,
        date,
        day,
        year,
        entries,
      }, 'Draft')
    }
  }

  const handleSubmitFinal = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave) {
      onSave({
        siteName: 'GVE KUKA SITE',
        title,
        date,
        day,
        year,
        entries,
      }, 'Submitted')
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
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <h2 className="text-sm font-display font-600 text-foreground uppercase tracking-wider">
            GVE KUKA Site Hourly Record Form
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
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
        <div className="print-area paper-sheet p-4 md:p-6 rounded-lg overflow-x-auto border border-zinc-300 text-black">
          {/* Header Section matching HOURLY RECORD KUKA.pdf */}
          <div className="flex items-stretch border border-black mb-1 bg-white">
            {/* Logo */}
            <div className="w-48 p-2 border-r border-black flex flex-col justify-center items-center text-center">
              <img src={logoImg} alt="GVE Logo" className="max-h-12 max-w-full object-contain" />
            </div>

            {/* Title */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 bg-white">
              <h1 className="text-sm font-bold tracking-widest text-black uppercase">GVE KUKA SITE</h1>
              <h2 className="text-xs font-bold tracking-wider text-black uppercase mt-0.5">HOURLY RECORD</h2>
            </div>
          </div>

          {/* Date / Day / Year Bar */}
          <div className="grid grid-cols-3 border-x border-b border-black text-center text-[10px] font-bold uppercase mb-2 bg-zinc-100 py-1">
            <div className="flex items-center justify-center gap-2 border-r border-black px-2">
              <span>DATE:</span>
              <input
                type="text"
                value={date}
                disabled={readOnly}
                onChange={(e) => setDate(e.target.value)}
                className="w-28 text-center font-mono font-bold uppercase"
              />
            </div>
            <div className="flex items-center justify-center gap-2 border-r border-black px-2">
              <span>DAY:</span>
              <input
                type="text"
                value={day}
                disabled={readOnly}
                onChange={(e) => setDay(e.target.value)}
                className="w-28 text-center font-mono font-bold uppercase"
              />
            </div>
            <div className="flex items-center justify-center gap-2 px-2">
              <span>YEAR:</span>
              <input
                type="text"
                value={year}
                disabled={readOnly}
                onChange={(e) => setYear(e.target.value)}
                className="w-20 text-center font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* Main Paper Grid Table */}
          <div className="paper-grid overflow-x-auto">
            <table className="w-full text-center text-[9px] border-collapse bg-white">
              <thead>
                {/* Row 1 Header Categories */}
                <tr className="bg-zinc-200 text-black font-bold uppercase text-[9px]">
                  <th rowSpan={2} className="w-16 p-1 border border-black">TIME</th>
                  <th colSpan={4} className="p-1 border border-black ">PV</th>
                  <th colSpan={4} className="p-1 border border-black ">BATTERY</th>
                  <th colSpan={8} className="p-1 border border-black ">LOAD</th>
                  <th colSpan={8} className="p-1 border border-black ">GRID/DG</th>
                  <th colSpan={2} className="p-1 border border-black ">SPD CONDITION</th>
                  <th colSpan={2} className="p-1 border border-black ">COOLING SYSTEM</th>
                  <th rowSpan={2} className="w-28 p-1 border border-black">OPERATOR<br/><span className="text-[7px] font-normal lowercase">Name & signature</span></th>
                  {!readOnly && <th rowSpan={2} className="no-print w-8 border border-black">DEL</th>}
                </tr>
                {/* Row 2 Sub-headers with units */}
                <tr className="bg-zinc-100 text-black font-bold text-[8px] uppercase">
                  {/* PV */}
                  <th className="p-0.5 border border-black">VOLT<br/>(V)</th>
                  <th className="p-0.5 border border-black">CURR<br/>(A)</th>
                  <th className="p-0.5 border border-black">POWER<br/>(KW)</th>
                  <th className="p-0.5 border border-black">ENERGY<br/>(kWh)</th>
                  {/* BATTERY */}
                  <th className="p-0.5 border border-black">VOLT<br/>(V)</th>
                  <th className="p-0.5 border border-black">CURR<br/>(A)</th>
                  <th className="p-0.5 border border-black">SOC<br/>(%)</th>
                  <th className="p-0.5 border border-black">SOH<br/>(%)</th>
                  {/* LOAD */}
                  <th className="p-0.5 border border-black">L1<br/>(V)</th>
                  <th className="p-0.5 border border-black">L1<br/>(A)</th>
                  <th className="p-0.5 border border-black">L2<br/>(V)</th>
                  <th className="p-0.5 border border-black">L2<br/>(C)</th>
                  <th className="p-0.5 border border-black">L3<br/>(V)</th>
                  <th className="p-0.5 border border-black">L3<br/>(C)</th>
                  <th className="p-0.5 border border-black">POWER<br/>(KW)</th>
                  <th className="p-0.5 border border-black">ENERGY<br/>(kWh)</th>
                  {/* GRID/DG */}
                  <th className="p-0.5 border border-black">L1<br/>(V)</th>
                  <th className="p-0.5 border border-black">L1<br/>(A)</th>
                  <th className="p-0.5 border border-black">L2<br/>(V)</th>
                  <th className="p-0.5 border border-black">L2<br/>(C)</th>
                  <th className="p-0.5 border border-black">L3<br/>(V)</th>
                  <th className="p-0.5 border border-black">L3<br/>(C)</th>
                  <th className="p-0.5 border border-black">POWER<br/>(KW)</th>
                  <th className="p-0.5 border border-black">ENERGY<br/>(kWh)</th>
                  {/* SPD */}
                  <th className="p-0.5 border border-black">IN<br/>(GGGG)</th>
                  <th className="p-0.5 border border-black">OUT<br/>(GGGG)</th>
                  {/* COOLING */}
                  <th className="p-0.5 border border-black">AC1</th>
                  <th className="p-0.5 border border-black">AC2</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50 font-mono text-[9px] h-7">
                    {/* Time (12-hour format) */}
                    <td className="border border-black p-0.5 bg-zinc-50 font-semibold text-center">
                      <input
                        type="text"
                        value={entry.time}
                        disabled={readOnly}
                        onChange={(e) => handleEntryChange(entry.id, 'time', '', e.target.value)}
                        className="w-full text-center font-bold"
                      />
                    </td>
                    {/* PV */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.pv.volt} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'pv', 'volt', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.pv.curr} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'pv', 'curr', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.pv.power} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'pv', 'power', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.pv.energy} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'pv', 'energy', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    {/* BATTERY */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.battery.volt} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'battery', 'volt', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.battery.curr} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'battery', 'curr', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.battery.soc} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'battery', 'soc', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.battery.soh} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'battery', 'soh', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    {/* LOAD */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l1_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l1_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l1_a} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l1_a', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l2_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l2_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l2_c} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l2_c', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l3_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l3_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.l3_c} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'l3_c', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.power} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'power', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.load.energy} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'load', 'energy', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    {/* GRID/DG */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l1_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l1_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l1_a} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l1_a', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l2_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l2_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l2_c} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l2_c', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l3_v} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l3_v', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.l3_c} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'l3_c', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.power} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'power', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.grid.energy} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'grid', 'energy', e.target.value)} className="w-full text-center" placeholder="—" />
                    </td>
                    {/* SPD */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.spd.in} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'spd', 'in', e.target.value)} className="w-full text-center" placeholder="GOOD" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.spd.out} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'spd', 'out', e.target.value)} className="w-full text-center" placeholder="GOOD" />
                    </td>
                    {/* COOLING */}
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.cooling.ac1} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'cooling', 'ac1', e.target.value)} className="w-full text-center" placeholder="ON" />
                    </td>
                    <td className="border border-black p-0.5">
                      <input type="text" value={entry.cooling.ac2} disabled={readOnly} onChange={(e) => handleEntryChange(entry.id, 'cooling', 'ac2', e.target.value)} className="w-full text-center" placeholder="ON" />
                    </td>
                    {/* OPERATOR */}
                    <td className="border border-black p-0.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <input
                          type="text"
                          value={entry.operatorName}
                          disabled={readOnly}
                          onChange={(e) => handleEntryChange(entry.id, 'operatorName', '', e.target.value)}
                          placeholder="Op. Name"
                          className="w-full text-center font-bold text-[8px]"
                        />
                        {entry.operatorSignature ? (
                          <img src={entry.operatorSignature} alt="Sig" className="h-4 object-contain" />
                        ) : !readOnly ? (
                          <button
                            type="button"
                            onClick={() => setSignatureCanvasOpen(entry.id)}
                            className="no-print text-[8px] bg-emerald-800 text-white px-1 rounded hover:bg-emerald-700"
                          >
                            Sign
                          </button>
                        ) : null}
                      </div>
                    </td>
                    {!readOnly && (
                      <td className="no-print border border-black p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(entry.id)}
                          className="text-red-600 font-bold hover:text-red-800"
                        >
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
            <div className="no-print mt-2 flex justify-start">
              <button
                type="button"
                onClick={handleAddRow}
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-mono font-medium"
              >
                + Add Hourly Entry Row
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Fast Grid Interactive Mode */
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase">Log Date</label>
              <input
                type="date"
                value={date}
                disabled={readOnly}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase">Day of Week</label>
              <input
                type="text"
                value={day}
                disabled={readOnly}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase">Year</label>
              <input
                type="text"
                value={year}
                disabled={readOnly}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground mt-1"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-2 border-b border-border">Time (12-hr)</th>
                  <th className="p-2 border-b border-border">PV (Volt/Curr/kW)</th>
                  <th className="p-2 border-b border-border">Battery (Volt/Curr/SOC)</th>
                  <th className="p-2 border-b border-border">Load Power</th>
                  <th className="p-2 border-b border-border">Grid Power</th>
                  <th className="p-2 border-b border-border">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary/40">
                    <td className="p-2 font-bold text-emerald-400">{e.time}</td>
                    <td className="p-2">
                      {e.pv.volt || '0'}V / {e.pv.curr || '0'}A / {e.pv.power || '0'}kW
                    </td>
                    <td className="p-2">
                      {e.battery.volt || '0'}V / {e.battery.curr || '0'}A / SOC: {e.battery.soc || '0'}%
                    </td>
                    <td className="p-2">{e.load.power || '0'} kW</td>
                    <td className="p-2">{e.grid.power || '0'} kW</td>
                    <td className="p-2">{e.operatorName || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    Official 1:1 format replica of GVE KUKA Site Hourly Record
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
                <div className="paper-sheet p-6 rounded shadow-2xl">
                  {/* Render copy of physical sheet */}
                  <div className="flex items-stretch border border-black mb-1 bg-white">
                    <div className="w-48 p-2 border-r border-black flex flex-col justify-center items-center text-center">
                      <img src={logoImg} alt="GVE Logo" className="max-h-10 max-w-full object-contain mx-auto" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center py-2">
                      <h1 className="text-sm font-bold text-black uppercase">GVE KUKA SITE</h1>
                      <h2 className="text-xs font-bold text-black uppercase">HOURLY RECORD</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-x border-b border-black text-center text-[10px] font-bold uppercase mb-2 bg-zinc-100 py-1">
                    <div>DATE: {date}</div>
                    <div>DAY: {day}</div>
                    <div>YEAR: {year}</div>
                  </div>

                  <div className="paper-grid overflow-x-auto">
                    <table className="w-full text-center text-[8px] border-collapse bg-white">
                      <thead>
                        <tr className= "text-black font-bold uppercase">
                          <th rowSpan={2} className="w-12 border border-black">TIME</th>
                          <th colSpan={4} className="border border-black bg-emerald-100">PV</th>
                          <th colSpan={4} className="border border-black bg-emerald-200">BATTERY</th>
                          <th colSpan={8} className="border border-black bg-blue-100">LOAD</th>
                          <th colSpan={8} className="border border-black bg-purple-100">GRID/DG</th>
                          <th colSpan={2} className="border border-black bg-amber-100">SPD</th>
                          <th colSpan={2} className="border border-black bg-cyan-100">COOLING</th>
                          <th rowSpan={2} className="w-20 border border-black">OPERATOR</th>
                        </tr>
                        <tr className="bg-zinc-100 text-black font-bold text-[7px]">
                          <th>VOLT</th><th>CURR</th><th>POWER</th><th>ENERGY</th>
                          <th>VOLT</th><th>CURR</th><th>SOC</th><th>SOH</th>
                          <th>L1(V)</th><th>L1(A)</th><th>L2(V)</th><th>L2(C)</th><th>L3(V)</th><th>L3(C)</th><th>POWER</th><th>ENERGY</th>
                          <th>L1(V)</th><th>L1(A)</th><th>L2(V)</th><th>L2(C)</th><th>L3(V)</th><th>L3(C)</th><th>POWER</th><th>ENERGY</th>
                          <th>IN</th><th>OUT</th>
                          <th>AC1</th><th>AC2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.id} className="h-6 font-mono text-[8px]">
                            <td className="border border-black bg-zinc-50 font-bold">{e.time}</td>
                            <td className="border border-black">{e.pv.volt}</td>
                            <td className="border border-black">{e.pv.curr}</td>
                            <td className="border border-black">{e.pv.power}</td>
                            <td className="border border-black">{e.pv.energy}</td>
                            <td className="border border-black">{e.battery.volt}</td>
                            <td className="border border-black">{e.battery.curr}</td>
                            <td className="border border-black">{e.battery.soc}</td>
                            <td className="border border-black">{e.battery.soh}</td>
                            <td className="border border-black">{e.load.l1_v}</td>
                            <td className="border border-black">{e.load.l1_a}</td>
                            <td className="border border-black">{e.load.l2_v}</td>
                            <td className="border border-black">{e.load.l2_c}</td>
                            <td className="border border-black">{e.load.l3_v}</td>
                            <td className="border border-black">{e.load.l3_c}</td>
                            <td className="border border-black">{e.load.power}</td>
                            <td className="border border-black">{e.load.energy}</td>
                            <td className="border border-black">{e.grid.l1_v}</td>
                            <td className="border border-black">{e.grid.l1_a}</td>
                            <td className="border border-black">{e.grid.l2_v}</td>
                            <td className="border border-black">{e.grid.l2_c}</td>
                            <td className="border border-black">{e.grid.l3_v}</td>
                            <td className="border border-black">{e.grid.l3_c}</td>
                            <td className="border border-black">{e.grid.power}</td>
                            <td className="border border-black">{e.grid.energy}</td>
                            <td className="border border-black">{e.spd.in}</td>
                            <td className="border border-black">{e.spd.out}</td>
                            <td className="border border-black">{e.cooling.ac1}</td>
                            <td className="border border-black">{e.cooling.ac2}</td>
                            <td className="border border-black font-bold">
                              {e.operatorName}
                              {e.operatorSignature && (
                                <img src={e.operatorSignature} alt="Sig" className="h-3 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signatureCanvasOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-display font-bold text-foreground mb-1">
              Digital Signature Pad
            </h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              Sign below using touch or cursor to authorize entry
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
                  onClick={() => setSignatureCanvasOpen(null)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveSignature(signatureCanvasOpen)}
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
              Are you sure you want to finalize and submit this report? Once submitted, it will be locked and sent to Site Administrators for formal compliance review.
            </p>

            <div className="p-3 rounded bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs font-mono space-y-1">
              <p className="font-bold text-amber-400 flex items-center gap-1">
                <span>💡</span> Accidental click?
              </p>
              <p>If you meant to save your progress and continue working later, select <strong>"Save as Draft Instead"</strong> below.</p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={(e) => {
                  setShowSubmitConfirmModal(false)
                  handleSubmitFinal(e)
                }}
                className="w-full py-2 px-4 rounded bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2"
              >
                <span>🚀</span> Yes, Confirm & Submit Report
              </button>

              <button
                type="button"
                onClick={(e) => {
                  setShowSubmitConfirmModal(false)
                  handleSaveDraft(e)
                }}
                className="w-full py-2 px-4 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 text-xs font-mono transition-all flex items-center justify-center gap-2"
              >
                <span>💾</span> No, Save as Draft Instead
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="w-full py-1.5 px-4 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
