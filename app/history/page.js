'use client'
import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const day = date.getDate()
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return day + ' ' + month + ' ' + year + ' • ' + hours + ':' + minutes
}

function formatDuration(start, end) {
  if (!start || !end) return '-'
  const diff = Math.floor((new Date(end) - new Date(start)) / 1000)
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  return mins + ' menit ' + secs + ' detik'
}

function SessionCard(props) {
  const session = props.session
  const router = useRouter()

  const total = session.total_questions || 0
  const correct = session.correct_answers || 0
  const score = total > 0 ? Math.round((correct / total) * 100) : 0

  function getScoreColor() {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getScoreBg() {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  function getTypeBadge() {
    if (session.session_type === 'tryout') return 'bg-purple-100 text-purple-700'
    if (session.session_type === 'growup') return 'bg-green-100 text-green-700'
    return 'bg-blue-100 text-blue-700'
  }

  function getTypeLabel() {
    if (session.session_type === 'tryout') return '🎯 Tryout'
    if (session.session_type === 'growup') return '🚀 Grow Up'
    return '📝 Latihan'
  }

  function getSubmateriLabel() {
    if (!session.submateri) return 'Semua Materi'
    if (session.submateri.includes(',')) return 'Mix Materi'
    return session.submateri + ' - ' + (SUBMATERI_NAMES[session.submateri] || '')
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={'px-3 py-1 rounded-full text-xs font-bold ' + getTypeBadge()}>
              {getTypeLabel()}
            </span>
            {session.auto_submitted ? (
              <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-600">
                ⏰ Auto-submit
              </span>
            ) : null}
          </div>
          <p className="font-semibold text-gray-800 mt-1">{getSubmateriLabel()}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(session.created_at)}</p>
        </div>

        <div className={'rounded-xl px-4 py-3 text-center ' + getScoreBg()}>
          <p className={'text-3xl font-bold ' + getScoreColor()}>{score}%</p>
          <p className="text-xs text-gray-500">{correct}/{total} benar</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>⏱️ {formatDuration(session.start_time, session.end_time)}</span>
          <span>📦 {session.packet || '-'}</span>
        </div>
        <button
          onClick={function() { router.push('/review/' + session.id) }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
        >
          Lihat Review
        </button>
      </div>
    </div>
  )
}

export default function History() {
  const { user } = useAuth()
  const router = useRouter()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    fetchHistory()
  }, [user, router])

  async function fetchHistory() {
    setLoading(true)

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        user_answers (
          id,
          is_correct,
          user_answer
        )
      `)
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
      setLoading(false)
      return
    }

    // Hitung score per session
    const sessionsWithScore = (data || []).map(function(session) {
      const answers = session.user_answers || []
      const total = answers.length
      const correct = answers.filter(function(a) { return a.is_correct }).length
      return {
        ...session,
        total_questions: total,
        correct_answers: correct
      }
    })

    setSessions(sessionsWithScore)
    setLoading(false)
  }

  if (!user) return null

  // Filter sessions
  const filteredSessions = sessions.filter(function(s) {
    if (filter === 'latihan') return s.session_type === 'latihan'
    if (filter === 'tryout') return s.session_type === 'tryout'
    if (filter === 'growup') return s.session_type === 'growup'
    return true
  })

  // Stats
  const totalSesi = sessions.length
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce(function(sum, s) {
        const total = s.total_questions || 0
        const correct = s.correct_answers || 0
        return sum + (total > 0 ? (correct / total) * 100 : 0)
      }, 0) / sessions.length)
    : 0

  const bestScore = sessions.length > 0
    ? Math.max.apply(null, sessions.map(function(s) {
        const total = s.total_questions || 0
        const correct = s.correct_answers || 0
        return total > 0 ? Math.round((correct / total) * 100) : 0
      }))
    : 0

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">📋 History Latihan</h1>
            <p className="text-gray-600">Semua sesi latihan yang pernah kamu kerjakan</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow text-center">
              <p className="text-4xl font-bold text-blue-600">{totalSesi}</p>
              <p className="text-gray-500 text-sm mt-1">Total Sesi</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow text-center">
              <p className="text-4xl font-bold text-yellow-500">{avgScore}%</p>
              <p className="text-gray-500 text-sm mt-1">Rata-rata Skor</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow text-center">
              <p className="text-4xl font-bold text-green-600">{bestScore}%</p>
              <p className="text-gray-500 text-sm mt-1">Skor Terbaik</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={function() { setFilter('all') }}
              className={'px-4 py-2 rounded-lg font-medium transition-all ' + (filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50')}
            >
              Semua ({sessions.length})
            </button>
            <button
              onClick={function() { setFilter('latihan') }}
              className={'px-4 py-2 rounded-lg font-medium transition-all ' + (filter === 'latihan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50')}
            >
              📝 Latihan ({sessions.filter(function(s) { return s.session_type === 'latihan' }).length})
            </button>
            <button
              onClick={function() { setFilter('tryout') }}
              className={'px-4 py-2 rounded-lg font-medium transition-all ' + (filter === 'tryout' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50')}
            >
              🎯 Tryout ({sessions.filter(function(s) { return s.session_type === 'tryout' }).length})
            </button>
            <button
              onClick={function() { setFilter('growup') }}
              className={'px-4 py-2 rounded-lg font-medium transition-all ' + (filter === 'growup' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50')}
            >
              🚀 Grow Up ({sessions.filter(function(s) { return s.session_type === 'growup' }).length})
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Memuat history...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-gray-500 font-medium">Belum ada sesi yang selesai</p>
              <p className="text-gray-400 text-sm mt-2">Mulai latihan untuk melihat history di sini</p>
              <button
                onClick={function() { router.push('/latihan') }}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mulai Latihan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(function(session) {
                return <SessionCard key={session.id} session={session} />
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}