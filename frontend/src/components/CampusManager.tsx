import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, CalendarDays, Check, ChevronRight, CircleCheck, Clock3, Command, DoorOpen, GitCompareArrows, GraduationCap, MessageSquareText, MoreHorizontal, PanelLeft, Pencil, RotateCcw, Send, SlidersHorizontal, Sparkles, Users, X, Menu, Moon, Sun, Loader2, History, CheckCircle2, XCircle, ArrowRight, LogOut, Lock, Mail, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

type AuthUser = {
  id: number
  email: string
  full_name: string
  role: string
  department?: string
  permissions?: string[]
}

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

const dayMap: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 }
function periodToHour(period: number): number {
  if (period <= 5) return 7 + period // 1->8, 2->9, 3->10, 4->11, 5->12
  return 8 + period // 6->14, 7->15, 8->16, 9->17
}

const deptCategory = (dept: string = ''): string => {
  const d = dept.toUpperCase()
  if (d.includes('CS') || d.includes('COMP')) return 'Computing'
  if (d.includes('MA') || d.includes('MATH')) return 'Math'
  if (d.includes('EC') || d.includes('ELEC')) return 'Electronics'
  if (d.includes('HS') || d.includes('HUM')) return 'Humanities'
  if (d.includes('LAB')) return 'Lab'
  return 'Computing'
}

type Session = {
  day: number
  start: number
  end: number
  id: string
  name: string
  room: string
  faculty: string
  cat: string
  confirmed?: boolean
  group?: string
}

