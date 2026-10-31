import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, CalendarDays, Check, ChevronRight, CircleCheck, Clock3, Command, DoorOpen, GitCompareArrows, GraduationCap, MessageSquareText, MoreHorizontal, PanelLeft, Pencil, RotateCcw, Send, SlidersHorizontal, Sparkles, Users, X, Menu, Moon, Sun } from 'lucide-react'

type Hue = 'violet' | 'sky' | 'peach' | 'mint' | 'periwinkle' | 'rose'
const hue: Record<Hue, string> = {
  violet: 'bg-ev-violet text-ev-violet-fg',
  sky: 'bg-ev-sky text-ev-sky-fg',
  peach: 'bg-ev-peach text-ev-peach-fg',
  mint: 'bg-ev-mint text-ev-mint-fg',
  periwinkle: 'bg-ev-periwinkle text-ev-periwinkle-fg',
  rose: 'bg-ev-rose text-ev-rose-fg',
}

const roles = ['Admin', 'Department Coordinator', 'Faculty', 'Club Representative']
const tabs = ['Master Timetable', 'Spectra Fest', 'Midsem Exams', 'Disruption Studio', 'AI Booking Assistant']
const tabIcons = [CalendarDays, Sparkles, GraduationCap, GitCompareArrows, Bot]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOUR_START = 8
const HOUR_END = 18
const HOUR_PX = 80
const categories = ['All', 'Computing', 'Math', 'Electronics', 'Humanities', 'Lab']
const catHue: Record<string, Hue> = { Computing: 'violet', Math: 'periwinkle', Electronics: 'sky', Humanities: 'peach', Lab: 'mint' }

type Session = { day: number; start: number; end: number; id: string; name: string; room: string; faculty: string; cat: string; confirmed?: boolean }
const sessions: Session[] = [
  { day: 0, start: 8, end: 9, id: 'CS201', name: 'Data Structures', room: 'LH-1', faculty: 'F01', cat: 'Computing', confirmed: true },
  { day: 1, start: 9, end: 10, id: 'MA202', name: 'Discrete Mathematics', room: 'LH-2', faculty: 'F07', cat: 'Math' },
  { day: 2, start: 8, end: 9, id: 'CS203', name: 'Computer Networks', room: 'LH-1', faculty: 'F03', cat: 'Computing' },
  { day: 3, start: 10, end: 11, id: 'CS205', name: 'Operating Systems', room: 'LH-3', faculty: 'F09', cat: 'Computing', confirmed: true },
  { day: 4, start: 11, end: 12, id: 'HS201', name: 'Technical Writing', room: 'LH-2', faculty: 'F04', cat: 'Humanities' },
  { day: 0, start: 12, end: 15, id: 'CS204', name: 'DS Lab · 3 hour', room: 'LAB-2', faculty: 'F01', cat: 'Lab', confirmed: true },
  { day: 2, start: 14, end: 15, id: 'EC201', name: 'Digital Logic', room: 'LH-1', faculty: 'F12', cat: 'Electronics' },
  { day: 3, start: 15, end: 16, id: 'CS206', name: 'Web Engineering', room: 'LH-3', faculty: 'F03', cat: 'Computing' },
  { day: 4, start: 16, end: 17, id: 'PE101', name: 'Professional Ethics', room: 'LH-2', faculty: 'F08', cat: 'Humanities', confirmed: true },
  { day: 1, start: 10.5, end: 12, id: 'MA204', name: 'Linear Algebra', room: 'LH-2', faculty: 'F07', cat: 'Math', confirmed: true },
]
const bookings = [
  ['SP-027', 'Design Conclave', 'Aarav Mehta · Club Rep.', 'Wed, 16:00–20:00', 'AUD · Wed, 16:00–20:00', 'Approved'],
  ['SP-031', 'Battle of Bands', 'CIT Music Society · Club Rep.', 'Fri, 17:00–21:00', 'AMPH · Fri, 18:00–22:00', 'Alternative Offered'],
  ['SP-034', 'Founder Fireside', 'E-Cell · Club Rep.', 'Thu, 15:00–17:00', 'LH-1 · Thu, 15:00–17:00', 'Approved'],
  ['SP-041', 'Robotics Showcase', 'Mech Club · Club Rep.', 'Sat, 09:00–14:00', '—', 'Rejected'],
]
const exams = [
  ['MON', 'AM', 'CS201', 'Data Structures', 'CSE-2, CSE-3', 'LH-1 · LH-2'], ['MON', 'PM', 'MA202', 'Discrete Mathematics', 'CSE-2, ECE-2', 'LH-1 · LH-2'],
  ['TUE', 'AM', 'CS203', 'Computer Networks', 'CSE-2', 'LH-1'], ['WED', 'PM', 'CS205', 'Operating Systems', 'CSE-2, CSE-3', 'LH-1 · LH-2'],
  ['THU', 'AM', 'HS201', 'Technical Writing', 'All Year 2', 'LH-1 · LH-2 · LH-3'], ['SAT', 'PM', 'CS204', 'Data Structures Lab', 'CSE-2', 'LAB-1 · LAB-2'],
]
const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

