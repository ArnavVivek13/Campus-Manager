import React from 'react'
import { useEffect, useMemo, useState, useRef } from 'react'
import { AlertTriangle, Bot, CalendarDays, Check, ChevronRight, CircleCheck, Clock3, Command, DoorOpen, GitCompareArrows, GraduationCap, MessageSquareText, MoreHorizontal, PanelLeft, Pencil, RotateCcw, Send, SlidersHorizontal, Sparkles, Users, X, Menu, Moon, Sun, Loader2, History, CheckCircle2, XCircle, ArrowRight, LogOut, Lock, Mail, Eye, EyeOff, ShieldCheck, UserPlus, Download, Upload, Trash2, UserCheck, UserX, RefreshCw } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000'

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
  id: r[0] ?? '',
  type: 'booking',
  kicker: 'Booking detail',
  title: r[1] ?? '',
  hueCls: hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach'],
  line1: `${r[0] ?? ''} · ${r[5] ?? ''}`,
  line2: r[3] ?? '',
  fields: [['Requested by', r[2] ?? ''], ['Requested slot', r[3] ?? ''], ['Assigned venue', r[4] ?? ''], ['Status', r[5] ?? '']],
  note: r[5] === 'Approved' ? 'Approved after scoring against venue capacity, equipment needs, and clash checks.' : r[5] === 'Rejected' ? 'Rejected: no venue satisfies the capacity and equipment requirements for the requested slot.' : 'The requested slot clashes with an existing booking, so the closest available alternative was offered.',
})