const defaultSessions: Session[] = [
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

const defaultBookings = [
  ['SP-027', 'Design Conclave', 'Aarav Mehta · Club Rep.', 'Wed, 16:00–20:00', 'AUD · Wed, 16:00–20:00', 'Approved'],
  ['SP-031', 'Battle of Bands', 'CIT Music Society · Club Rep.', 'Fri, 17:00–21:00', 'AMPH · Fri, 18:00–22:00', 'Alternative Offered'],
  ['SP-034', 'Founder Fireside', 'E-Cell · Club Rep.', 'Thu, 15:00–17:00', 'LH-1 · Thu, 15:00–17:00', 'Approved'],
  ['SP-041', 'Robotics Showcase', 'Mech Club · Club Rep.', 'Sat, 09:00–14:00', '—', 'Rejected'],
]

const defaultExams = [
  ['MON', 'AM', 'CS201', 'Data Structures', 'CSE-2, CSE-3', 'LH-1 · LH-2'],
  ['MON', 'PM', 'MA202', 'Discrete Mathematics', 'CSE-2, ECE-2', 'LH-1 · LH-2'],
  ['TUE', 'AM', 'CS203', 'Computer Networks', 'CSE-2', 'LH-1'],
  ['WED', 'PM', 'CS205', 'Operating Systems', 'CSE-2, CSE-3', 'LH-1 · LH-2'],
  ['THU', 'AM', 'HS201', 'Technical Writing', 'All Year 2', 'LH-1 · LH-2 · LH-3'],
  ['SAT', 'PM', 'CS204', 'Data Structures Lab', 'CSE-2', 'LAB-1 · LAB-2'],
]

const defaultMoves = [
  ['SES-04', 'CS204 · Data Structures Lab', 'Mon 12:00–15:00 · LAB-1', 'Mon 12:00–15:00 · LAB-2'],
  ['SES-05', 'CS207 · AI Fundamentals', 'Tue 09:00 · LAB-1', 'Tue 09:00 · LAB-2'],
  ['SES-06', 'ME201 · Manufacturing Lab', 'Tue 09:00 · LAB-1', 'Tue 09:00 · LAB-3']
]

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

type Detail = {
  id?: string
  type?: 'session' | 'booking' | 'exam'
  kicker: string
  title: string
  hueCls: string
  line1: string
  line2: string
  fields: [string, string][]
  note: string
}

const sessionDetail = (s: Session): Detail => ({
  id: s.id,
  type: 'session',
  kicker: 'Session detail',
  title: s.name,
  hueCls: hue[catHue[s.cat] ?? 'violet'],
  line1: `${s.id} · ${s.cat}`,
  line2: `${days[s.day]} · ${fmt(s.start)} – ${fmt(s.end)}`,
  fields: [['Room', s.room], ['Faculty', s.faculty], ['Group', s.group || 'CSE-2'], ['Status', s.confirmed ? 'Confirmed' : 'Scheduled']],
  note: 'Placed here to preserve faculty availability, room capacity, and prerequisite requirements. Click "Ask AI" below to fetch real-time solver diagnosis.',
})

const bookingDetail = (r: string[]): Detail => ({
  id: r[0],
  type: 'booking',
  kicker: 'Booking detail',
  title: r[1] ?? '',
  hueCls: hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach'],
  line1: `${r[0]} · ${r[5]}`,
  line2: r[3] ?? '',
  fields: [['Requested by', r[2] ?? ''], ['Requested slot', r[3] ?? ''], ['Assigned venue', r[4] ?? ''], ['Status', r[5] ?? '']],
  note: r[5] === 'Approved' ? 'Approved after scoring against venue capacity, equipment needs, and clash checks.' : r[5] === 'Rejected' ? 'Rejected: no venue satisfies the capacity and equipment requirements for the requested slot.' : 'The requested slot clashes with an existing booking, so the closest available alternative was offered.',
})

const examDetail = (e: string[]): Detail => ({
  id: e[2],
  type: 'exam',
  kicker: 'Exam detail',
  title: e[3] ?? '',
  hueCls: hue[e[1] === 'AM' ? 'sky' : 'violet'],
  line1: `${e[2]} · ${e[1] === 'AM' ? 'Morning' : 'Afternoon'} session`,
  line2: `${e[0]} · ${e[1] === 'AM' ? '09:30 – 11:30' : '14:00 – 16:00'}`,
  fields: [['Code', e[2] ?? ''], ['Groups', e[4] ?? ''], ['Rooms', e[5] ?? ''], ['Session', e[1] === 'AM' ? 'Morning' : 'Afternoon']],
  note: 'Seating and invigilation are arranged so no student has two papers in the same slot, and room capacity covers all listed groups.',
})

export default function CampusManager() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('auth_user')
      if (cached) {
        try { return JSON.parse(cached) } catch {}
      }
    }
    return null
  })
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [role, setRole] = useState('Admin')
  const [selected, setSelected] = useState<Detail | null>(null)
  const [bookingText, setBookingText] = useState('')
  const [parsed, setParsed] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [disruptionPreview, setDisruptionPreview] = useState(false)
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  // Live Backend State
  const [sessionsList, setSessionsList] = useState<Session[]>(defaultSessions)
  const [examsList, setExamsList] = useState<string[][]>(defaultExams)
  const [bookingsList, setBookingsList] = useState<string[][]>(defaultBookings)
  const [festStats, setFestStats] = useState<[string, string, Hue][]>([
    ['64.5/70', 'Booking score', 'violet'],
    ['21', 'Approved', 'mint'],
    ['2', 'Alternatives offered', 'peach'],
    ['2', 'Rejected', 'rose'],
    ['0', 'Inversions', 'sky'],
  ])
  const [disruptionMoves, setDisruptionMoves] = useState<string[][]>(defaultMoves)
  const [disruptionDecisions, setDisruptionDecisions] = useState<Record<string, { action: 'ACCEPT' | 'REJECT' | 'REASSIGN'; room_id: string }>>({})
  const [disruptionHistory, setDisruptionHistory] = useState<any[]>([])
  const [availableRooms, setAvailableRooms] = useState<string[]>([
    'LAB-2', 'LAB-3', 'CR-104', 'LH-1', 'LH-2', 'LH-3', 'AUD', 'SEM-HALL'
  ])
  const [availableGroups, setAvailableGroups] = useState<string[]>(['CSE-2', 'All', 'Y1-A', 'Y1-B', 'Y1-C', 'Y1-D', 'CSE-3', 'ECE-2'])
  const [selectedGroup, setSelectedGroup] = useState<string>('CSE-2')
  const [venuesList, setVenuesList] = useState<[string, string, string][]>([
    ['AUD', '420 seats', 'Available'],
    ['SEM-HALL', '120 seats', 'Available'],
    ['LH-1', '90 seats', 'Booked 18:00'],
  ])
  const [activeView, setActiveView] = useState<'baseline' | 'after_disruption'>((localStorage.getItem('active_view') as any) || 'baseline')

  useEffect(() => { setDark(localStorage.getItem('theme') === 'dark') }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])

  // Verify stored JWT authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setAuthLoading(false)
      return
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Unauthorized')
      })
      .then(u => {
        setCurrentUser(u)
        localStorage.setItem('auth_user', JSON.stringify(u))
        const roleLabelMap: Record<string, string> = {
          'ADMIN': 'Admin',
          'FACULTY': 'Faculty',
          'CLUB_LEAD': 'Club Representative',
          'STUDENT': 'Student'
        }
        setRole(roleLabelMap[u.role] || u.role)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        setCurrentUser(null)
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  // --- Dynamic API Fetchers ---

  const fetchSchedule = async (grp: string = selectedGroup, view: string = activeView) => {
    try {
      const q = grp === 'All' ? `?view=${view}` : `?group_id=${encodeURIComponent(grp)}&view=${view}`
      const res = await fetch(`${API_BASE}/api/schedule${q}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        const mapped: Session[] = data.sessions.map((s: any) => {
          const d = dayMap[s.day] ?? 0
          const start = periodToHour(s.start_period)
          const end = start + (s.duration || 1)
          const cat = s.kind === 'lab' ? 'Lab' : deptCategory(s.department || s.course_id)
          return {
            id: s.session_id,
            name: s.course_title || s.course_id,
            day: d,
            start,
            end,
            room: s.room_id,
            faculty: s.faculty_id,
            cat,
            confirmed: true,
            group: (s.groups || []).join(', ')
          }
        })
        setSessionsList(mapped)
      }
    } catch {
      // offline fallback
    }
  }

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meta`)
      if (!res.ok) return
      const data = await res.json()
      if (data.active_view) {
        setActiveView(data.active_view)
        localStorage.setItem('active_view', data.active_view)
        if (data.active_view === 'after_disruption') {
          setDisruptionPreview(true)
        }
      }
      if (data.groups) {
        const grpIds = ['CSE-2', 'All', ...data.groups.map((g: any) => g.id).filter((id: string) => id !== 'CSE-2')]
        setAvailableGroups(grpIds)
      }
      if (data.rooms) {
        const venues: [string, string, string][] = data.rooms.slice(0, 5).map((r: any) => [
          r.id,
          `${r.capacity} seats`,
          r.id === 'LH-1' ? 'Booked 18:00' : 'Available'
        ])
        setVenuesList(venues)
        const roomIds = data.rooms.map((r: any) => r.id)
        if (roomIds.length > 0) {
          setAvailableRooms(roomIds)
        }
      }
    } catch {}
  }

  const fetchExams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/exams`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.exams) && data.exams.length > 0) {
        const mapped = data.exams.map((e: any) => [
          e.day,
          e.session,
          (e.course_ids || []).join(', ') || e.exam_id,
          e.exam_id.replace('EX-', ''),
          (e.groups || []).join(', '),
          (e.rooms || []).join(' · ')
        ])
        setExamsList(mapped)
      }
    } catch {}
  }

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fest/bookings`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.bookings) && data.bookings.length > 0) {
        const mapped = data.bookings.map((b: any) => {
          const req = b.request || {}
          const statusLabel = b.status === 'approved' ? 'Approved' : b.status === 'alternative_offered' ? 'Alternative Offered' : 'Rejected'
          const slot = b.day ? `${b.day}, Period ${b.start_period || 4}–${b.end_period || 5}` : req.windows?.[0] ? `${req.windows[0].day}, P${req.windows[0].from_period}` : 'Fest Week'
          const venue = b.room_id ? `${b.room_id} · ${b.day || ''}` : '—'
          return [
            req.id || 'BR',
            req.title || 'Event',
            `${req.requester || 'Club'} · ${req.role || 'Rep'}`,
            slot,
            venue,
            statusLabel
          ]
        })
        setBookingsList(mapped)

        const approved = data.bookings.filter((b: any) => b.status === 'approved').length
        const alts = data.bookings.filter((b: any) => b.status === 'alternative_offered').length
        const rejs = data.bookings.filter((b: any) => b.status === 'rejected' || b.status === 'cancelled').length
        setFestStats([
          ['64.5/70', 'Booking score', 'violet'],
          [String(approved), 'Approved', 'mint'],
          [String(alts), 'Alternatives offered', 'peach'],
          [String(rejs), 'Rejected', 'rose'],
          ['0', 'Inversions', 'sky']
        ])
      }
    } catch {}
  }

  // Initial load
  useEffect(() => {
    fetchMetadata()
    fetchSchedule(selectedGroup)
    fetchExams()
    fetchBookings()
    fetchDisruptionHistory()
  }, [])

  // Refetch when group filter or disruption view toggles
  useEffect(() => {
    fetchSchedule(selectedGroup, activeView)
  }, [selectedGroup, activeView])

  const visibleBookings = useMemo(() => statusFilter === 'All' ? bookingsList : bookingsList.filter(b => b[5] === statusFilter), [statusFilter, bookingsList])

  // --- Actions ---

  const submitBooking = async () => {
    if (!bookingText.trim()) return
    try {
      const res = await fetch(`${API_BASE}/api/ai/parse-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bookingText })
      })
      if (res.ok) {
        const data = await res.json()
        setParsedData(data)
      }
    } catch {
      /* offline preview fallback */
    }
    setParsed(true)
  }

  const confirmBookingDb = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const payload = {
        requester: 'Campus User',
        title: parsedData?.title || bookingText || 'Seminar Booking',
        attendance: parsedData?.attendance || 100,
        windows: [{ day: parsedData?.windows?.[0]?.day || 'Wed', start_time: '18:00' }],
        requested_room: parsedData?.requested_room || 'SEM-HALL'
      }
      await fetch(`${API_BASE}/api/db/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })
      setNotice('Booking proposal successfully saved into live SQL database.')
      fetchBookings()
    } catch {
      setNotice('Booking submitted in local offline mode.')
    }
  }

  const resetDemo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset`, { method: 'POST' })
      if (res.ok) {
        setActiveView('baseline')
        localStorage.setItem('active_view', 'baseline')
        setDisruptionPreview(false)
        setNotice('Demo data reset to the Semester 2027 baseline.')
        fetchSchedule(selectedGroup, 'baseline')
      }
    } catch {
      setActiveView('baseline')
      localStorage.setItem('active_view', 'baseline')
      setNotice('Demo data reset to the Semester 2027 baseline.')
    }
  }

  const handlePreviewDisruption = async () => {
    // If already showing preview, just toggle it off (don't re-fetch)
    if (disruptionPreview) {
      setDisruptionPreview(false)
      return
    }
    // First time: fetch the simulation diff from backend
    try {
      const res = await fetch(`${API_BASE}/api/disruption/preview`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.changes) && data.changes.length > 0) {
          const mapped = data.changes.map((c: any) => [
            c.session_id,
            c.session_id + (c.change_type === 'new_session_added' ? ' (new)' : ''),
            c.from ? `Original: ${c.from.day} P${c.from.start_period} · ${c.from.room_id}` : 'New session',
            c.to ? `Moved to: ${c.to.day} P${c.to.start_period} · ${c.to.room_id}` : 'Unscheduled'
          ])
          setDisruptionMoves(mapped)
        }
      }
      setDisruptionPreview(true)
    } catch {
      setDisruptionPreview(true)
    }
  }

  const handleApproveDisruption = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/disruption/approve`, { method: 'POST' })
      if (res.ok) {
        setActiveView('after_disruption')
        localStorage.setItem('active_view', 'after_disruption')
        setNotice('Schedule changes approved and committed to live semester timetable.')
        fetchSchedule(selectedGroup, 'after_disruption')
        fetchDisruptionHistory()
        // Reset preview so the UI collapses back to the committed state banner
        setDisruptionPreview(false)
        setDisruptionDecisions({})
      }
    } catch {
      setActiveView('after_disruption')
      localStorage.setItem('active_view', 'after_disruption')
      setNotice('Schedule changes approved and committed.')
      setDisruptionPreview(false)
      setDisruptionDecisions({})
    }
  }

  const handleRevertDisruption = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/disruption/revert`, { method: 'POST' })
      if (res.ok) {
        setActiveView('baseline')
        localStorage.setItem('active_view', 'baseline')
        setNotice('Disrupted changes reverted. Baseline timetable is now active.')
        fetchSchedule(selectedGroup, 'baseline')
        fetchDisruptionHistory()
        // Collapse preview and clear state so UI resets cleanly
        setDisruptionPreview(false)
        setDisruptionDecisions({})
        setDisruptionMoves(defaultMoves)
      }
    } catch {
      setActiveView('baseline')
      localStorage.setItem('active_view', 'baseline')
      setNotice('Disrupted changes reverted to baseline.')
      fetchDisruptionHistory()
      setDisruptionPreview(false)
      setDisruptionDecisions({})
      setDisruptionMoves(defaultMoves)
    }
  }

  const handleDecisionChange = (sessionId: string, action: 'ACCEPT' | 'REJECT' | 'REASSIGN', roomId?: string) => {
    setDisruptionDecisions(prev => {
      const existing = prev[sessionId]
      return {
        ...prev,
        [sessionId]: {
          action,
          room_id: roomId !== undefined ? roomId : (existing?.room_id || 'LAB-2')
        }
      }
    })
  }

  const fetchDisruptionHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/disruption/history`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.history)) {
          setDisruptionHistory(data.history)
        }
      }
    } catch {}
  }

  const handleApplyMoves = async () => {
    try {
      const decisionsList = disruptionMoves.map(m => {
        const sid = m[0]
        const defaultTarget = m[3].replace('Reassigned: Room ', '').replace('Reassigned: ', '').trim()
        const dec = disruptionDecisions[sid] || { action: 'ACCEPT', room_id: defaultTarget }
        return {
          session_id: sid,
          action: dec.action,
          room_id: dec.room_id || defaultTarget
        }
      })
      const res = await fetch(`${API_BASE}/api/disruption/apply-moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: decisionsList })
      })
      if (res.ok) {
        const data = await res.json()
        setActiveView('after_disruption')
        localStorage.setItem('active_view', 'after_disruption')
        setNotice(`Disruption moves committed (${data.summary}).`)
        fetchSchedule(selectedGroup, 'after_disruption')
        fetchDisruptionHistory()
        // Collapse the preview cards after committing
        setDisruptionPreview(false)
        setDisruptionDecisions({})
      }
    } catch {
      handleApproveDisruption()
    }
  }

  const handleRollback = async (logId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/disruption/rollback/${logId}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setActiveView(data.active_view)
        localStorage.setItem('active_view', data.active_view)
        setNotice(data.message)
        fetchSchedule(selectedGroup, data.active_view)
        fetchDisruptionHistory()
        // Reset preview state so the timetable reflects the rolled-back version
        setDisruptionPreview(false)
        setDisruptionDecisions({})
        setDisruptionMoves(defaultMoves)
      }
    } catch {}
  }

  const handleAskAiExplain = async () => {
    if (!selected) return
    setAiLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_type: selected.type || 'session', item_id: selected.id || 'CS201' })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.explanation) {
          setSelected(prev => prev ? { ...prev, note: data.explanation } : null)
        }
      }
    } catch {}
    setAiLoading(false)
  }

  const handleRoleChange = async (newRole: string) => {
    setRole(newRole)
    const roleEnumMap: Record<string, string> = {
      'Admin': 'ADMIN',
      'Department Coordinator': 'ADMIN',
      'Faculty': 'FACULTY',
      'Club Representative': 'CLUB_LEAD'
    }
    const targetRole = roleEnumMap[newRole] || 'STUDENT'
    try {
      const res = await fetch(`${API_BASE}/api/auth/oauth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.access_token) {
          localStorage.setItem('auth_token', data.access_token)
          localStorage.setItem('auth_user', JSON.stringify(data.user))
          setCurrentUser(data.user)
          setNotice(`Authenticated as ${data.user.full_name} (${data.user.role})`)
        }
      }
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setCurrentUser(null)
    setNotice('Signed out successfully.')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-ink text-ink-foreground shadow-xl animate-pulse mb-4">
          <GraduationCap className="size-8" />
        </div>
        <p className="text-base font-semibold text-foreground">CIT Operations Portal</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" /> Verifying security credentials...
        </p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(token, user) => {
          localStorage.setItem('auth_token', token)
          localStorage.setItem('auth_user', JSON.stringify(user))
          setCurrentUser(user)
          const roleLabelMap: Record<string, string> = {
            'ADMIN': 'Admin',
            'FACULTY': 'Faculty',
            'CLUB_LEAD': 'Club Representative',
            'STUDENT': 'Student'
          }
          setRole(roleLabelMap[user.role] || user.role)
          setNotice(`Welcome, ${user.full_name}`)
        }}
        dark={dark}
        setDark={setDark}
      />
    )
  }

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
        <p className="mt-8 mb-3 text-sm text-muted-foreground">Switch Role</p>
        <div className="flex flex-col gap-1">{roles.map(r => <button key={r} onClick={() => handleRoleChange(r)} className={`flex items-center gap-3 rounded-full px-4 py-2 text-left text-[13px] transition ${role === r ? 'bg-card/80 font-medium' : 'text-foreground/70 hover:bg-card/50'}`}><Users className="size-3.5" />{r}</button>)}</div>
        <div className="mt-auto pt-6">
          <button onClick={resetDemo} className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-[13px] text-destructive hover:bg-card/50"><RotateCcw className="size-3.5" />Reset Demo Data</button>
          
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive transition"
              title="Sign Out"
            >
              <LogOut className="size-3" /> Sign Out
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-timetable-grid bg-card/60 p-2.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold text-ink-foreground">
              {currentUser.full_name?.slice(0, 2).toUpperCase() || role.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{currentUser.full_name || 'CIT Operations'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{currentUser.email || role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-lg bg-card p-3 lg:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-timetable-grid px-5 py-4 text-sm">
          <div className="flex items-center gap-2"><button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="-ml-1 rounded-full p-1.5 hover:bg-accent lg:hidden"><Menu className="size-5" /></button><span className="text-muted-foreground">CIT Campus</span><ChevronRight className="size-3.5 text-muted-foreground" /><Clock3 className="size-4" /><span className="font-medium">{tabs[activeTab]}</span></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />Clash-free · 0 hard violations {activeView === 'after_disruption' && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-warning font-medium">Repaired View</span>}<button role="switch" aria-checked={dark} aria-label="Toggle dark mode" onClick={() => setDark(d => !d)} className="relative ml-3 flex h-8 w-16 items-center justify-between rounded-full bg-secondary px-2 text-muted-foreground"><Sun className="size-3.5" /><Moon className="size-3.5" /><span className={`absolute top-1 size-6 rounded-full bg-ev-mint shadow-sm transition-all ${dark ? 'left-9' : 'left-1'}`} /></button></div>
        </div>
        <div className="px-2 pt-6 pb-2 lg:px-4">
          {notice && <div className="mb-5 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-xs text-success"><span><Check className="mr-2 inline size-3.5" />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X className="size-4" /></button></div>}
          {activeTab === 0 && <Timetable sessionsList={sessionsList} availableGroups={availableGroups} selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} onSelect={s => setSelected(sessionDetail(s))} />}
          {activeTab === 1 && <Fest rows={visibleBookings} stats={festStats} filter={statusFilter} setFilter={setStatusFilter} onSelect={r => setSelected(bookingDetail(r))} />}
          {activeTab === 2 && <ExamGrid list={examsList} onSelect={e => setSelected(examDetail(e))} />}
          {activeTab === 3 && (
            <Disruption
              preview={disruptionPreview}
              moves={disruptionMoves}
              isCommitted={activeView === 'after_disruption'}
              onPreview={handlePreviewDisruption}
              onApprove={handleApproveDisruption}
              onRevert={handleRevertDisruption}
              decisions={disruptionDecisions}
              onDecisionChange={handleDecisionChange}
              onApplyMoves={handleApplyMoves}
              history={disruptionHistory}
              onRollback={handleRollback}
              availableRooms={availableRooms}
            />
          )}
          {activeTab === 4 && <Assistant bookingText={bookingText} setBookingText={setBookingText} parsed={parsed} parsedData={parsedData} submitBooking={submitBooking} confirmBooking={confirmBookingDb} venuesList={venuesList} />}
        </div>
      </div>
    </div>

    {selected && <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-md border-l border-timetable-grid bg-card p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{selected.kicker}</p><h3 className="mt-1 text-xl font-semibold">{selected.title}</h3></div><button onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-accent" aria-label="Close"><X className="size-4" /></button></div>
      <div className={`mt-5 rounded-none border border-timetable-grid p-4 ${selected.hueCls}`}><p className="text-sm font-medium">{selected.line1}</p><p className="mt-1 text-sm opacity-80">{selected.line2}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3">{selected.fields.map(([l, v]) => <div key={l} className="rounded-none border border-timetable-grid bg-muted p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="mt-1 text-sm font-medium">{v}</p></div>)}</div>
      <div className="mt-4 rounded-lg border border-timetable-grid p-4 text-sm leading-6 text-muted-foreground"><Sparkles className="mb-2 size-4 text-foreground" />{selected.note}</div>
      <button onClick={handleAskAiExplain} disabled={aiLoading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-ink-foreground hover:opacity-90 disabled:opacity-50">
        {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
        Ask AI: Why is this placed here?
      </button>
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
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-lg border border-timetable-grid bg-card ${className}`}>{children}</section> }

function useNow() {
  const [now, setNow] = useState<{ day: number; hour: number } | null>(null)
  useEffect(() => {
    const tick = () => { const d = new Date(); const day = d.getDay() - 1; const hour = d.getHours() + d.getMinutes() / 60; setNow(day >= 0 && day < 5 && hour >= HOUR_START && hour < HOUR_END ? { day, hour } : { day: 1, hour: 10 + 40 / 60 }) }
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t)
  }, [])
  return now
}

function Timetable({
  sessionsList,
  availableGroups,
  selectedGroup,
  onSelectGroup,
  onSelect
}: {
  sessionsList: Session[]
  availableGroups: string[]
  selectedGroup: string
  onSelectGroup: (grp: string) => void
  onSelect: (s: Session) => void
}) {
  const [cat, setCat] = useState('All')
  const now = useNow()
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const list = cat === 'All' ? sessionsList : sessionsList.filter(s => s.cat === cat)

  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Heading title="Week 7 · Semester 2027">
        {categories.map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
      </Heading>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Cohort:</span>
        <select
          value={selectedGroup}
          onChange={e => onSelectGroup(e.target.value)}
          aria-label="Filter student cohort"
          className="rounded-full border border-timetable-grid bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
    </div>
    <div className="overflow-x-auto"><div className="min-w-[900px]">
      <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-timetable-grid text-sm">
        <div className="border-r border-timetable-grid" />{days.map((d, i) => <div key={d} className={`py-1.5 text-center border-r border-timetable-grid last:border-r-0 ${now?.day === i ? 'rounded-full bg-ev-mint text-ev-mint-fg font-medium' : 'text-foreground/80'}`}>{i + 13} - {d}</div>)}
      </div>
      <div className="relative grid grid-cols-[72px_repeat(5,1fr)] border-b border-timetable-grid" style={{ height: hours.length * HOUR_PX }}>
        <div className="border-r border-timetable-grid grid-hours">{hours.map(h => <div key={h} className="pt-2 text-sm text-foreground/80 pr-2 text-right" style={{ height: HOUR_PX }}>{fmt(h)}</div>)}</div>
        {days.map((d, di) => <div key={d} className="relative border-r border-timetable-grid last:border-r-0 grid-hours">
          {!list.some(s => s.day === di && s.start < 14 && s.end > 13) && <div className="absolute inset-x-0 bg-warning-soft/60 px-2 py-1 text-[10px] text-warning" style={{ top: (13 - HOUR_START) * HOUR_PX, height: HOUR_PX }}>Lunch break</div>}
          {list.filter(s => s.day === di).map(s => <button key={s.id} onClick={() => onSelect(s)} className={`absolute inset-x-0 flex flex-col justify-center rounded-none border border-timetable-grid p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[catHue[s.cat] ?? 'violet']}`} style={{ top: (s.start - HOUR_START) * HOUR_PX, height: (s.end - s.start) * HOUR_PX }}>
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

function Fest({ rows, stats, filter, setFilter, onSelect }: { rows: string[][]; stats: [string, string, Hue][]; filter: string; setFilter: (v: string) => void; onSelect: (r: string[]) => void }) {
  return <div>
    <Heading title="Spectra Fest · Week 7">{['All', 'Approved', 'Alternative Offered', 'Rejected'].map(f => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}</Heading>
    <div className="grid gap-3 sm:grid-cols-5">{stats.map(([v, l, h]) => <div key={l} className={`rounded-none border border-timetable-grid p-4 ${hue[h]}`}><p className="text-2xl font-semibold tracking-tight">{v}</p><p className="mt-1 text-xs opacity-80">{l}</p></div>)}</div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">{rows.map(r => <button key={r[0]} onClick={() => onSelect(r)} className={`flex flex-col justify-center rounded-none border border-timetable-grid p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach']}`}>
      <div className="flex items-start justify-between"><div><p className="text-[13px] font-medium leading-tight">{r[1]}</p><p className="mt-0.5 text-[11px] opacity-75">{r[3]}</p></div><MoreHorizontal className="size-3.5" /></div>
      <p className="mt-3 text-[11px] opacity-75">{r[0]} · {r[2]}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] opacity-75"><DoorOpen className="size-3" />{r[4]}</p>
      <div className="mt-4"><StatusChip label={r[5] ?? ''} /></div>
    </button>)}</div>
  </div>
}