type Detail = { kicker: string; title: string; hueCls: string; line1: string; line2: string; fields: [string, string][]; note: string }
const sessionDetail = (s: Session): Detail => ({
  kicker: 'Session detail', title: s.name, hueCls: hue[catHue[s.cat] ?? 'violet'],
  line1: `${s.id} · ${s.cat}`, line2: `${days[s.day]} · ${fmt(s.start)} – ${fmt(s.end)}`,
  fields: [['Room', s.room], ['Faculty', s.faculty], ['Group', 'CSE-2'], ['Status', s.confirmed ? 'Confirmed' : 'Scheduled']],
  note: 'Placed here to preserve faculty availability, room capacity, and the CSE-2 prerequisite chain. No hard constraints are violated.',
})
const bookingDetail = (r: string[]): Detail => ({
  kicker: 'Booking detail', title: r[1] ?? '', hueCls: hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach'],
  line1: `${r[0]} · ${r[5]}`, line2: r[3] ?? '',
  fields: [['Requested by', r[2] ?? ''], ['Requested slot', r[3] ?? ''], ['Assigned venue', r[4] ?? ''], ['Status', r[5] ?? '']],
  note: r[5] === 'Approved' ? 'Approved after scoring against venue capacity, equipment needs, and clash checks.' : r[5] === 'Rejected' ? 'Rejected: no venue satisfies the capacity and equipment requirements for the requested slot.' : 'The requested slot clashes with an existing booking, so the closest available alternative was offered.',
})
const examDetail = (e: string[]): Detail => ({
  kicker: 'Exam detail', title: e[3] ?? '', hueCls: hue[e[1] === 'AM' ? 'sky' : 'violet'],
  line1: `${e[2]} · ${e[1] === 'AM' ? 'Morning' : 'Afternoon'} session`, line2: `${e[0]} · ${e[1] === 'AM' ? '09:30 – 11:30' : '14:00 – 16:00'}`,
  fields: [['Code', e[2] ?? ''], ['Groups', e[4] ?? ''], ['Rooms', e[5] ?? ''], ['Session', e[1] === 'AM' ? 'Morning' : 'Afternoon']],
  note: 'Seating and invigilation are arranged so no student has two papers in the same slot, and room capacity covers all listed groups.',
})

