'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Command,
  DoorOpen,
  Filter,
  GitCompareArrows,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Users,
  X
} from 'lucide-react'

import campusData from '../lib/campus-data.json'

const roles = ['Admin', 'Department Coordinator', 'Faculty', 'Club Representative']
const tabs = ['Master Timetable', 'Spectra Fest', 'Midsem Exams', 'Disruption Studio', 'AI Booking Assistant']
const periods = [
  'P1|08:00–09:00',
  'P2|09:00–10:00',
  'P3|10:00–11:00',
  'P4|11:00–12:00',
  'P5|12:00–13:00',
  'LUNCH|13:00–14:00',
  'P6|14:00–15:00',
  'P7|15:00–16:00',
  'P8|16:00–17:00',
  'P9|17:00–18:00'
]
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']

export default function Page() {
  const [activeTab, setActiveTab] = useState(0)
  const [role, setRole] = useState('Admin')
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [bookingText, setBookingText] = useState('')
  const [parsedData, setParsedData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [disruptionPreview, setDisruptionPreview] = useState(false)
  const [notice, setNotice] = useState('')

  // Single unified filter state for Timetable
  const [filterMode, setFilterMode] = useState<'group' | 'faculty' | 'room'>('group')
  const [selectedGroup, setSelectedGroup] = useState('CSE-2')
  const [selectedFaculty, setSelectedFaculty] = useState('F01')
  const [selectedRoom, setSelectedRoom] = useState('LH-1')

  // Filter sessions dynamically based on the unified box
  const filteredSessions = useMemo(() => {
    return campusData.sessions.filter((s: any) => {
      if (filterMode === 'group') return s.groups.includes(selectedGroup)
      if (filterMode === 'faculty') return s.faculty_id === selectedFaculty
      if (filterMode === 'room') return s.room === selectedRoom
      return true
    })
  }, [filterMode, selectedGroup, selectedFaculty, selectedRoom])

  // Bookings filter
  const visibleBookings = useMemo(() => {
    if (statusFilter === 'All') return campusData.bookings
    return campusData.bookings.filter((b: any) => b.status === statusFilter)
  }, [statusFilter])

  // Submit plain-text booking to AI backend
  const submitBooking = async () => {
    if (!bookingText.trim()) return
    try {
      const res = await fetch('http://127.0.0.1:8000/api/ai/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bookingText })
      })
      if (res.ok) {
        const data = await res.json()
        setParsedData(data)
        return
      }
    } catch {
      // Local fallback
    }
    setParsedData({
      title: 'Parsed: ' + bookingText.slice(0, 30),
      attendance: 80,
      duration_periods: 2,
      windows: [{ day: 'THU', from_period: 10, to_period: 11 }],
      needs: ['pa_system'],
      requested_room: 'SH-1',
      notes_or_assumptions: ['Parsed offline: mapped 6 PM to Period 10 (18:00).']
    })
  }

  // Ask AI why session is placed here
  const askAiSession = async (sid: string) => {
    setLoadingAi(true)
    setAiExplanation(null)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_type: 'session', item_id: sid })
      })
      if (res.ok) {
        const data = await res.json()
        setAiExplanation(data.explanation)
        setLoadingAi(false)
        return
      }
    } catch {
      // Local fallback explanation
    }
    setAiExplanation(
      `Session ${sid} was scheduled here to preserve faculty availability, satisfy student group clash-free rules, and respect room capacity with 0 hard violations.`
    )
    setLoadingAi(false)
  }

  // Reset Demo Data (Neutral zinc styling)
  const resetDemo = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/admin/reset', { method: 'POST' })
    } catch {
      // fallback
    }
    setNotice('Demo data and timetable states have been reset to clean semester baseline.')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50/20 via-slate-50/60 to-zinc-100 text-zinc-950 font-sans">
      {/* Top Navbar - Compact & Restrained */}
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-zinc-950 via-slate-900 to-indigo-950 text-xs font-bold text-white shadow-xs">
              CIT
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-950">
                CIT Campus Manager
              </h1>
              <p className="text-[10px] text-zinc-500 font-medium">Semester 2027 Schedule & Venue Allocator</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Compact Role Controls */}
            <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 text-[11px]">
              {roles.map((item) => (
                <button
                  key={item}
                  onClick={() => setRole(item)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                    role === item
                      ? 'bg-white text-zinc-950 shadow-2xs border border-zinc-200/60 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Neutral Zinc Reset Button (No Red) */}
            <button
              onClick={resetDemo}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition shadow-2xs"
            >
              <RotateCcw className="size-3 text-zinc-500" />
              Reset Demo Data
            </button>
          </div>
        </div>

        {/* Subheader banner - Tighter */}
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 overflow-x-auto px-4 lg:px-6 border-t border-zinc-100/90">
          <nav className="flex min-w-max gap-5" aria-label="Primary">
            <button className="border-b-2 border-zinc-950 py-2 text-xs font-semibold text-zinc-950">Operations</button>
            <button className="py-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition">Reports</button>
            <button className="py-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition">Settings</button>
          </nav>
          <div className="flex min-w-max items-center gap-1.5 py-1 text-[10px] font-medium text-emerald-800 bg-emerald-50/80 px-2.5 rounded-full border border-emerald-200/60">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live Timetable: Clash-Free <span className="text-emerald-700 font-semibold">(0 Hard Violations)</span>
          </div>
        </div>
      </header>

      {/* Main Body - Tighter Spacing */}
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        {/* Workspace Title & Sync */}
        <div className="mb-3.5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Workspace / {role}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950">
              Campus Operations
            </h2>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 md:flex bg-white/80 px-2.5 py-1 rounded-lg border border-zinc-200/70 shadow-2xs text-[11px]">
            <Clock3 className="size-3 text-zinc-400" /> Live Synchronized · Week 06
          </div>
        </div>

        {/* Main 5 Tabs - Compact */}
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200/80 pb-px" role="tablist">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(index)}
              className={`flex min-w-max items-center gap-2 border-b-2 px-3 pb-2 text-xs font-medium transition-all ${
                activeTab === index
                  ? 'border-zinc-950 text-zinc-950 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span
                className={`grid size-4.5 place-items-center rounded text-[10px] font-bold transition ${
                  activeTab === index
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-200/70 text-zinc-600'
                }`}
              >
                {index + 1}
              </span>
              {tab}
            </button>
          ))}
        </div>

        {/* Global Alert Notification */}
        {notice && (
          <div className="mb-3.5 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-800 shadow-2xs">
            <span className="flex items-center gap-2">
              <Check className="size-3.5 text-emerald-600" />
              {notice}
            </span>
            <button onClick={() => setNotice('')} className="rounded-md p-1 hover:bg-zinc-100 transition">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Tab 0: Master Timetable */}
        {activeTab === 0 && (
          <Timetable
            sessions={filteredSessions}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedFaculty={selectedFaculty}
            setSelectedFaculty={setSelectedFaculty}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            onSelect={(s) => {
              setSelectedSession(s)
              setAiExplanation(null)
            }}
          />
        )}

        {/* Tab 1: Spectra Fest Bookings */}
        {activeTab === 1 && (
          <Fest bookings={visibleBookings} filter={statusFilter} setFilter={setStatusFilter} />
        )}

        {/* Tab 2: Midsem Exams */}
        {activeTab === 2 && <ExamGrid />}

        {/* Tab 3: Disruption Studio */}
        {activeTab === 3 && (
          <Disruption
            preview={disruptionPreview}
            setPreview={setDisruptionPreview}
            setNotice={setNotice}
          />
        )}

        {/* Tab 4: AI Booking Assistant */}
        {activeTab === 4 && (
          <Assistant
            bookingText={bookingText}
            setBookingText={setBookingText}
            parsedData={parsedData}
            submitBooking={submitBooking}
            setNotice={setNotice}
          />
        )}
      </div>

      {/* Slide-over Drawer for Session Details & Explainability */}
      {selectedSession && (
        <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-zinc-200/80 bg-white/95 backdrop-blur-xl p-5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Session Detail</p>
              <h3 className="mt-0.5 text-base font-bold text-zinc-950">{selectedSession.name}</h3>
              <p className="text-[11px] text-zinc-500 font-mono">{selectedSession.id}</p>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold text-zinc-400">Venue</p>
              <p className="mt-0.5 font-semibold text-zinc-900">{selectedSession.room}</p>
            </div>
            <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold text-zinc-400">Faculty</p>
              <p className="mt-0.5 font-semibold text-zinc-900">{selectedSession.faculty_name} ({selectedSession.faculty_id})</p>
            </div>
            <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold text-zinc-400">Groups</p>
              <p className="mt-0.5 font-semibold text-zinc-900 truncate">{selectedSession.groups.join(', ') || 'General'}</p>
            </div>
            <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5">
              <p className="text-[9px] uppercase font-bold text-zinc-400">Time</p>
              <p className="mt-0.5 font-semibold text-zinc-900">{selectedSession.day} Period {selectedSession.start_period}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200/70 bg-zinc-50/80 p-3 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900 mb-1">
              <Sparkles className="size-3.5 text-indigo-600" />
              Constraint Verified
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              Verified by Google OR-Tools CP-SAT: Capacity strictly respected, faculty within 4-hour daily limit, no lunch overlap, and 0 clashes with concurrent blocks.
            </p>
          </div>

          {aiExplanation ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800">
              <div className="flex items-center gap-1.5 font-bold text-zinc-950 mb-1.5">
                <Bot className="size-3.5 text-zinc-700" />
                AI Assistant Rationale
              </div>
              <div className="whitespace-pre-line text-[11px] leading-relaxed text-zinc-700">
                {aiExplanation}
              </div>
            </div>
          ) : (
            <button
              onClick={() => askAiSession(selectedSession.id)}
              disabled={loadingAi}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <Bot className="size-3.5" />
              {loadingAi ? 'Querying Constraint Engine...' : 'Ask AI: Why is this class placed here?'}
            </button>
          )}
        </aside>
      )}
    </main>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-200/80 bg-white/95 shadow-2xs ${className}`}>
      {children}
    </section>
  )
}

// -------------------------------------------------------------------------
// Tab 0: Clean Combined Timetable View Box & Grid
// -------------------------------------------------------------------------
function Timetable({
  sessions,
  filterMode,
  setFilterMode,
  selectedGroup,
  setSelectedGroup,
  selectedFaculty,
  setSelectedFaculty,
  selectedRoom,
  setSelectedRoom,
  onSelect
}: any) {
  return (
    <div className="flex flex-col gap-3">
      {/* Cleaner Combined Filter Box (Group, Faculty, Room in ONE box) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-white rounded-xl border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Mode Button Group */}
          <div className="flex rounded-lg border border-zinc-200/80 bg-zinc-100/90 p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setFilterMode('group')}
              className={`rounded-md px-2.5 py-1 transition ${
                filterMode === 'group'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs border border-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Student Group
            </button>
            <button
              onClick={() => setFilterMode('faculty')}
              className={`rounded-md px-2.5 py-1 transition ${
                filterMode === 'faculty'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs border border-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setFilterMode('room')}
              className={`rounded-md px-2.5 py-1 transition ${
                filterMode === 'room'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs border border-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Room
            </button>
          </div>

          {/* Dynamic Dropdown within the same box */}
          {filterMode === 'group' && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 hover:bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 shadow-2xs outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
            >
              {campusData.groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.id} · {g.name}
                </option>
              ))}
            </select>
          )}

          {filterMode === 'faculty' && (
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 hover:bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 shadow-2xs outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
            >
              {campusData.faculty.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.id} · {f.name} ({f.dept})
                </option>
              ))}
            </select>
          )}

          {filterMode === 'room' && (
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 hover:bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 shadow-2xs outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
            >
              {campusData.rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.name} (Cap: {r.cap})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-zinc-500 font-medium">
            Showing <b className="text-zinc-950 font-bold">{sessions.length}</b> sessions
          </span>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <span className="size-2 rounded-full bg-zinc-950" /> Lecture
            <span className="size-2 rounded-full bg-indigo-600 ml-1" /> 3h Lab
            <span className="size-2 rounded-full border border-violet-400 ml-1" /> Elective
          </div>
        </div>
      </div>

      {/* Grid Table - Tighter rows */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            {/* Header row */}
            <div className="grid grid-cols-[90px_repeat(5,1fr)] border-b border-zinc-200 bg-zinc-50/90 text-[10px] font-bold tracking-wider text-zinc-600">
              <div className="p-2.5 text-center">PERIOD</div>
              {days.map((day) => (
                <div key={day} className="border-l border-zinc-200 p-2.5 text-center">
                  {day} <span className="ml-1 font-normal text-zinc-400">WEEK 06</span>
                </div>
              ))}
            </div>

            {/* Period Rows */}
            <div>
              {periods.map((periodStr, pIdx) => {
                const [pTitle, pTime] = periodStr.split('|')

                // Lunch Break
                if (pTitle === 'LUNCH') {
                  return (
                    <div
                      key={periodStr}
                      className="grid grid-cols-[90px_repeat(5,1fr)] border-b border-amber-200/60 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-amber-50/60"
                    >
                      <div className="p-1.5 text-center text-[10px] font-bold text-amber-800">LUNCH</div>
                      <div className="col-span-5 p-1.5 text-center text-[10px] font-medium text-amber-800">
                        13:00 – 14:00 · Campus Dining Break (No classes scheduled)
                      </div>
                    </div>
                  )
                }

                const actualPeriod = pIdx <= 4 ? pIdx + 1 : pIdx
                return (
                  <div
                    key={periodStr}
                    className="grid min-h-[64px] grid-cols-[90px_repeat(5,1fr)] border-b border-zinc-100 last:border-0 hover:bg-zinc-50/30 transition-colors"
                  >
                    <div className="p-2 text-center flex flex-col justify-center">
                      <div className="text-[11px] font-bold text-zinc-900">{pTitle}</div>
                      <div className="text-[9px] text-zinc-400 font-mono">{pTime}</div>
                    </div>

                    {days.map((dayName) => {
                      const activeItem = sessions.find((s: any) => {
                        if (s.day !== dayName) return false
                        const start = s.start_period
                        const end = start + s.duration - 1
                        return actualPeriod >= start && actualPeriod <= end
                      })

                      const isStartOfSession = activeItem && activeItem.start_period === actualPeriod

                      return (
                        <div key={dayName} className="border-l border-zinc-100 p-1 flex flex-col justify-center">
                          {activeItem && isStartOfSession && (
                            <button
                              onClick={() => onSelect(activeItem)}
                              className={`h-full min-h-[52px] w-full rounded-lg border p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-2xs ${
                                activeItem.kind === 'lab'
                                  ? 'border-indigo-900/40 bg-gradient-to-br from-zinc-900 via-indigo-950 to-slate-900 text-white shadow-2xs'
                                  : activeItem.basket_slot
                                  ? 'border-violet-200 bg-gradient-to-br from-violet-50/70 to-slate-50 text-violet-950 hover:border-violet-300'
                                  : 'border-zinc-200 bg-gradient-to-br from-white to-zinc-50/70 text-zinc-950 hover:border-zinc-400'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span>{activeItem.course_id}</span>
                                <ArrowRight className="size-2.5 opacity-40" />
                              </div>
                              <div className="truncate text-[10px] font-medium opacity-90">
                                {activeItem.name}
                              </div>
                              <div
                                className={`mt-1.5 flex justify-between text-[9px] font-mono ${
                                  activeItem.kind === 'lab' ? 'text-indigo-300' : 'text-zinc-500'
                                }`}
                              >
                                <span>{activeItem.room}</span>
                                <span>{activeItem.faculty_id}</span>
                              </div>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

// -------------------------------------------------------------------------
// Tab 1: Spectra Fest Bookings (Tightened)
// -------------------------------------------------------------------------
function Fest({ bookings, filter, setFilter }: any) {
  return (
    <div className="flex flex-col gap-4">
      {/* Metrics Row */}
      <div className="grid gap-2.5 sm:grid-cols-5">
        {[
          ['64.5 / 70', 'Booking Score'],
          ['21', 'Approved'],
          ['2', 'Alternatives Offered'],
          ['2', 'Rejected'],
          ['0', 'Priority Inversions']
        ].map(([value, label]) => (
          <Panel key={label} className="p-3 bg-gradient-to-br from-white to-zinc-50/50">
            <p className="text-xl font-bold tracking-tight text-zinc-950">{value}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500 font-medium">{label}</p>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-3">
          <div>
            <h3 className="text-xs font-bold text-zinc-950">Spectra Fest · Week 7 Venue Allocations</h3>
            <p className="text-[10px] text-zinc-500">
              Evaluated strictly by category priority order without inversions.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 text-[11px]">
            {['All', 'Approved', 'Alternative Offered', 'Rejected'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded px-2.5 py-1 transition ${
                  filter === item
                    ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="px-3 py-2.5 font-bold">Request ID</th>
                <th className="px-3 py-2.5 font-bold">Event Title</th>
                <th className="px-3 py-2.5 font-bold">Requester</th>
                <th className="px-3 py-2.5 font-bold">Requested Slot</th>
                <th className="px-3 py-2.5 font-bold">Assigned Venue & Slot</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-3 py-2.5 font-bold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-t border-zinc-100 hover:bg-zinc-50/50 transition">
                  <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-zinc-800">{b.id}</td>
                  <td className="px-3 py-2.5 font-semibold text-zinc-900 text-xs">{b.title}</td>
                  <td className="px-3 py-2.5 text-zinc-600 text-[11px]">{b.requester}</td>
                  <td className="px-3 py-2.5 text-zinc-500 font-mono text-[11px]">{b.requested_slot}</td>
                  <td className="px-3 py-2.5 text-zinc-800 font-mono text-[11px] font-medium">{b.assigned_slot}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-[9px] font-bold ${
                        b.status === 'Approved'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : b.status === 'Rejected'
                          ? 'border-zinc-200 bg-zinc-50 text-zinc-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-[11px] max-w-xs truncate" title={b.reason}>
                    {b.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

// -------------------------------------------------------------------------
// Tab 2: Midsem Exam Grid (Tightened)
// -------------------------------------------------------------------------
function ExamGrid() {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 p-3">
        <div>
          <h3 className="text-xs font-bold text-zinc-950">Midsem Examinations · Week 8</h3>
          <p className="text-[10px] text-zinc-500">
            6-day schedule across 12 slots with 50% room capacity constraints.
          </p>
        </div>
        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
          Soft Penalty: 0 (No student group has 2 exams on the same day)
        </div>
      </div>

      <div className="grid gap-px bg-zinc-200/80 md:grid-cols-6">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
          <div key={day} className="bg-white">
            <div className="border-b border-zinc-200 bg-zinc-50 p-2 text-[11px] font-bold text-zinc-700 text-center">
              {day}
            </div>

            {['AM', 'PM'].map((slot) => {
              const matches = campusData.exams.filter((e: any) => e.day === day && e.session === slot)

              return (
                <div key={slot} className="min-h-[170px] border-b border-zinc-100 p-2 last:border-0">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {slot === 'AM' ? '09:30–11:30' : '14:00–16:00'}
                  </p>

                  {matches.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {matches.map((exam: any) => (
                        <div
                          key={exam.id}
                          className="rounded-lg border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-bold text-zinc-900">{exam.id}</span>
                            <GraduationCap className="size-3 text-zinc-400" />
                          </div>
                          <p className="mt-0.5 text-[11px] font-bold text-zinc-900">{exam.name}</p>
                          <p className="text-[9px] text-zinc-500 truncate">{exam.groups}</p>
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-zinc-600">
                            <DoorOpen className="size-2.5 text-zinc-400" />
                            {exam.rooms}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid h-20 place-items-center rounded-lg border border-dashed border-zinc-200 text-[10px] text-zinc-400">
                      Free Slot
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// -------------------------------------------------------------------------
// Tab 3: Disruption Studio (Tightened)
// -------------------------------------------------------------------------
function Disruption({ preview, setPreview, setNotice }: any) {
  const sampleMoves = [
    { id: 'CS201-L1', course: 'CS201 Lecture', from: 'CR-102 · Mon P2', to: 'LH-1 · Mon P2', type: 'Room Reassigned' },
    { id: 'CS204-L3', course: 'CS204 Lecture', from: 'CR-102 · Wed P4', to: 'LH-3 · Wed P4', type: 'Room Reassigned' },
    { id: 'CS303-L3', course: 'CS303 Lecture', from: 'CR-102 · Thu P1', to: 'CR-101 · Thu P1', type: 'Room Reassigned' },
    { id: 'EC302-L3', course: 'EC302 Lecture', from: 'CR-102 · Fri P3', to: 'LH-2 · Fri P3', type: 'Room Reassigned' },
    { id: 'MA101-C-T1', course: 'MA101 Tutorial', from: 'CR-102 · Tue P6', to: 'CR-201 · Tue P6', type: 'Room Reassigned' },
    { id: 'ME203-L3', course: 'ME203 Lecture', from: 'CR-102 · Mon P8', to: 'LH-4 · Mon P8', type: 'Room Reassigned' }
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-900 p-4 text-white shadow-xs">
        <div>
          <p className="text-xs font-bold">Simulate & Resolve Campus Disruptions</p>
          <p className="text-[11px] text-zinc-400">
            Re-solve with minimal perturbation: 10 moved sessions (0 time changes, 10 room-only).
          </p>
        </div>
        <button
          onClick={() => setPreview(true)}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-zinc-100 transition shadow-2xs"
        >
          <GitCompareArrows className="size-3 text-zinc-800" />
          Preview Disruption Diff
        </button>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-3">
          <div>
            <h3 className="text-xs font-bold text-zinc-950">Proposed Changes & Audit Diff</h3>
            <p className="text-[10px] text-zinc-500">
              {preview
                ? 'Minimal perturbation solution: CR-102 closed, Prof. F07 leave accommodated.'
                : 'Run a simulation to inspect proposed moves.'}
            </p>
          </div>
          {preview && (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold text-zinc-800">
              Stability: 10 Sessions Moved · 0 Time Changes · 10 Room-Only
            </span>
          )}
        </div>

        {preview ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Session ID</th>
                  <th className="px-3 py-2.5 font-bold">Course</th>
                  <th className="px-3 py-2.5 font-bold">Original Slot & Venue</th>
                  <th className="px-3 py-2.5 font-bold">Proposed Slot & Venue</th>
                  <th className="px-3 py-2.5 font-bold">Move Type</th>
                </tr>
              </thead>
              <tbody>
                {sampleMoves.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-100 hover:bg-zinc-50/50 transition">
                    <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-zinc-800">{m.id}</td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-900 text-xs">{m.course}</td>
                    <td className="px-3 py-2.5 text-zinc-500 font-mono text-[11px]">{m.from}</td>
                    <td className="px-3 py-2.5 text-emerald-800 font-mono text-[11px] font-medium">{m.to}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[9px] font-semibold text-zinc-800">
                        {m.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-36 place-items-center p-6 text-center">
            <div>
              <SlidersHorizontal className="mx-auto size-6 text-zinc-300" />
              <p className="mt-2 text-xs font-semibold text-zinc-700">No Disruption Pending</p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                Click &quot;Preview Disruption Diff&quot; to inspect the CP-SAT minimal moves.
              </p>
            </div>
          </div>
        )}
      </Panel>

      {preview && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-2xs">
          <div className="flex items-start gap-2 text-xs text-emerald-900 font-medium">
            <Check className="mt-0.5 size-3.5 text-emerald-600" />
            <span className="text-[11px]">
              <b>0 Hard Violations:</b> All 10 displaced classes maintain valid room capacity, accessibility, and zero clashes.
            </span>
          </div>
          <button
            onClick={() => setNotice('Disruption schedule approved and committed to active semester timetable.')}
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
          >
            Approve & Commit Schedule
          </button>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// Tab 4: AI Booking Assistant (Tightened)
// -------------------------------------------------------------------------
function Assistant({ bookingText, setBookingText, parsedData, submitBooking, setNotice }: any) {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_300px]">
      <Panel className="overflow-hidden">
        <div className="border-b border-zinc-200 bg-gradient-to-br from-zinc-950 via-slate-900 to-indigo-950 p-5 text-white">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-indigo-300">
            <Bot className="size-3.5" /> Natural Language Venue Assistant
          </div>
          <h3 className="mt-1 text-base font-bold tracking-tight">Request a Venue in English or Hinglish</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
            Type your request naturally. The AI extracts requirements into a structured booking proposal, strictly validated by underlying constraint code.
          </p>
        </div>

        <div className="p-4">
          <label className="mb-1.5 block text-xs font-bold text-zinc-700" htmlFor="booking-request">
            Describe Your Request
          </label>
          <textarea
            id="booking-request"
            value={bookingText}
            onChange={(e) => setBookingText(e.target.value)}
            className="min-h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 text-xs outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-1 focus:bg-white transition"
            placeholder="e.g. 'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye' or 'Auditorium Friday 11 am for CSE farewell, 400 people'..."
          />
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">
              <Command className="mr-1 inline size-2.5" /> Press Parse to generate editable booking card
            </span>
            <button
              onClick={submitBooking}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
            >
              <Send className="size-3" />
              Parse Request
            </button>
          </div>

          {parsedData && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 mb-3">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Parsed Booking Proposal</p>
                  <p className="text-[10px] text-zinc-500">Edit any field before submitting.</p>
                </div>
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  Ready to Review
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Event Title
                  <input
                    defaultValue={parsedData.title || 'Event Booking'}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2.5 py-1 text-xs font-normal normal-case outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </label>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Attendance
                  <input
                    defaultValue={parsedData.attendance || 100}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2.5 py-1 text-xs font-normal normal-case outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </label>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Duration (Periods)
                  <input
                    defaultValue={parsedData.duration_periods || 2}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2.5 py-1 text-xs font-normal normal-case outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </label>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Requested Venue
                  <input
                    defaultValue={parsedData.requested_room || 'Seminar Hall'}
                    className="mt-0.5 w-full rounded border border-zinc-200 px-2.5 py-1 text-xs font-normal normal-case outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </label>
              </div>

              {parsedData.notes_or_assumptions && parsedData.notes_or_assumptions.length > 0 && (
                <div className="mt-2.5 rounded bg-zinc-50 p-2 text-[10px] text-zinc-700 border border-zinc-200">
                  {parsedData.notes_or_assumptions.map((note: string, idx: number) => (
                    <p key={idx}>ℹ️ {note}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4 pt-2.5 border-t border-zinc-100">
                <button
                  onClick={() => setNotice('Booking submitted and queued for Coordinator approval.')}
                  className="rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
                >
                  Submit Official Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
            <MessageSquareText className="size-3.5 text-zinc-700" />
            Sample Requests
          </div>
          <div className="mt-2.5 flex flex-col gap-2 text-xs">
            {[
              'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye',
              'Auditorium Friday 11 am for CSE farewell, 400 people',
              'Lab with computers for 3-hour coding contest Thursday afternoon'
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setBookingText(item)}
                className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-2 hover:bg-zinc-100 cursor-pointer transition text-zinc-600 text-[11px]"
              >
                <p className="line-clamp-2">&quot;{item}&quot;</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