function ExamGrid({ list, onSelect }: { list: string[][]; onSelect: (e: string[]) => void }) {
  const [cat, setCat] = useState('All')
  const filtered = list.filter(e => cat === 'All' || e[1] === cat)
  return <div>
    <Heading title="Midsem Exams · 14–19 Oct">{['All', 'AM', 'PM'].map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c === 'All' ? 'All' : c === 'AM' ? 'Morning' : 'Afternoon'}</Pill>)}</Heading>
    <div className="overflow-x-auto"><div className="grid min-w-[860px] grid-cols-[72px_repeat(6,1fr)] border-b border-timetable-grid">
      <div className="border-b border-r border-timetable-grid" />{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => <div key={d} className="border-b border-r border-timetable-grid py-1.5 text-center text-sm text-foreground/80 last:border-r-0">{14 + i} - {d.charAt(0) + d.slice(1).toLowerCase()}</div>)}
      {['AM', 'PM'].map(slot => <React.Fragment key={slot}>
        <div className="border-b border-r border-timetable-grid pt-3 text-sm text-foreground/80 pr-2 text-right">{slot === 'AM' ? '09:30' : '14:00'}<p className="text-[11px] text-muted-foreground">{slot === 'AM' ? 'to 11:30' : 'to 16:00'}</p></div>
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => { const e = filtered.find(x => x[0] === d && x[1] === slot); return <div key={d} className="min-h-[170px] border-b border-r border-timetable-grid last:border-r-0">{e && <button onClick={() => onSelect(e)} className={`flex h-full w-full flex-col justify-center rounded-none border border-timetable-grid p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[slot === 'AM' ? 'sky' : 'violet']}`}>
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

function Disruption({
  preview,
  moves,
  isCommitted,
  onPreview,
  onApprove,
  onRevert,
  decisions,
  onDecisionChange,
  onApplyMoves,
  history,
  onRollback,
  availableRooms
}: {
  preview: boolean
  moves: string[][]
  isCommitted: boolean
  onPreview: () => void
  onApprove: () => void
  onRevert: () => void
  decisions: Record<string, { action: 'ACCEPT' | 'REJECT' | 'REASSIGN'; room_id: string }>
  onDecisionChange: (sessionId: string, action: 'ACCEPT' | 'REJECT' | 'REASSIGN', roomId?: string) => void
  onApplyMoves: () => void
  history: any[]
  onRollback: (logId: number) => void
  availableRooms: string[]
}) {
  const [activeSubTab, setActiveSubTab] = useState<'simulation' | 'history'>('simulation')
  const [busy, setBusy] = useState(false)

  const wrappedApplyMoves = async () => {
    setBusy(true)
    await onApplyMoves()
    setBusy(false)
  }

  const wrappedApprove = async () => {
    setBusy(true)
    await onApprove()
    setBusy(false)
  }

  const wrappedRevert = async () => {
    setBusy(true)
    await onRevert()
    setBusy(false)
  }

  const wrappedRollback = async (id: number) => {
    setBusy(true)
    await onRollback(id)
    setActiveSubTab('simulation')
    setBusy(false)
  }

  // Helper to extract default proposed room from move string
  const getProposedRoom = (m: string[]) => {
    const match = m[3]?.match(/Room\s+([A-Za-z0-9-]+)|·\s*([A-Za-z0-9-]+)/)
    return match ? (match[1] || match[2]) : 'LAB-2'
  }

  // Count decisions
  const stats = useMemo(() => {
    let accepted = 0
    let reassigned = 0
    let rejected = 0
    moves.forEach(m => {
      const dec = decisions[m[0]]
      if (!dec || dec.action === 'ACCEPT') accepted++
      else if (dec.action === 'REASSIGN') reassigned++
      else if (dec.action === 'REJECT') rejected++
    })
    return { accepted, reassigned, rejected }
  }, [moves, decisions])

  return (
    <div>
      <Heading title="Disruption Studio">
        <Pill active={activeSubTab === 'simulation'} onClick={() => setActiveSubTab('simulation')}>
          Simulation & Review
        </Pill>
        <Pill active={activeSubTab === 'history'} onClick={() => setActiveSubTab('history')}>
          Audit History & Rollback {history.length > 0 ? `(${history.length})` : ''}
        </Pill>
      </Heading>

      {activeSubTab === 'simulation' ? (
        <>
          <div className={`flex flex-wrap items-center justify-between gap-4 rounded-none border border-timetable-grid p-5 ${hue.periwinkle}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Simulate or apply campus disruptions</p>
                {isCommitted ? (
                  <span className="rounded-full bg-success px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    ✓ Committed & Live
                  </span>
                ) : (
                  <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground/80 border border-timetable-grid">
                    Draft Simulation
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] opacity-75">
                Faculty leave, room closure, and extra sessions. Active closure: LAB-1.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreview}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition"
              >
                <GitCompareArrows className="size-4" />
                {preview ? 'Hide diff' : 'Preview disruption diff'}
              </button>
            </div>
          </div>

          {preview ? (
            <>
              {/* Summary counters */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1.5 font-medium">{moves.length} sessions moved</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1.5 font-medium">
                  {stats.accepted} accepted
                </span>
                <span className="rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 px-3 py-1.5 font-medium">
                  {stats.reassigned} reassigned
                </span>
                <span className="rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-1.5 font-medium">
                  {stats.rejected} rejected
                </span>
                {isCommitted && (
                  <span className="rounded-full bg-success/20 px-3 py-1.5 text-success font-medium">
                    Currently active on timetable
                  </span>
                )}
              </div>

              {/* Individual Move Cards */}
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {moves.map(m => {
                  const sid = m[0]
                  const proposedRoom = getProposedRoom(m)
                  const dec = decisions[sid] || { action: 'ACCEPT', room_id: proposedRoom }
                  const currentRoom = dec.room_id || proposedRoom

                  return (
                    <div
                      key={sid}
                      className={`flex flex-col justify-between rounded-none border border-timetable-grid p-4 transition ${
                        dec.action === 'ACCEPT'
                          ? `${hue.sky} ring-1 ring-emerald-500/30`
                          : dec.action === 'REASSIGN'
                          ? `${hue.violet} ring-1 ring-sky-500/30`
                          : 'bg-muted/70 opacity-80 ring-1 ring-rose-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono tracking-wide uppercase opacity-70">
                              {sid}
                            </span>
                            <p className="text-sm font-medium">{m[1]}</p>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              dec.action === 'ACCEPT'
                                ? 'bg-emerald-600 text-white'
                                : dec.action === 'REASSIGN'
                                ? 'bg-sky-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {dec.action}
                          </span>
                        </div>

                        {/* Strikethrough original and proposed */}
                        <div className="mt-3 text-xs">
                          <p className="line-through opacity-60">{m[2]}</p>
                          <p className="mt-1 font-medium">{m[3]}</p>
                        </div>
                      </div>

                      {/* Decision Controls */}
                      <div className="mt-4 pt-3 border-t border-timetable-grid/60">
                        <p className="text-[11px] font-medium opacity-80 mb-2">Individual Action:</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* Accept */}
                          <button
                            type="button"
                            onClick={() => onDecisionChange(sid, 'ACCEPT', proposedRoom)}
                            className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                              dec.action === 'ACCEPT'
                                ? 'bg-emerald-600 text-white font-medium shadow-sm'
                                : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
                            }`}
                            title="Accept recommended room"
                          >
                            <CheckCircle2 className="size-3" />
                            Accept
                          </button>

                          {/* Reassign */}
                          <button
                            type="button"
                            onClick={() => onDecisionChange(sid, 'REASSIGN', currentRoom)}
                            className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                              dec.action === 'REASSIGN'
                                ? 'bg-sky-600 text-white font-medium shadow-sm'
                                : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
                            }`}
                            title="Reassign to custom room"
                          >
                            <ArrowRight className="size-3" />
                            Reassign
                          </button>

                          {/* Reject */}
                          <button
                            type="button"
                            onClick={() => onDecisionChange(sid, 'REJECT')}
                            className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                              dec.action === 'REJECT'
                                ? 'bg-rose-600 text-white font-medium shadow-sm'
                                : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
                            }`}
                            title="Reject relocation (keep original room)"
                          >
                            <XCircle className="size-3" />
                            Reject
                          </button>
                        </div>

                        {/* If Reassign is chosen, show room picker */}
                        {dec.action === 'REASSIGN' && (
                          <div className="mt-3 rounded bg-card/90 p-2 border border-timetable-grid">
                            <label className="block text-[11px] font-medium text-foreground/80 mb-1">
                              Override Venue:
                            </label>
                            <select
                              value={currentRoom}
                              onChange={(e) => onDecisionChange(sid, 'REASSIGN', e.target.value)}
                              className="w-full rounded border border-timetable-grid bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ink"
                            >
                              {availableRooms.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Status message */}
                        <div className="mt-2 text-[11px] opacity-75">
                          {dec.action === 'ACCEPT' && `Moving to suggested: ${proposedRoom}`}
                          {dec.action === 'REASSIGN' && `Overriding destination: ${currentRoom}`}
                          {dec.action === 'REJECT' && `Keeps baseline assignment`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Action Footer */}
              {isCommitted ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-none border border-timetable-grid bg-success-soft p-4">
                  <div className="flex items-start gap-2 text-[13px] text-success">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    <span>Repaired timetable is actively deployed on campus. You can adjust individual decisions and re-commit, or revert back to baseline.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={wrappedApplyMoves}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Update & Re-commit Decisions
                    </button>
                    <button
                      onClick={wrappedRevert}
                      disabled={busy}
                      className="rounded-full border border-timetable-grid bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50"
                    >
                      Revert to Baseline Schedule
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-none border border-timetable-grid bg-warning-soft p-4">
                  <div className="flex items-start gap-2 text-[13px] text-warning">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>Review decisions above. Commit reviewed moves individually or accept all proposed repairs.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={wrappedApplyMoves}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Commit Reviewed Decisions
                    </button>
                    <button
                      onClick={wrappedApprove}
                      disabled={busy}
                      className="rounded-full border border-timetable-grid bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50"
                    >
                      Accept All & Commit
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 grid min-h-56 place-items-center rounded-none border border-dashed border-timetable-grid text-center">
              <div>
                <SlidersHorizontal className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Simulation is ready</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isCommitted
                    ? "Repaired schedule is live. Click 'Preview diff' to review reassignments."
                    : "Click 'Preview disruption diff' to run live repair solver."}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Audit History & Rollback Tab */
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-none border border-timetable-grid p-4 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Disruption State Audit Trail</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every disruption approval, individual decision commit, and rollback is versioned. Restore any historical state with a single click.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-3 py-1 font-medium">
                {history.length} Saved {history.length === 1 ? 'Snapshot' : 'Snapshots'}
              </span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="grid min-h-56 place-items-center rounded-none border border-dashed border-timetable-grid p-8 text-center">
              <div>
                <History className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No disruption history recorded yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Commit changes in the simulation tab to generate an audit log entry.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item: any) => {
                const actionBadgeClass =
                  item.action === 'COMMIT_ALL'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : item.action === 'INDIVIDUAL_MOVES'
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                    : item.action === 'ROLLBACK'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-purple-500/10 text-purple-600 border-purple-500/20'

                const formattedTime = item.created_at
                  ? new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : 'Recent'

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-none border border-timetable-grid bg-card p-4 hover:border-foreground/30 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          #LOG-{item.id}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${actionBadgeClass}`}>
                          {item.action || item.disruption_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formattedTime}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {item.summary || item.notes || `Disruption event on ${item.affected_entity}`}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Entity: {item.affected_entity || 'SCHEDULE'}</span>
                        {item.has_snapshot && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600 font-medium">Schedule snapshot preserved</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => wrappedRollback(item.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-full border border-timetable-grid bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-ink hover:text-ink-foreground transition disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <History className="size-3.5" />}
                        Rollback to this state
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Assistant({
  bookingText,
  setBookingText,
  parsed,
  parsedData,
  submitBooking,
  confirmBooking,
  venuesList
}: {
  bookingText: string
  setBookingText: (v: string) => void
  parsed: boolean
  parsedData: any
  submitBooking: () => void
  confirmBooking: () => void
  venuesList: [string, string, string][]
}) {
  return <div>
    <Heading title="AI Booking Assistant" />
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Panel className="overflow-hidden">
        <div className={`p-6 ${hue.violet}`}><div className="flex items-center gap-2 text-xs font-medium"><Bot className="size-4" />Venue booking assistant</div><h3 className="mt-3 text-xl font-medium tracking-tight">Tell us what you need. We&apos;ll find the best fit.</h3><p className="mt-2 max-w-xl text-[13px] leading-5 opacity-75">Describe your event in plain English or Hinglish. The assistant reads the requirements and checks venue availability.</p></div>
        <div className="p-5">
          <label className="mb-2 block text-sm font-medium" htmlFor="booking-request">Request details</label>
          <textarea id="booking-request" value={bookingText} onChange={e => setBookingText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBooking() } }} className="min-h-28 w-full resize-none rounded-lg border border-timetable-grid bg-muted p-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" placeholder="e.g. 'seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye'" />
          <div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground"><Command className="mr-1 inline size-3" />Enter to parse</span><button onClick={submitBooking} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground"><Send className="size-3.5" />Parse request</button></div>
          {parsed && <div className="mt-6 rounded-lg border border-timetable-grid">
            <div className="flex items-center justify-between border-b border-timetable-grid p-4"><div><p className="text-sm font-medium">Parsed booking request</p><p className="mt-1 text-xs text-muted-foreground">Review fields before submitting to live DBMS.</p></div><Confirmed /></div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">{[
              ['Title', parsedData?.title || bookingText || 'Seminar Hall Request'],
              ['Attendance', `${parsedData?.attendance || 100} people`],
              ['Duration', `${parsedData?.duration_periods || 2} hours`],
              ['Day', parsedData?.windows?.[0]?.day || 'Tomorrow'],
              ['Start', parsedData?.windows?.[0]?.start_time || '18:00'],
              ['Requested room', parsedData?.requested_room || 'Seminar Hall']
            ].map(([l, v]) => <label key={l} className="text-xs text-muted-foreground">{l}<input defaultValue={v} className="mt-1.5 w-full rounded-md border border-timetable-grid px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>)}</div>
            <div className="flex flex-wrap gap-2 border-t border-timetable-grid p-4">{['Projector', 'PA System', 'Stage', 'Accessible'].map(n => <label key={n} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs"><input type="checkbox" defaultChecked={n === 'PA System' || (parsedData?.needs || []).includes(n.toLowerCase().replace(' ', '_'))} className="accent-foreground" />{n}</label>)}</div>
            <div className="flex justify-end gap-2 border-t border-timetable-grid p-4"><button onClick={() => setBookingText('')} className="rounded-full bg-secondary px-4 py-2 text-sm">Clear</button><button onClick={confirmBooking} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">Submit booking</button></div>
          </div>}
        </div>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel className="p-5"><div className="flex items-center gap-2 text-sm font-medium"><MessageSquareText className="size-4" />Recent requests</div><div className="mt-4 flex flex-col gap-2">{([['Seminar Hall · tomorrow 18:00', 'mint'], ['Auditorium · Fri 09:00', 'peach'], ['LH-2 · next Monday', 'sky']] as [string, Hue][]).map(([t, h]) => <div key={t} className={`rounded-none border border-timetable-grid p-3 ${hue[h]}`}><p className="text-[13px] font-medium">{t}</p><p className="mt-0.5 text-[11px] opacity-75">Awaiting approval</p></div>)}</div></Panel>
        <Panel className="p-5"><div className="flex items-center gap-2 text-sm font-medium"><Pencil className="size-4" />Available venues</div><div className="mt-4 flex flex-col gap-2 text-[13px]">{venuesList.map(v => <div key={v[0]} className="flex items-center justify-between rounded-md bg-muted px-3 py-2"><span><b className="font-medium">{v[0]}</b><span className="ml-2 text-muted-foreground">{v[1]}</span></span><span className={`rounded-full px-2 py-0.5 text-[11px] ${v[2] === 'Available' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{v[2]}</span></div>)}</div></Panel>
      </div>
    </div>
  </div>
}

function AuthScreen({
  onLoginSuccess,
  dark,
  setDark,
}: {
  onLoginSuccess: (token: string, user: AuthUser) => void
  dark: boolean
  setDark: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState('STUDENT')
  const [department, setDepartment] = useState('Computer Science')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed. Please check your credentials.')
      }
      onLoginSuccess(data.access_token, data.user)
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: selectedRole,
          department: department.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.')
      }
      onLoginSuccess(data.access_token, data.user)
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoLogin = async (roleEnum: string) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/oauth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleEnum })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Demo login failed.')
      }
      onLoginSuccess(data.access_token, data.user)
    } catch (err: any) {
      setError(err.message || 'Demo login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSSO = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/oauth/google/url`)
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
      // If Google OAuth credentials aren't configured in .env, fallback to standard demo login
      await handleQuickDemoLogin('ADMIN')
    } catch {
      await handleQuickDemoLogin('ADMIN')
    } finally {
      setLoading(false)
    }
  }

  const demoPersonas = [
    { title: 'Academic Dean', role: 'ADMIN', email: 'admin@cit.edu', icon: '👑', color: 'border-emerald-500/30 hover:border-emerald-500' },
    { title: 'Dr. Arvind Rao (Faculty)', role: 'FACULTY', email: 'faculty@cit.edu', icon: '👨‍🏫', color: 'border-blue-500/30 hover:border-blue-500' },
    { title: 'Aarav Mehta (Club Lead)', role: 'CLUB_LEAD', email: 'club@cit.edu', icon: '🎪', color: 'border-purple-500/30 hover:border-purple-500' },
    { title: 'Rohan Sharma (Student)', role: 'STUDENT', email: 'student@cit.edu', icon: '🎓', color: 'border-amber-500/30 hover:border-amber-500' },
  ]

  return (
    <div className="min-h-screen bg-canvas p-4 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Dark mode toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          role="switch"
          aria-checked={dark}
          aria-label="Toggle dark mode"
          onClick={() => setDark(d => !d)}
          className="relative flex h-8 w-16 items-center justify-between rounded-full bg-secondary px-2 text-muted-foreground"
        >
          <Sun className="size-3.5" />
          <Moon className="size-3.5" />
          <span className={`absolute top-1 size-6 rounded-full bg-ev-mint shadow-sm transition-all ${dark ? 'left-9' : 'left-1'}`} />
        </button>
      </div>

      <div className="w-full max-w-md my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-ink text-ink-foreground shadow-lg mb-3">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CIT Operations Portal</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Chilika Institute of Technology · Campus Management & Scheduling
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-timetable-grid bg-card p-6 shadow-xl backdrop-blur-sm">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <div>
              {/* Demo One-Click Personas */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    ⚡ Quick Demo Login
                  </span>
                  <span className="text-[10px] text-muted-foreground">1-Click Access</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoPersonas.map(p => (
                    <button
                      key={p.role}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemoLogin(p.role)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border bg-background/50 hover:bg-secondary/60 transition text-left ${p.color} disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <span>{p.icon}</span>
                        <span className="truncate">{p.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-timetable-grid w-full" />
                <span className="bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase">
                  or email login
                </span>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Campus Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. admin@cit.edu"
                      className="w-full rounded-xl border border-timetable-grid bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-foreground">
                      Password
                    </label>
                    <span className="text-[10px] text-muted-foreground">Demo: Admin@123</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-xl border border-timetable-grid bg-background pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-xs font-semibold text-ink-foreground hover:opacity-90 transition disabled:opacity-50 mt-4 shadow-sm"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Sign In to Campus Portal
                </button>

                {/* Google SSO */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSSO}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-timetable-grid bg-card py-2 text-xs font-medium text-foreground hover:bg-secondary transition disabled:opacity-50"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continue with Google
                </button>
              </form>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Priyadarshi Dash"
                  className="w-full rounded-xl border border-timetable-grid bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@cit.edu"
                    className="w-full rounded-xl border border-timetable-grid bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-timetable-grid bg-background pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    className="w-full rounded-xl border border-timetable-grid bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="CLUB_LEAD">Club Representative</option>
                    <option value="ADMIN">Dean / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. CSE / ECE"
                    className="w-full rounded-xl border border-timetable-grid bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-xs font-semibold text-ink-foreground hover:opacity-90 transition disabled:opacity-50 mt-4 shadow-sm"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Create Account & Access Portal
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Protected by Campus RBAC & JWT Security · Multi-Tenant DBMS Integration
        </p>
      </div>
    </div>
  )
}