export default function CampusManager() {
  const [activeTab, setActiveTab] = useState(0)
  const [role, setRole] = useState('Admin')
  const [selected, setSelected] = useState<Detail | null>(null)
  const [bookingText, setBookingText] = useState('')
  const [parsed, setParsed] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [disruptionPreview, setDisruptionPreview] = useState(false)
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(localStorage.getItem('theme') === 'dark') }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])

  const visibleBookings = useMemo(() => statusFilter === 'All' ? bookings : bookings.filter(b => b[5] === statusFilter), [statusFilter])
  const submitBooking = async () => {
    if (!bookingText.trim()) return
    try { await fetch('http://127.0.0.1:8000/api/ai/parse-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: bookingText }) }) } catch { /* offline preview fallback */ }
    setParsed(true)
  }
  const resetDemo = async () => { try { await fetch('http://localhost:8000/api/admin/reset', { method: 'POST' }) } catch { /* offline preview fallback */ } setNotice('Demo data reset to the Semester 2027 baseline.') }

  return <main className="min-h-screen bg-canvas p-3 text-foreground lg:p-6">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] gap-3 rounded-md grad-shell p-3">
      {menuOpen && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`${menuOpen ? 'fixed inset-y-0 left-0 z-40 flex grad-shell shadow-2xl overflow-y-auto' : 'hidden'} w-64 shrink-0 flex-col px-4 py-4 lg:static lg:z-auto lg:flex lg:shadow-none`}>
        <div className="flex items-center justify-between">
          <div className="grid size-10 place-items-center rounded-lg bg-ink text-[11px] font-bold text-ink-foreground">CIT</div>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="lg:pointer-events-none"><PanelLeft className="size-5 text-foreground/70" /></button>
        </div>
        <p className="mt-9 mb-3 text-sm text-muted-foreground">Main menu</p>
        <nav className="flex flex-col gap-1" role="tablist">{tabs.map((tab, i) => { const Icon = tabIcons[i] ?? CalendarDays; return <button key={tab} role="tab" aria-selected={activeTab === i} onClick={() => { setActiveTab(i); setMenuOpen(false) }} className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition ${activeTab === i ? 'bg-card/80 font-medium shadow-sm' : 'text-foreground/80 hover:bg-card/50'}`}><Icon className="size-4 shrink-0" />{tab}</button> })}</nav>
        <p className="mt-8 mb-3 text-sm text-muted-foreground">Role</p>
        <div className="flex flex-col gap-1">{roles.map(r => <button key={r} onClick={() => setRole(r)} className={`flex items-center gap-3 rounded-full px-4 py-2 text-left text-[13px] transition ${role === r ? 'bg-card/80 font-medium' : 'text-foreground/70 hover:bg-card/50'}`}><Users className="size-3.5" />{r}</button>)}</div>
        <div className="mt-auto pt-6">
          <button onClick={resetDemo} className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-[13px] text-destructive hover:bg-card/50"><RotateCcw className="size-3.5" />Reset Demo Data</button>
          <p className="mt-5 mb-3 text-sm text-muted-foreground">Account</p>
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-ink text-xs font-semibold text-ink-foreground">{role.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-semibold">CIT Operations</p><p className="text-xs text-muted-foreground">{role}</p></div></div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-lg bg-card p-3 lg:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-5 py-4 text-sm">
          <div className="flex items-center gap-2"><button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="-ml-1 rounded-full p-1.5 hover:bg-accent lg:hidden"><Menu className="size-5" /></button><span className="text-muted-foreground">CIT Campus</span><ChevronRight className="size-3.5 text-muted-foreground" /><Clock3 className="size-4" /><span className="font-medium">{tabs[activeTab]}</span></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />Clash-free · 0 hard violations<button role="switch" aria-checked={dark} aria-label="Toggle dark mode" onClick={() => setDark(d => !d)} className="relative ml-3 flex h-8 w-16 items-center justify-between rounded-full bg-secondary px-2 text-muted-foreground"><Sun className="size-3.5" /><Moon className="size-3.5" /><span className={`absolute top-1 size-6 rounded-full bg-ev-mint shadow-sm transition-all ${dark ? 'left-9' : 'left-1'}`} /></button></div>
        </div>
        <div className="px-2 pt-6 pb-2 lg:px-4">
          {notice && <div className="mb-5 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-xs text-success"><span><Check className="mr-2 inline size-3.5" />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X className="size-4" /></button></div>}
          {activeTab === 0 && <Timetable onSelect={s => setSelected(sessionDetail(s))} />}
          {activeTab === 1 && <Fest rows={visibleBookings} filter={statusFilter} setFilter={setStatusFilter} onSelect={r => setSelected(bookingDetail(r))} />}
          {activeTab === 2 && <ExamGrid onSelect={e => setSelected(examDetail(e))} />}
          {activeTab === 3 && <Disruption preview={disruptionPreview} setPreview={setDisruptionPreview} setNotice={setNotice} />}
          {activeTab === 4 && <Assistant bookingText={bookingText} setBookingText={setBookingText} parsed={parsed} submitBooking={submitBooking} />}
        </div>
      </div>
    </div>

    {selected && <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-md border-l border-border bg-card p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{selected.kicker}</p><h3 className="mt-1 text-xl font-semibold">{selected.title}</h3></div><button onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-accent" aria-label="Close"><X className="size-4" /></button></div>
      <div className={`mt-5 rounded-none p-4 ${selected.hueCls}`}><p className="text-sm font-medium">{selected.line1}</p><p className="mt-1 text-sm opacity-80">{selected.line2}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3">{selected.fields.map(([l, v]) => <div key={l} className="rounded-none bg-muted p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="mt-1 text-sm font-medium">{v}</p></div>)}</div>
      <div className="mt-4 rounded-lg border border-border p-4 text-sm leading-6 text-muted-foreground"><Sparkles className="mb-2 size-4 text-foreground" />{selected.note}</div>
      <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-ink-foreground hover:opacity-90"><Bot className="size-4" />Ask AI: Why is this class placed here?</button>
    </aside>}
  </main>
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex min-w-max items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${active ? 'bg-ev-mint text-ev-mint-fg font-medium' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>{active && <CircleCheck className="size-4" />}{children}</button>
}
function Confirmed() { return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-current opacity-80"><CircleCheck className="size-3" />Confirmed</span> }
function StatusChip({ label }: { label: string }) {
  if (label === 'Approved') return <Confirmed />
  if (label === 'Rejected') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-current opacity-80"><X className="size-3" />Rejected</span>
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-current opacity-80"><Clock3 className="size-3" />{label}</span>
}
function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3"><h2 className="text-[26px] font-medium tracking-tight">{title}</h2><div className="flex flex-wrap gap-2">{children}</div></div>
}
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-lg border border-border bg-card ${className}`}>{children}</section> }

function useNow() {
  const [now, setNow] = useState<{ day: number; hour: number } | null>(null)
  useEffect(() => {
    const tick = () => { const d = new Date(); const day = d.getDay() - 1; const hour = d.getHours() + d.getMinutes() / 60; setNow(day >= 0 && day < 5 && hour >= HOUR_START && hour < HOUR_END ? { day, hour } : { day: 1, hour: 10 + 40 / 60 }) }
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t)
  }, [])
  return now
}

function Timetable({ onSelect }: { onSelect: (s: Session) => void }) {
  const [cat, setCat] = useState('All')
  const now = useNow()
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const list = cat === 'All' ? sessions : sessions.filter(s => s.cat === cat)
  return <div>
    <Heading title="Week 7 · Semester 2027">{categories.map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}</Heading>
    <div className="overflow-x-auto"><div className="min-w-[900px]">
      <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-timetable-grid text-sm">
        <div className="border-r border-timetable-grid" />{days.map((d, i) => <div key={d} className={`py-1.5 text-center border-r border-timetable-grid last:border-r-0 ${now?.day === i ? 'rounded-full bg-ev-mint text-ev-mint-fg font-medium' : 'text-foreground/80'}`}>{i + 13} - {d}</div>)}
      </div>
      <div className="relative grid grid-cols-[72px_repeat(5,1fr)] border-b border-timetable-grid" style={{ height: hours.length * HOUR_PX }}>
        <div className="border-r border-timetable-grid grid-hours">{hours.map(h => <div key={h} className="pt-2 text-sm text-foreground/80 pr-2 text-right" style={{ height: HOUR_PX }}>{fmt(h)}</div>)}</div>
        {days.map((d, di) => <div key={d} className="relative border-r border-timetable-grid grid-hours">
          {!list.some(s => s.day === di && s.start < 14 && s.end > 13) && <div className="absolute inset-x-0 bg-warning-soft/60 px-2 py-1 text-[10px] text-warning" style={{ top: (13 - HOUR_START) * HOUR_PX, height: HOUR_PX }}>Lunch break</div>}
          {list.filter(s => s.day === di).map(s => <button key={s.id} onClick={() => onSelect(s)} className={`absolute inset-x-0 flex flex-col justify-center rounded-none p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[catHue[s.cat] ?? 'violet']}`} style={{ top: (s.start - HOUR_START) * HOUR_PX, height: (s.end - s.start) * HOUR_PX }}>
            <div className="flex items-start justify-between gap-2"><span className="truncate text-[13px] font-medium leading-tight">{s.name}</span><MoreHorizontal className="size-3.5 shrink-0" /></div>
            <span className="mt-0.5 text-[11px] leading-tight opacity-75">{fmt(s.start)} – {fmt(s.end)}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] leading-tight opacity-75"><span className="flex items-center gap-1"><DoorOpen className="size-3" />{s.room}</span><span className="flex items-center gap-1"><Users className="size-3" />{s.faculty}</span></span>
            {s.confirmed && s.end - s.start >= 1.5 && <span className="mt-1.5"><Confirmed /></span>}
          </button>)}
          {now?.day === di && <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-now" style={{ top: (now.hour - HOUR_START) * HOUR_PX }}><span className="absolute -left-14 -top-3 rounded-full bg-now px-2.5 py-0.5 text-xs font-medium text-ink-foreground">{fmt(now.hour)}</span></div>}
        </div>)}
      </div>
    </div></div>
  </div>
}

const status = (s: string) => s === 'Approved' ? 'bg-success-soft text-success' : s === 'Rejected' ? 'bg-danger-soft text-destructive' : 'bg-warning-soft text-warning'

function Fest({ rows, filter, setFilter, onSelect }: { rows: string[][]; filter: string; setFilter: (v: string) => void; onSelect: (r: string[]) => void }) {
  const stats: [string, string, Hue][] = [['64.5/70', 'Booking score', 'violet'], ['21', 'Approved', 'mint'], ['2', 'Alternatives offered', 'peach'], ['2', 'Rejected', 'rose'], ['0', 'Inversions', 'sky']]
  return <div>
    <Heading title="Spectra Fest · Week 7">{['All', 'Approved', 'Alternative Offered', 'Rejected'].map(f => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}</Heading>
    <div className="grid gap-3 sm:grid-cols-5">{stats.map(([v, l, h]) => <div key={l} className={`rounded-none p-4 ${hue[h]}`}><p className="text-2xl font-semibold tracking-tight">{v}</p><p className="mt-1 text-xs opacity-80">{l}</p></div>)}</div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">{rows.map(r => <button key={r[0]} onClick={() => onSelect(r)} className={`flex flex-col justify-center rounded-none p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach']}`}>
      <div className="flex items-start justify-between"><div><p className="text-[13px] font-medium leading-tight">{r[1]}</p><p className="mt-0.5 text-[11px] opacity-75">{r[3]}</p></div><MoreHorizontal className="size-3.5" /></div>
      <p className="mt-3 text-[11px] opacity-75">{r[0]} · {r[2]}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] opacity-75"><DoorOpen className="size-3" />{r[4]}</p>
      <div className="mt-4"><StatusChip label={r[5] ?? ''} /></div>
    </button>)}</div>
  </div>
}