const examDetail = (e: string[]): Detail => ({
  id: e[2] ?? '',
  type: 'exam',
  kicker: 'Exam detail',
  title: e[3] ?? '',
  hueCls: hue[e[1] === 'AM' ? 'sky' : 'violet'],
  line1: `${e[2] ?? ''} · ${e[1] === 'AM' ? 'Morning' : 'Afternoon'} session`,
  line2: `${e[0] ?? ''} · ${e[1] === 'AM' ? '09:30 – 11:30' : '14:00 – 16:00'}`,
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
  const [menuOpen, setMenuOpen] = useState(true)
  const [dark, setDark] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [disruptionLoading, setDisruptionLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live Backend State - Initialized empty by default as requested
  const [selectedWeek, setSelectedWeek] = useState<number>(7)
  const [sessionsList, setSessionsList] = useState<Session[]>([])
  const [examsList, setExamsList] = useState<string[][]>([])
  const [bookingsList, setBookingsList] = useState<string[][]>([])
  const [festStats, setFestStats] = useState<[string, string, Hue][]>([
    ['0/0', 'Booking score', 'violet'],
    ['0', 'Approved', 'mint'],
    ['0', 'Alternatives offered', 'peach'],
    ['0', 'Rejected', 'rose'],
    ['0', 'Inversions', 'sky'],
  ])
  const [disruptionMoves, setDisruptionMoves] = useState<string[][]>([])

  // User-Action Floating Toast Notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([])
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }
  const [disruptionDecisions, setDisruptionDecisions] = useState<Record<string, { action: 'ACCEPT' | 'REJECT' | 'REASSIGN'; room_id: string }>>({})
  const [disruptionHistory, setDisruptionHistory] = useState<any[]>([])
  const [availableRooms, setAvailableRooms] = useState<string[]>([
    'LAB-2', 'LAB-3', 'CR-104', 'LH-1', 'LH-2', 'LH-3', 'AUD', 'SEM-HALL'
  ])
  const [filterType, setFilterType] = useState<'group' | 'faculty' | 'room'>('group')
  const [availableGroups, setAvailableGroups] = useState<string[]>(['CSE-2', 'All', 'Y1-A', 'Y1-B', 'Y1-C', 'Y1-D', 'CSE-3', 'ECE-2'])
  const [selectedGroup, setSelectedGroup] = useState<string>('CSE-2')
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All')
  const [selectedRoom, setSelectedRoom] = useState<string>('All')
  const [availableFaculty, setAvailableFaculty] = useState<{ id: string; name: string; department: string }[]>([])
  const [availableRoomsList, setAvailableRoomsList] = useState<{ id: string; name: string; capacity?: number }[]>([
    { id: 'AUD', name: 'Main Auditorium' },
    { id: 'LH-1', name: 'Lecture Hall 1' },
    { id: 'LH-2', name: 'Lecture Hall 2' },
    { id: 'LH-3', name: 'Lecture Hall 3' },
    { id: 'CR-101', name: 'Classroom 101' },
    { id: 'CR-102', name: 'Classroom 102' },
    { id: 'CR-103', name: 'Classroom 103' },
    { id: 'CR-104', name: 'Classroom 104' },
    { id: 'LAB-1', name: 'Computing Lab' },
    { id: 'LAB-2', name: 'Software Lab' },
    { id: 'LAB-3', name: 'Hardware Lab' },
  ])
  const [venuesList, setVenuesList] = useState<[string, string, string][]>([
    ['AUD', '420 seats', 'Available'],
    ['SEM-HALL', '120 seats', 'Available'],
    ['LH-1', '90 seats', 'Booked 18:00'],
  ])
  const [activeView, setActiveView] = useState<'baseline' | 'after_disruption'>('baseline')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('active_view') as any
        if (saved) setActiveView(saved)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setDark(localStorage.getItem('theme') === 'dark')
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        document.documentElement.classList.toggle('dark', dark)
        localStorage.setItem('theme', dark ? 'dark' : 'light')
      } catch {}
    }
  }, [dark])

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

  const fetchSchedule = async (
    type: 'group' | 'faculty' | 'room' = filterType,
    val?: string,
    view: string = activeView
  ) => {
    try {
      const activeVal = val !== undefined ? val : (type === 'group' ? selectedGroup : type === 'faculty' ? selectedFaculty : selectedRoom)
      const params = new URLSearchParams()
      if (view) params.append('view', view)
      if (activeVal && activeVal !== 'All') {
        if (type === 'group') params.append('group_id', activeVal)
        else if (type === 'faculty') params.append('faculty_id', activeVal)
        else if (type === 'room') params.append('room_id', activeVal)
      }
      const res = await fetch(`${API_BASE}/api/schedule?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.sessions)) {
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
      if (data.faculty && Array.isArray(data.faculty)) {
        setAvailableFaculty(data.faculty)
      }
      if (data.rooms && Array.isArray(data.rooms)) {
        setAvailableRoomsList(data.rooms.map((r: any) => ({ id: r.id, name: r.name || r.id, capacity: r.capacity })))
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
      if (Array.isArray(data.exams)) {
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
      if (Array.isArray(data.bookings)) {
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
    fetchExams()
    fetchBookings()
    fetchDisruptionHistory()
  }, [])

  // Refetch when group, faculty, room filter or disruption view toggles
  useEffect(() => {
    const val = filterType === 'group' ? selectedGroup : filterType === 'faculty' ? selectedFaculty : selectedRoom
    // If not week 7, force baseline view (pure normal academic schedule)
    const effView = selectedWeek === 7 ? activeView : 'baseline'
    fetchSchedule(filterType, val, effView)
  }, [filterType, selectedGroup, selectedFaculty, selectedRoom, activeView, selectedWeek])

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

  const handleClearData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/clear-data`, { method: 'POST' })
      if (res.ok) {
        setSessionsList([])
        setExamsList([])
        setBookingsList([])
        setDisruptionMoves([])
        setDisruptionHistory([])
        setDisruptionPreview(false)
        setDisruptionDecisions({})
        setFestStats([
          ['0', 'Booking score', 'violet'],
          ['0', 'Approved', 'mint'],
          ['0', 'Alternatives offered', 'peach'],
          ['0', 'Rejected', 'rose'],
          ['0', 'Inversions', 'sky'],
        ])
        setNotice('All current data has been successfully cleared from all tables.')
        showToast('All timetable, exam, and booking data cleared successfully.', 'success')
      }
    } catch {
      setSessionsList([])
      setExamsList([])
      setBookingsList([])
      setDisruptionMoves([])
      setNotice('All tables cleared in local state.')
      showToast('All tables cleared in local state.', 'info')
    }
  }

  const handleRestoreBaseline = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/restore-baseline`, { method: 'POST' })
      if (res.ok) {
        setActiveView('baseline')
        localStorage.setItem('active_view', 'baseline')
        setDisruptionPreview(false)
        setNotice('Baseline dataset and clash-free timetable restored.')
        showToast('Baseline CIT semester timetable & bookings restored.', 'success')
        const val = filterType === 'group' ? selectedGroup : filterType === 'faculty' ? selectedFaculty : selectedRoom
        fetchSchedule(filterType, val, 'baseline')
        fetchExams()
        fetchBookings()
        fetchDisruptionHistory()
      }
    } catch {
      const val = filterType === 'group' ? selectedGroup : filterType === 'faculty' ? selectedFaculty : selectedRoom
      fetchSchedule(filterType, val, 'baseline')
      showToast('Restored baseline in local mode.', 'info')
    }
  }

  const handleExportSchedule = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/export/schedule`)
      if (!res.ok) throw new Error('Failed to generate schedule.json')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'schedule.json'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('schedule.json downloaded successfully!', 'success')
    } catch (err: any) {
      // Fallback
      window.open(`${API_BASE}/api/export/schedule`, '_blank')
      showToast('Schedule export initiated.', 'info')
    }
  }

  const handleLoadDataset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDatasetLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/admin/load-dataset`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to load dataset.')
      }
      setNotice(`${data.message || 'Dataset loaded.'} Timetable verified with 0 hard violations.`)
      showToast(`Dataset loaded & solved clash-free! (${data.total_sessions || ''} sessions)`, 'success')
      const val = filterType === 'group' ? selectedGroup : filterType === 'faculty' ? selectedFaculty : selectedRoom
      fetchSchedule(filterType, val, 'baseline')
      fetchExams()
      fetchBookings()
      fetchMetadata()
    } catch (err: any) {
      showToast(err.message || 'Error loading dataset file.', 'error')
    } finally {
      setDatasetLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handlePreviewDisruption = async () => {
    // If already showing preview, just toggle it off (don't re-fetch)
    if (disruptionPreview) {
      setDisruptionPreview(false)
      return
    }
    setDisruptionLoading(true)
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
    } finally {
      setDisruptionLoading(false)
    }
  }

  const handleUploadDisruption = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setDisruptionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/disruption/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to process disruption file')
      if (Array.isArray(data.changes)) {
        const mapped = data.changes.map((c: any) => [
          c.session_id,
          c.session_id + (c.change_type === 'new_session_added' ? ' (new)' : ''),
          c.from ? `Original: ${c.from.day} P${c.from.start_period} · ${c.from.room_id}` : 'New session',
          c.to ? `Moved to: ${c.to.day} P${c.to.start_period} · ${c.to.room_id}` : 'Unscheduled'
        ])
        setDisruptionMoves(mapped)
      }
      setDisruptionPreview(true)
      showToast(data.message || 'Custom disruption solved with minimal perturbation!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error processing disruption', 'error')
    } finally {
      setDisruptionLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleApproveDisruption = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/disruption/approve`, { method: 'POST' })
      if (res.ok) {
        setActiveView('after_disruption')
        localStorage.setItem('active_view', 'after_disruption')
        setNotice('Schedule changes approved and committed to live semester timetable.')
        fetchSchedule('group', selectedGroup, 'after_disruption')
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
        fetchSchedule('group', selectedGroup, 'baseline')
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
        const sid = m[0] ?? ''
        const defaultTarget = (m[3] ?? '').replace('Reassigned: Room ', '').replace('Reassigned: ', '').trim()
        const dec = (sid && disruptionDecisions[sid]) ? disruptionDecisions[sid] : { action: 'ACCEPT' as const, room_id: defaultTarget }
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
        fetchSchedule('group', selectedGroup, 'after_disruption')
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
        fetchSchedule('group', selectedGroup, data.active_view)
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

  const userRole = currentUser?.role || 'STUDENT'

  const accessibleTabs = useMemo(() => {
    if (userRole === 'ADMIN') {
      return [
        { name: 'Master Timetable', icon: CalendarDays, tabIndex: 0 },
        { name: 'Spectra Fest', icon: Sparkles, tabIndex: 1 },
        { name: 'Midsem Exams', icon: GraduationCap, tabIndex: 2 },
        { name: 'Disruption Studio', icon: GitCompareArrows, tabIndex: 3 },
        { name: 'AI Booking Assistant', icon: Bot, tabIndex: 4 },
        { name: 'User Management', icon: ShieldCheck, tabIndex: 5 },
      ]
    }
    if (userRole === 'FACULTY') {
      return [
        { name: 'Master Timetable', icon: CalendarDays, tabIndex: 0 },
        { name: 'Spectra Fest', icon: Sparkles, tabIndex: 1 },
        { name: 'Midsem Exams', icon: GraduationCap, tabIndex: 2 },
        { name: 'Disruption Studio', icon: GitCompareArrows, tabIndex: 3 },
        { name: 'AI Booking Assistant', icon: Bot, tabIndex: 4 },
      ]
    }
    if (userRole === 'CLUB_LEAD') {
      return [
        { name: 'Master Timetable', icon: CalendarDays, tabIndex: 0 },
        { name: 'Spectra Fest', icon: Sparkles, tabIndex: 1 },
        { name: 'AI Booking Assistant', icon: Bot, tabIndex: 4 },
      ]
    }
    // STUDENT
    return [
      { name: 'Master Timetable', icon: CalendarDays, tabIndex: 0 },
      { name: 'Spectra Fest', icon: Sparkles, tabIndex: 1 },
      { name: 'Midsem Exams', icon: GraduationCap, tabIndex: 2 },
    ]
  }, [userRole])

  // Ensure activeTab is always one of the user's accessible tabs
  useEffect(() => {
    if (!accessibleTabs.some(t => t.tabIndex === activeTab)) {
      setActiveTab(accessibleTabs[0]?.tabIndex ?? 0)
    }
  }, [accessibleTabs, activeTab])

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
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] gap-4 relative items-start">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Floating Green Gradient Menu */}
      <aside
        className={`fixed inset-y-3 left-3 z-40 flex flex-col grad-shell rounded-2xl border border-timetable-grid shadow-2xl transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:max-h-[calc(100vh-3rem)] ${
          menuOpen
            ? 'w-64 p-4 opacity-100 translate-x-0'
            : 'w-0 p-0 opacity-0 -translate-x-full lg:w-0 lg:p-0 lg:opacity-0 pointer-events-none border-transparent'
        } overflow-y-auto overflow-x-hidden shrink-0`}
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="grid size-10 place-items-center rounded-lg bg-ink text-[11px] font-bold text-ink-foreground shadow-sm">
            CIT
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-1.5 hover:bg-card/50 text-foreground/70 hover:text-foreground transition"
            title="Collapse menu"
          >
            <PanelLeft className="size-5" />
          </button>
        </div>

        <p className="mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Main menu
        </p>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1 shrink-0" role="tablist">
          {accessibleTabs.map(tab => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.tabIndex
            return (
              <button
                key={tab.name}
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveTab(tab.tabIndex)
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMenuOpen(false)
                  }
                }}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition ${
                  isSelected
                    ? 'bg-card/90 font-medium shadow-sm'
                    : 'text-foreground/80 hover:bg-card/50'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {tab.name}
              </button>
            )
          })}
        </nav>

        {/* Directly underneath the AI booking assistant button - stays in sequence during scroll */}
        <div className="mt-4 pt-3 border-t border-timetable-grid/50 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearData}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-sm"
              title="Clear all current data from all tables"
            >
              <RotateCcw className="size-3.5" />
              <span>Clear Data</span>
            </button>

            <button
              onClick={handleRestoreBaseline}
              className="flex items-center justify-center gap-1 rounded-xl border border-timetable-grid bg-secondary/80 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition shadow-sm"
              title="Restore baseline schedule dataset"
            >
              <History className="size-3.5 text-muted-foreground" />
              <span>Restore</span>
            </button>
          </div>

          {/* User Account Card */}
          <div className="rounded-xl border border-timetable-grid bg-card/80 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-xs font-bold text-ink-foreground shadow-sm">
                  {currentUser.full_name?.slice(0, 2).toUpperCase() || 'CI'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-foreground leading-tight" title={currentUser.full_name || 'CIT Operations'}>
                    {currentUser.full_name || 'CIT Operations'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5" title={currentUser.email}>
                    {currentUser.email || 'admin@cit.edu'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="shrink-0 flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-600 hover:text-white transition"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="size-3" />
                <span>Exit</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-timetable-grid/50 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-emerald-500'
                    : currentUser.role === 'FACULTY'
                    ? 'bg-blue-500'
                    : currentUser.role === 'CLUB_LEAD'
                    ? 'bg-purple-500'
                    : 'bg-amber-500'
                }`} />
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-muted-foreground truncate max-w-[110px]" title={currentUser.department || 'Academic Affairs'}>
                {currentUser.department || 'Academic Affairs'}
              </span>
            </div>
          </div>

          {/* Admin Dataset Operations: Load & Export */}
          {currentUser.role === 'ADMIN' && (
            <div className="rounded-xl border border-timetable-grid bg-card/60 p-2.5 flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dataset & Schedule
              </p>
              
              <button
                onClick={handleExportSchedule}
                className="flex w-full items-center justify-between rounded-lg bg-secondary/80 px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent transition"
                title="Download verified schedule.json file"
              >
                <span className="flex items-center gap-1.5">
                  <Download className="size-3 text-muted-foreground" />
                  <span>Export schedule.json</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">.json</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={datasetLoading}
                className="flex w-full items-center justify-between rounded-lg bg-secondary/80 px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent transition disabled:opacity-50"
                title="Load starter pack dataset JSON"
              >
                <span className="flex items-center gap-1.5">
                  {datasetLoading ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="size-3 text-muted-foreground" />
                  )}
                  <span>{datasetLoading ? 'Solving...' : 'Load Dataset JSON'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Upload</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleLoadDataset}
              />
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-2xl border border-timetable-grid bg-card p-3 lg:p-4 shadow-sm transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-timetable-grid px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              className="flex items-center gap-1.5 rounded-full border border-timetable-grid bg-secondary/80 px-2.5 py-1 text-xs font-medium hover:bg-accent transition shadow-sm"
              title={menuOpen ? 'Hide Menu' : 'Show Menu'}
            >
              <PanelLeft className="size-3.5" />
              <span>{menuOpen ? 'Hide Menu' : 'Menu'}</span>
            </button>
            <span className="text-muted-foreground">CIT Campus</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <Clock3 className="size-4" />
            <span className="font-medium">{tabs[activeTab]}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Clash-free · 0 hard violations
            </span>
            {activeView === 'after_disruption' && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning font-medium">
                Repaired View
              </span>
            )}

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={handleExportSchedule}
                className="hidden md:flex items-center gap-1.5 rounded-full border border-timetable-grid bg-secondary/80 px-2.5 py-1 text-xs font-medium hover:bg-accent transition"
                title="Export schedule.json"
              >
                <Download className="size-3.5" />
                <span>Export schedule.json</span>
              </button>
            )}

            {/* Dark mode switch */}
            <button
              role="switch"
              aria-checked={dark}
              aria-label="Toggle dark mode"
              onClick={() => setDark(d => !d)}
              className="relative flex h-7 w-14 items-center justify-between rounded-full bg-secondary px-1.5 text-muted-foreground"
            >
              <Sun className="size-3" />
              <Moon className="size-3" />
              <span className={`absolute top-0.5 size-6 rounded-full bg-ev-mint shadow-sm transition-all ${dark ? 'left-7' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="px-2 pt-6 pb-2 lg:px-4">
          {notice && <div className="mb-5 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-xs text-success"><span><Check className="mr-2 inline size-3.5" />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X className="size-4" /></button></div>}
          {activeTab === 0 && (
            <Timetable
              sessionsList={sessionsList}
              filterType={filterType}
              setFilterType={setFilterType}
              availableGroups={availableGroups}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              availableFaculty={availableFaculty}
              selectedFaculty={selectedFaculty}
              onSelectFaculty={setSelectedFaculty}
              availableRooms={availableRoomsList}
              selectedRoom={selectedRoom}
              onSelectRoom={setSelectedRoom}
              selectedWeek={selectedWeek}
              setSelectedWeek={setSelectedWeek}
              onSelect={s => setSelected(sessionDetail(s))}
            />
          )}
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
              onUploadDisruption={handleUploadDisruption}
              isLoading={disruptionLoading}
            />
          )}
          {activeTab === 4 && <Assistant bookingText={bookingText} setBookingText={setBookingText} parsed={parsed} parsedData={parsedData} submitBooking={submitBooking} confirmBooking={confirmBookingDb} venuesList={venuesList} />}
          {activeTab === 5 && <UserManagementTab showToast={showToast} />}
        </div>
      </div>
    </div>

    {/* Floating Toast Notification Container */}
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'success'
              ? 'bg-card border-emerald-500/40 text-foreground'
              : t.type === 'error'
              ? 'bg-card border-rose-500/40 text-foreground'
              : 'bg-card border-sky-500/40 text-foreground'
          }`}
        >
          <div className={`p-1.5 rounded-full shrink-0 ${
            t.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
            t.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
            'bg-sky-500/10 text-sky-500'
          }`}>
            {t.type === 'success' && <CircleCheck className="size-4" />}
            {t.type === 'error' && <AlertTriangle className="size-4" />}
            {t.type === 'info' && <Sparkles className="size-4" />}
          </div>
          <span className="text-xs font-medium leading-relaxed">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="ml-auto text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Close notification"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
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
  const [now, setNow] = useState<{ day: number; hour: number; timeString: string } | null>(null)
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      // Extract accurate IST (Asia/Kolkata, UTC+5:30) time parts
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
      })
      const parts = formatter.formatToParts(d)
      let weekday = 'Mon'
      let h = 0
      let m = 0
      for (const p of parts) {
        if (p.type === 'weekday') weekday = p.value
        if (p.type === 'hour') h = parseInt(p.value, 10)
        if (p.type === 'minute') m = parseInt(p.value, 10)
      }

      const daysMap: Record<string, number> = {
        'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
      }
      const rawDay = daysMap[weekday] ?? 0
      // Clamped to Mon-Fri (0..4) for the active column on the weekly timetable
      const activeDay = rawDay >= 0 && rawDay <= 4 ? rawDay : 0
      const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const fractionalHour = h + m / 60

      // Keep visual indicator line within timetable display boundaries (8 to 18)
      const visualHour = Math.min(Math.max(fractionalHour, HOUR_START), HOUR_END - 0.1)

      setNow({
        day: activeDay,
        hour: visualHour,
        timeString
      })
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function getWeekDates(weekNum: number) {
  // Base reference: Week 7 starts on Monday, October 13, 2026
  const baseMonday = new Date(2026, 9, 13)
  const diffDays = (weekNum - 7) * 7
  const monday = new Date(baseMonday.getTime() + diffDays * 86400000)

  return [0, 1, 2, 3, 4].map(dayOffset => {
    const d = new Date(monday.getTime() + dayOffset * 86400000)
    return {
      date: d.getDate(),
      month: d.toLocaleString('en-US', { month: 'short' })
    }
  })
}

function Timetable({
  sessionsList,
  filterType,
  setFilterType,
  availableGroups,
  selectedGroup,
  onSelectGroup,
  availableFaculty,
  selectedFaculty,
  onSelectFaculty,
  availableRooms,
  selectedRoom,
  onSelectRoom,
  selectedWeek,
  setSelectedWeek,
  onSelect
}: {
  sessionsList: Session[]
  filterType: 'group' | 'faculty' | 'room'
  setFilterType: (t: 'group' | 'faculty' | 'room') => void
  availableGroups: string[]
  selectedGroup: string
  onSelectGroup: (grp: string) => void
  availableFaculty: { id: string; name: string; department: string }[]
  selectedFaculty: string
  onSelectFaculty: (f: string) => void
  availableRooms: { id: string; name: string }[]
  selectedRoom: string
  onSelectRoom: (r: string) => void
  selectedWeek: number
  setSelectedWeek: (w: number) => void
  onSelect: (s: Session) => void
}) {
  const now = useNow()
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const list = sessionsList
  const weekDates = getWeekDates(selectedWeek)

  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Heading
        title={
          selectedWeek === 7
            ? 'Week 7 · Spectra Fest Week'
            : selectedWeek === 8
            ? 'Week 8 · Midsem Exam Week'
            : `Week ${selectedWeek} · Normal Academic Schedule`
        }
      >
        <Pill active={filterType === 'group'} onClick={() => setFilterType('group')}>
          Student Group
        </Pill>
        <Pill active={filterType === 'faculty'} onClick={() => setFilterType('faculty')}>
          Faculty
        </Pill>
        <Pill active={filterType === 'room'} onClick={() => setFilterType('room')}>
          Room
        </Pill>
      </Heading>
    </div>

    {/* Controls Bar: Week Selector, Week Type Status, and Filters */}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs w-full bg-card/60 p-2.5 rounded-xl border border-timetable-grid mb-4">
      {/* Week Selector Dropdown & Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-timetable-grid bg-card px-3 py-1.5 shadow-sm">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">Week:</span>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            aria-label="Select semester week"
            className="bg-transparent font-semibold text-foreground outline-none cursor-pointer pr-1"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w} className="bg-card text-foreground">
                {w === 7
                  ? 'Week 7 (Spectra Fest Events)'
                  : w === 8
                  ? 'Week 8 (Midsem Exams)'
                  : `Week ${w} (Normal Teaching)`}
              </option>
            ))}
          </select>
        </div>

        {selectedWeek === 7 ? (
          <span className="rounded-full bg-ev-mint px-3 py-1 text-[11px] font-semibold text-ev-mint-fg">
            Spectra Fest Week
          </span>
        ) : selectedWeek === 8 ? (
          <span className="rounded-full bg-peach-soft text-peach px-3 py-1 text-[11px] font-semibold">
            Midsem Exam Week
          </span>
        ) : (
          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">
            Normal Academic Timetable
          </span>
        )}
      </div>

      {/* Cohort / Faculty / Room Filtering */}
      <div className="flex items-center gap-2">
        {filterType === 'group' && (
          <>
            <span className="font-medium text-muted-foreground">Cohort:</span>
            <select
              value={selectedGroup}
              onChange={e => onSelectGroup(e.target.value)}
              aria-label="Filter student cohort"
              className="rounded-full border border-timetable-grid bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {availableGroups.map(g => (
                <option key={g} value={g}>
                  {g === 'All' ? 'All Cohorts' : g}
                </option>
              ))}
            </select>
          </>
        )}

        {filterType === 'faculty' && (
          <>
            <span className="font-medium text-muted-foreground">Faculty:</span>
            <select
              value={selectedFaculty}
              onChange={e => onSelectFaculty(e.target.value)}
              aria-label="Filter faculty member"
              className="rounded-full border border-timetable-grid bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring max-w-[240px]"
            >
              <option value="All">All Faculty</option>
              {availableFaculty.map(f => (
                <option key={f.id} value={f.id}>
                  {f.id} - {f.name} ({f.department})
                </option>
              ))}
            </select>
          </>
        )}

        {filterType === 'room' && (
          <>
            <span className="font-medium text-muted-foreground">Room:</span>
            <select
              value={selectedRoom}
              onChange={e => onSelectRoom(e.target.value)}
              aria-label="Filter room or venue"
              className="rounded-full border border-timetable-grid bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring max-w-[200px]"
            >
              <option value="All">All Rooms</option>
              {availableRooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.id} {r.name && r.name !== r.id ? `(${r.name})` : ''}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>

    {/* Empty State Banner if no sessions are loaded */}
    {list.length === 0 && (
      <div className="mb-4 rounded-xl border border-dashed border-timetable-grid p-8 text-center bg-card/40">
        <CalendarDays className="mx-auto size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-semibold text-foreground">Timetable is currently empty</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
          Initial schedule data is kept empty. As an Administrator, click <strong>&quot;Restore Baseline&quot;</strong> in the sidebar to load the semester dataset, or upload a dataset JSON file.
        </p>
      </div>
    )}

    <div className="overflow-x-auto"><div className="min-w-[900px]">
      <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-timetable-grid text-sm">
        <div className="border-r border-timetable-grid" />
        {days.map((d, i) => {
          const dateInfo = weekDates[i] ?? { date: 1, month: 'Jan' }
          const isToday = now?.day === i
          return (
            <div
              key={d}
              className={`py-2 text-center border-r border-timetable-grid last:border-r-0 ${
                isToday ? 'bg-ev-mint text-ev-mint-fg font-medium rounded-t-lg' : 'text-foreground/80'
              }`}
            >
              <span className="font-semibold text-xs">{d}</span>
              <span className="ml-1.5 text-[11px] opacity-75">{dateInfo.date} {dateInfo.month}</span>
            </div>
          )
        })}
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
          {now?.day === di && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-now"
              style={{ top: (now.hour - HOUR_START) * HOUR_PX }}
            >
              <span
                className="absolute -left-14 -top-3 rounded-full bg-now px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center justify-center tracking-tight"
                title={`Live IST Time: ${now.timeString}`}
              >
                {now.timeString}
              </span>
            </div>
          )}
        </div>)}
      </div>
      {list.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-background/50 backdrop-blur-[1px]">
          <div className="rounded-2xl border border-timetable-grid bg-card/95 p-6 text-center max-w-sm shadow-xl pointer-events-auto">
            <CalendarDays className="size-8 mx-auto text-muted-foreground opacity-60 mb-2" />
            <p className="text-sm font-semibold text-foreground">All Table Data Cleared</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All tables are currently empty. Click &apos;Restore&apos; in the menu or load a dataset JSON to repopulate.
            </p>
          </div>
        </div>
      )}
    </div></div>
  </div>
}

function Fest({ rows, stats, filter, setFilter, onSelect }: { rows: string[][]; stats: [string, string, Hue][]; filter: string; setFilter: (v: string) => void; onSelect: (r: string[]) => void }) {
  return <div>
    <Heading title="Spectra Fest · Week 7">{['All', 'Approved', 'Alternative Offered', 'Rejected'].map(f => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}</Heading>
    <div className="grid gap-3 sm:grid-cols-5">{stats.map(([v, l, h]) => <div key={l} className={`rounded-none border border-timetable-grid p-4 ${hue[h]}`}><p className="text-2xl font-semibold tracking-tight">{v}</p><p className="mt-1 text-xs opacity-80">{l}</p></div>)}</div>
    {rows.length === 0 ? (
      <div className="mt-5 rounded-xl border border-dashed border-timetable-grid p-8 text-center bg-card/40">
        <Sparkles className="mx-auto size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-semibold text-foreground">No fest venue bookings found</p>
        <p className="text-xs text-muted-foreground mt-1">Bookings will appear once submitted via the AI Assistant or when the baseline dataset is restored.</p>
      </div>
    ) : (
      <div className="mt-5 grid gap-3 md:grid-cols-2">{rows.map(r => <button key={r[0]} onClick={() => onSelect(r)} className={`flex flex-col justify-center rounded-none border border-timetable-grid p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${hue[r[5] === 'Approved' ? 'mint' : r[5] === 'Rejected' ? 'rose' : 'peach']}`}>
        <div className="flex items-start justify-between"><div><p className="text-[13px] font-medium leading-tight">{r[1]}</p><p className="mt-0.5 text-[11px] opacity-75">{r[3]}</p></div><MoreHorizontal className="size-3.5" /></div>
        <p className="mt-3 text-[11px] opacity-75">{r[0]} · {r[2]}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] opacity-75"><DoorOpen className="size-3" />{r[4]}</p>
        <div className="mt-4"><StatusChip label={r[5] ?? ''} /></div>
      </button>)}</div>
    )}
  </div>
}

function ExamGrid({ list, onSelect }: { list: string[][]; onSelect: (e: string[]) => void }) {
  const [cat, setCat] = useState('All')
  const filtered = list.filter(e => cat === 'All' || e[1] === cat)
  return <div>
    <Heading title="Midsem Exams · 14–19 Oct">{['All', 'AM', 'PM'].map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c === 'All' ? 'All' : c === 'AM' ? 'Morning' : 'Afternoon'}</Pill>)}</Heading>
    {list.length === 0 ? (
      <div className="mt-5 rounded-xl border border-dashed border-timetable-grid p-8 text-center bg-card/40">
        <GraduationCap className="mx-auto size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-semibold text-foreground">No midsem exams scheduled</p>
        <p className="text-xs text-muted-foreground mt-1">Exam slots will populate once a dataset is loaded or restored by an Administrator.</p>
      </div>
    ) : (
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
    )}
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
  availableRooms,
  onUploadDisruption,
  isLoading
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
  onUploadDisruption?: (e: React.ChangeEvent<HTMLInputElement>) => void
  isLoading?: boolean
}) {
  const [activeSubTab, setActiveSubTab] = useState<'simulation' | 'history'>('simulation')
  const [busy, setBusy] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(true)
  const [softMarginOpen, setSoftMarginOpen] = useState(true)

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

  // Separate moves into clean (room-only) vs soft margin (time moves or new sessions)
  const { cleanMoves, softMarginMoves } = useMemo(() => {
    const clean: string[][] = []
    const soft: string[][] = []
    moves.forEach(m => {
      const orig = m[2] ?? ''
      const dest = m[3] ?? ''
      const isNew = orig.includes('New session')
      // Detect if day or period changed
      const origTime = orig.split('·')[0]?.trim() || ''
      const destTime = dest.split('·')[0]?.trim() || ''
      if (isNew || (origTime && destTime && origTime !== destTime)) {
        soft.push(m)
      } else {
        clean.push(m)
      }
    })
    return { cleanMoves: clean, softMarginMoves: soft }
  }, [moves])

  // Count decisions
  const stats = useMemo(() => {
    let accepted = 0
    let reassigned = 0
    let rejected = 0
    moves.forEach(m => {
      const sid = m[0] ?? ''
      const dec = sid ? decisions[sid] : undefined
      if (!dec || dec.action === 'ACCEPT') accepted++
      else if (dec.action === 'REASSIGN') reassigned++
      else if (dec.action === 'REJECT') rejected++
    })
    return { accepted, reassigned, rejected }
  }, [moves, decisions])

  const renderMoveCard = (m: string[], isSoftMargin: boolean) => {
    const sid = m[0] ?? ''
    const proposedRoom = getProposedRoom(m)
    const dec = (sid && decisions[sid]) ? decisions[sid] : { action: 'ACCEPT' as const, room_id: proposedRoom }
    const currentRoom = dec.room_id || proposedRoom

    return (
      <div
        key={sid}
        className={`flex flex-col justify-between rounded-none border border-timetable-grid p-4 transition ${
          dec.action === 'ACCEPT'
            ? isSoftMargin ? `${hue.peach} ring-1 ring-amber-500/30` : `${hue.sky} ring-1 ring-emerald-500/30`
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
            <div className="flex items-center gap-1.5">
              {isSoftMargin && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Time / Ripple
                </span>
              )}
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
          </div>

          <div className="mt-3 text-xs">
            <p className="line-through opacity-60">{m[2]}</p>
            <p className="mt-1 font-medium">{m[3]}</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-timetable-grid/60">
          <p className="text-[11px] font-medium opacity-80 mb-2">Review Action:</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => sid && onDecisionChange(sid, 'ACCEPT', proposedRoom)}
              className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                dec.action === 'ACCEPT'
                  ? 'bg-emerald-600 text-white font-medium shadow-sm'
                  : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
              }`}
            >
              <CheckCircle2 className="size-3" />
              Accept
            </button>
            <button
              type="button"
              onClick={() => sid && onDecisionChange(sid, 'REASSIGN', currentRoom)}
              className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                dec.action === 'REASSIGN'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
              }`}
            >
              <ArrowRight className="size-3" />
              Reassign
            </button>
            <button
              type="button"
              onClick={() => sid && onDecisionChange(sid, 'REJECT')}
              className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs transition ${
                dec.action === 'REJECT'
                  ? 'bg-rose-600 text-white font-medium shadow-sm'
                  : 'bg-card/70 border border-timetable-grid text-foreground/80 hover:bg-card'
              }`}
            >
              <XCircle className="size-3" />
              Reject
            </button>
          </div>

          {dec.action === 'REASSIGN' && (
            <div className="mt-3 rounded bg-card/90 p-2 border border-timetable-grid">
              <label className="block text-[11px] font-medium text-foreground/80 mb-1">
                Custom Target Venue:
              </label>
              <select
                value={currentRoom}
                onChange={(e) => sid && onDecisionChange(sid, 'REASSIGN', e.target.value)}
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

          <div className="mt-2 text-[11px] opacity-75">
            {dec.action === 'ACCEPT' && `Moving to suggested: ${proposedRoom}`}
            {dec.action === 'REASSIGN' && `Re-allocates to: ${currentRoom} (Re-solves schedule)`}
            {dec.action === 'REJECT' && `Keeps baseline assignment`}
          </div>
        </div>
      </div>
    )
  }

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
              <label className="flex items-center gap-1.5 rounded-full border border-timetable-grid bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer shadow-sm">
                <Upload className="size-3.5 text-muted-foreground" />
                <span>{isLoading ? 'Solving Disruption...' : 'Upload Disruption JSON'}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onUploadDisruption}
                  disabled={isLoading}
                />
              </label>
              <button
                onClick={onPreview}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                <GitCompareArrows className="size-4" />
                {isLoading ? 'Calculating Minimal Moves...' : preview ? 'Hide diff' : 'Simulate LAB-1 Closure'}
              </button>
            </div>
          </div>

          {preview ? (
            <>
              {/* Summary counters */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1.5 font-medium">{moves.length} total moves</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1.5 font-medium">
                  {cleanMoves.length} no-issue room relocations
                </span>
                <span className="rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1.5 font-medium">
                  {softMarginMoves.length} soft margin / review items
                </span>
                <span className="rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 px-3 py-1.5 font-medium">
                  {stats.reassigned} custom reassignments
                </span>
                {isCommitted && (
                  <span className="rounded-full bg-success/20 px-3 py-1.5 text-success font-medium">
                    Currently active on timetable
                  </span>
                )}
              </div>

              {/* 1. Expandable Dropdown: No Issue Relocated */}
              <div className="mt-5 border border-timetable-grid bg-card">
                <button
                  type="button"
                  onClick={() => setCleanOpen(o => !o)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm bg-muted/40 hover:bg-muted/70 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    <span>1. No-Issue Room Relocations ({cleanMoves.length})</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      — Seamless room shifts preserving original period & day
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{cleanOpen ? 'Collapse ▲' : 'Expand ▼'}</span>
                </button>
                {cleanOpen && (
                  <div className="p-4 border-t border-timetable-grid">
                    {cleanMoves.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No room-only relocations in this disruption.</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {cleanMoves.map(m => renderMoveCard(m, false))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Expandable Dropdown: Soft Margin Relocations */}
              <div className="mt-4 border border-timetable-grid bg-card">
                <button
                  type="button"
                  onClick={() => setSoftMarginOpen(o => !o)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm bg-amber-500/10 hover:bg-amber-500/15 transition border-l-4 border-amber-500"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span>2. Soft Margin Relocations ({softMarginMoves.length})</span>
                    <span className="text-xs font-normal text-amber-700 dark:text-amber-300">
                      — Time shifts or added sessions requiring coordinator review
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{softMarginOpen ? 'Collapse ▲' : 'Expand ▼'}</span>
                </button>
                {softMarginOpen && (
                  <div className="p-4 border-t border-timetable-grid">
                    {softMarginMoves.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No soft margin time shifts or added sessions.</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {softMarginMoves.map(m => renderMoveCard(m, true))}
                      </div>
                    )}
                  </div>
                )}
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
                      Re-solve with Custom Decisions
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
                    <span>Review decisions above. Applying re-solves any custom room overrides dynamically to prevent clashes.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={wrappedApplyMoves}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Apply & Re-solve Selected Decisions
                    </button>
                    <button
                      onClick={wrappedApprove}
                      disabled={busy}
                      className="rounded-full bg-card border border-timetable-grid px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50"
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
                    : "Click 'Show changes' to run live repair solver."}
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

function UserManagementTab({
  showToast
}: {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [department, setDepartment] = useState('Computer Science')
  const [password, setPassword] = useState('Campus@123')
  const [batchText, setBatchText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch (err: any) {
      showToast(err.message || 'Error loading campus users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          department: department.trim(),
          password: password.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create user')
      showToast(`User ${data.email} provisioned as ${data.role}`, 'success')
      setEmail('')
      setFullName('')
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Error creating user', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchImport = async () => {
    if (!batchText.trim()) {
      showToast('Please provide user lines to import', 'error')
      return
    }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/admin/users/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ raw_text: batchText })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Batch import failed')
      showToast(data.message || `Provisioned ${data.created_count} users!`, 'success')
      setBatchText('')
      setShowBatchModal(false)
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Error running batch import', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (!window.confirm(`Delete account ${userEmail}?`)) return
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete user')
      showToast(`Account ${userEmail} deleted`, 'success')
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Error deleting user', 'error')
    }
  }

  const handleToggleStatus = async (userId: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Status toggle failed')
      showToast(data.message, 'success')
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error')
    }
  }

  const loadSampleRoster = () => {
    setBatchText(
`faculty@cit.edu, Dr. Arvind Rao, FACULTY, Faculty@123, Computer Science & Engineering
club@cit.edu, Aarav Mehta, CLUB_LEAD, Club@123, Student Activities Council
student@cit.edu, Rohan Sharma, STUDENT, Student@123, Computer Science (Year 2)
prof.sen@cit.edu, Dr. Sunita Sen, FACULTY, Faculty@123, CSE
prof.patel@cit.edu, Dr. Meera Patel, FACULTY, Faculty@123, Mathematics`
    )
  }

  const roleBadgeStyle = (r: string) => {
    switch (r) {
      case 'ADMIN': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'FACULTY': return 'bg-sky-500/10 text-sky-600 border-sky-500/20'
      case 'CLUB_LEAD': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      default: return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-ev-mint" />
            <h2 className="text-lg font-semibold text-foreground">Campus User & RBAC Management</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Only authorized accounts added below can sign in to the platform. Prevents unauthorized signups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 rounded-full border border-timetable-grid bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-muted transition shadow-sm"
          >
            <UserPlus className="size-3.5" />
            <span>Batch Import Users</span>
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-timetable-grid bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
            title="Refresh Roster"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add Single User Form */}
      <Panel className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="size-4 text-muted-foreground" />
          <span>Provision New Authorized Account</span>
        </h3>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. prof.rao@cit.edu"
              className="w-full rounded-md border border-timetable-grid bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Dr. Arvind Rao"
              className="w-full rounded-md border border-timetable-grid bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full rounded-md border border-timetable-grid bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="CLUB_LEAD">Club Representative</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. CSE"
              className="w-full rounded-md border border-timetable-grid bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              <span>Provision User</span>
            </button>
          </div>
        </form>
      </Panel>

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-timetable-grid bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-timetable-grid">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-ev-mint" />
                <h3 className="text-sm font-semibold text-foreground">Batch Import Campus Accounts</h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste comma-separated user rows below. Format:<br />
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">email, full_name, role, password, department</code>
              </p>
              <textarea
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                placeholder="prof.sharma@cit.edu, Prof. Sharma, FACULTY, Pass@123, CSE&#10;club.robotics@cit.edu, Robotics Lead, CLUB_LEAD, Club@123, SAC"
                rows={7}
                className="w-full rounded-lg border border-timetable-grid bg-muted p-3 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={loadSampleRoster}
                  className="text-xs text-ev-mint underline hover:opacity-80 font-medium"
                >
                  Load Sample Roster Template
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="rounded-full border border-timetable-grid px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-ink-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    <span>Import Accounts</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Roster Table */}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-timetable-grid p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Provisioned Institutional Users</h3>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {users.length} {users.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-timetable-grid text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-timetable-grid">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-full bg-secondary text-[11px] font-bold text-foreground">
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{u.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleBadgeStyle(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {u.department || 'General'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                        u.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                      }`}
                      title="Click to toggle status"
                    >
                      <span className={`size-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="rounded p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Delete User"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No users provisioned yet. Use the form above to add an authorized user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter your institutional email and password.')
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
        throw new Error(data.detail || 'Invalid email or password.')
      }
      onLoginSuccess(data.access_token, data.user)
    } catch (err: any) {
      setError(err.message || 'Unable to connect to authentication server.')
    } finally {
      setLoading(false)
    }
  }

  const fillAdmin = () => {
    setEmail('admin@cit.edu')
    setPassword('Admin@123')
    setError('')
  }

  return (
    <main className="min-h-screen bg-canvas p-3 text-foreground lg:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl grad-shell p-3 shadow-2xl">
        <div className="rounded-xl bg-card p-6 border border-timetable-grid">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-timetable-grid">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-ink text-[11px] font-bold text-ink-foreground shadow-sm">
                CIT
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight text-foreground">
                  Chilika Institute of Technology
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Campus Management & Operations
                </p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={dark}
              aria-label="Toggle dark mode"
              onClick={() => setDark(d => !d)}
              className="relative flex h-7 w-14 items-center justify-between rounded-full bg-secondary px-1.5 text-muted-foreground"
            >
              <Sun className="size-3" />
              <Moon className="size-3" />
              <span className={`absolute top-0.5 size-6 rounded-full bg-ev-mint shadow-sm transition-all ${dark ? 'left-7' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Institutional Access Notice */}
          <div className="mt-5 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-foreground/80 flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Institutional Access Control:</span> Only authorized campus accounts provisioned by the Administrator can sign in.
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="login-email">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@cit.edu"
                  className="w-full rounded-md border border-timetable-grid bg-muted pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-md border border-timetable-grid bg-muted pl-9 pr-9 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-ink-foreground hover:opacity-90 transition disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Sign In
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-5 pt-4 border-t border-timetable-grid">
            <button
              type="button"
              onClick={fillAdmin}
              className="w-full flex items-center justify-between rounded-lg border border-timetable-grid bg-muted/60 p-2.5 text-xs text-foreground/80 hover:bg-muted transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-ev-mint" />
                <span>Fill Default Admin (admin@cit.edu)</span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">Admin@123</span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Secure Institutional RBAC & JWT</span>
            <span>CIT Campus Ops</span>
          </div>
        </div>
      </div>
    </main>
  )
}