function ExamGrid({ onSelect }: { onSelect: (e: string[]) => void }) {
  const [cat, setCat] = useState('All')
  const list = exams.filter(e => cat === 'All' || e[1] === cat)
  return <div>
    <Heading title="Midsem Exams · 14–19 Oct">{['All', 'AM', 'PM'].map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c === 'All' ? 'All' : c === 'AM' ? 'Morning' : 'Afternoon'}</Pill>)}</Heading>
    <div className="overflow-x-auto"><div className="grid min-w-[860px] grid-cols-[72px_repeat(6,1fr)]">
      <div className="border-b border-border" />{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => <div key={d} className="border-b border-border py-1.5 text-center text-sm text-foreground/80">{14 + i} - {d.charAt(0) + d.slice(1).toLowerCase()}</div>)}
      {['AM', 'PM'].map(slot => <React.Fragment key={slot}>
        <div className="border-b border-border pt-3 text-sm text-foreground/80">{slot === 'AM' ? '09:30' : '14:00'}<p className="text-[11px] text-muted-foreground">{slot === 'AM' ? 'to 11:30' : 'to 16:00'}</p></div>
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => { const e = list.find(x => x[0] === d && x[1] === slot); return <div key={d} className="min-h-[170px] border-b border-l border-border">{e && <button onClick={() => onSelect(e)} className={`flex h-full w-full flex-col justify-center rounded-none p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[slot === 'AM' ? 'sky' : 'violet']}`}>
          <div className="flex items-start justify-between"><span className="text-[13px] font-medium leading-tight">{e[3]}</span><MoreHorizontal className="size-3.5 shrink-0" /></div>
          <span className="text-[11px] opacity-75">{e[2]}</span>
          <span className="mt-2 text-[10px] opacity-75">{e[4]}</span>
          <span className="mt-1 flex items-center gap-1 text-[10px] opacity-75"><DoorOpen className="size-3" />{e[5]}</span>
          <span className="mt-3"><Confirmed /></span>
        </button>}</div> })}
      </React.Fragment>)}
    </div></div>
  </div>
}

function Disruption({ preview, setPreview, setNotice }: { preview: boolean; setPreview: (v: boolean) => void; setNotice: (v: string) => void }) {
  const moves = [['SES-04', 'CS204 · Data Structures Lab', 'Mon 12:00–15:00 · LAB-1', 'Mon 12:00–15:00 · LAB-2'], ['SES-05', 'CS207 · AI Fundamentals', 'Tue 09:00 · LAB-1', 'Tue 09:00 · LAB-2'], ['SES-06', 'ME201 · Manufacturing Lab', 'Tue 09:00 · LAB-1', 'Tue 09:00 · LAB-3']]
  return <div>
    <Heading title="Disruption Studio"><Pill active={!preview} onClick={() => setPreview(false)}>Simulation</Pill><Pill active={preview} onClick={() => setPreview(true)}>Preview diff</Pill></Heading>
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-none p-5 ${hue.periwinkle}`}>
      <div><p className="text-sm font-medium">Simulate or apply campus disruptions</p><p className="mt-1 text-[13px] opacity-75">Faculty leave, room closure, and extra sessions. Active closure: LAB-1.</p></div>
      <button onClick={() => setPreview(true)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground"><GitCompareArrows className="size-4" />Preview disruption diff</button>
    </div>
    {preview ? <>
      <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-secondary px-3 py-1.5">3 sessions moved</span><span className="rounded-full bg-secondary px-3 py-1.5">0 time changes</span><span className="rounded-full bg-secondary px-3 py-1.5">3 room-only</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{moves.map(m => <div key={m[0]} className={`rounded-none p-4 ${hue.sky}`}>
        <div className="flex items-start justify-between"><p className="text-sm font-medium">{m[1]}</p><MoreHorizontal className="size-4 shrink-0" /></div>
        <p className="mt-3 text-xs line-through opacity-60">{m[2]}</p><p className="mt-1 text-[13px]">{m[3]}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium opacity-80"><GitCompareArrows className="size-3" />Room reassigned</span>
      </div>)}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-none bg-warning-soft p-4"><div className="flex items-start gap-2 text-[13px] text-warning"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>All proposed room moves preserve capacity and equipment requirements.</span></div><button onClick={() => setNotice('Schedule changes approved and committed.')} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">Approve & commit</button></div>
    </> : <div className="mt-5 grid min-h-56 place-items-center rounded-none border border-dashed border-border text-center"><div><SlidersHorizontal className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Simulation is ready</p><p className="mt-1 text-xs text-muted-foreground">Preview the diff before committing any changes.</p></div></div>}
  </div>
}

function Assistant({ bookingText, setBookingText, parsed, submitBooking }: { bookingText: string; setBookingText: (v: string) => void; parsed: boolean; submitBooking: () => void }) {
  return <div>
    <Heading title="AI Booking Assistant" />
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Panel className="overflow-hidden">
        <div className={`p-6 ${hue.violet}`}><div className="flex items-center gap-2 text-xs font-medium"><Bot className="size-4" />Venue booking assistant</div><h3 className="mt-3 text-xl font-medium tracking-tight">Tell us what you need. We&apos;ll find the best fit.</h3><p className="mt-2 max-w-xl text-[13px] leading-5 opacity-75">Describe your event in plain English or Hinglish. The assistant reads the requirements and checks venue availability.</p></div>
        <div className="p-5">
          <label className="mb-2 block text-sm font-medium" htmlFor="booking-request">Request details</label>
          <textarea id="booking-request" value={bookingText} onChange={e => setBookingText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBooking() } }} className="min-h-28 w-full resize-none rounded-lg border border-border bg-muted p-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" placeholder="e.g. 'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye'" />
          <div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground"><Command className="mr-1 inline size-3" />Enter to parse</span><button onClick={submitBooking} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground"><Send className="size-3.5" />Parse request</button></div>
          {parsed && <div className="mt-6 rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border p-4"><div><p className="text-sm font-medium">Parsed booking request</p><p className="mt-1 text-xs text-muted-foreground">Review fields before submitting.</p></div><Confirmed /></div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">{[['Title', bookingText || 'Seminar Hall Request'], ['Attendance', '100 people'], ['Duration', '2 hours'], ['Day', 'Tomorrow'], ['Start', '18:00'], ['Requested room', 'Seminar Hall']].map(([l, v]) => <label key={l} className="text-xs text-muted-foreground">{l}<input defaultValue={v} className="mt-1.5 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>)}</div>
            <div className="flex flex-wrap gap-2 border-t border-border p-4">{['Projector', 'PA System', 'Stage', 'Accessible'].map(n => <label key={n} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs"><input type="checkbox" defaultChecked={n === 'PA System'} className="accent-foreground" />{n}</label>)}</div>
            <div className="flex justify-end gap-2 border-t border-border p-4"><button className="rounded-full bg-secondary px-4 py-2 text-sm">Edit fields</button><button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">Submit booking</button></div>
          </div>}
        </div>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel className="p-5"><div className="flex items-center gap-2 text-sm font-medium"><MessageSquareText className="size-4" />Recent requests</div><div className="mt-4 flex flex-col gap-2">{([['Seminar Hall · tomorrow 18:00', 'mint'], ['Auditorium · Fri 09:00', 'peach'], ['LH-2 · next Monday', 'sky']] as [string, Hue][]).map(([t, h]) => <div key={t} className={`rounded-none p-3 ${hue[h]}`}><p className="text-[13px] font-medium">{t}</p><p className="mt-0.5 text-[11px] opacity-75">Awaiting approval</p></div>)}</div></Panel>
        <Panel className="p-5"><div className="flex items-center gap-2 text-sm font-medium"><Pencil className="size-4" />Available venues</div><div className="mt-4 flex flex-col gap-2 text-[13px]">{[['AUD', '420 seats', 'Available'], ['SEM-HALL', '120 seats', 'Available'], ['LH-1', '90 seats', 'Booked 18:00']].map(v => <div key={v[0]} className="flex items-center justify-between rounded-md bg-muted px-3 py-2"><span><b className="font-medium">{v[0]}</b><span className="ml-2 text-muted-foreground">{v[1]}</span></span><span className={`rounded-full px-2 py-0.5 text-[11px] ${v[2] === 'Available' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{v[2]}</span></div>)}</div></Panel>
      </div>
    </div>
  </div>
}
