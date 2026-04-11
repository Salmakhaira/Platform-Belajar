'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

function getLevel(score) {
  if (score >= 81) return { level: 'smart', label: 'Smart', emoji: '⭐', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-300', desc: 'Luar biasa! Kemampuanmu sudah sangat baik. Fokus pada pendalaman materi sulit.' }
  if (score >= 61) return { level: 'high', label: 'High', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50 border-green-300', desc: 'Bagus! Kemampuanmu di atas rata-rata. Tingkatkan konsistensi latihan.' }
  if (score >= 41) return { level: 'medium', label: 'Medium', emoji: '🟡', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-300', desc: 'Cukup baik! Masih ada ruang untuk berkembang. Fokus pada materi yang lemah.' }
  return { level: 'low', label: 'Low', emoji: '🔴', color: 'text-red-600', bg: 'bg-red-50 border-red-300', desc: 'Jangan khawatir! Dengan latihan konsisten, kemampuanmu pasti meningkat pesat.' }
}

export default function Pretest() {
  const { user } = useAuth()
  const router = useRouter()

  const [phase, setPhase] = useState('intro')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(50 * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkAlreadyDone()
  }, [user])

  useEffect(function() {
    if (!timerActive) return
    if (timeLeft <= 0) {
      handleSubmit(true)
      return
    }
    const timer = setTimeout(function() {
      setTimeLeft(timeLeft - 1)
    }, 1000)
    return function() { clearTimeout(timer) }
  }, [timerActive, timeLeft])

  async function checkAlreadyDone() {
    const { data } = await supabase
      .from('student_profiles')
      .select('pretest_completed')
      .eq('user_id', user.id)
      .single()

    if (data && data.pretest_completed) {
      router.push('/')
    }
  }

  async function startPretest() {
    setLoading(true)

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_pretest', true)

    if (error || !data || data.length === 0) {
      alert('Error memuat soal pretest: ' + (error?.message || 'Soal tidak ditemukan'))
      setLoading(false)
      return
    }

    // CRITICAL FIX: Sort questions in correct order to match grid header
    const sortOrder = ['PU', 'PPU', 'PBM', 'PK', 'LBI', 'LBE', 'PM']
    const sortedQuestions = data.sort(function(a, b) {
      const indexA = sortOrder.indexOf(a.submateri)
      const indexB = sortOrder.indexOf(b.submateri)
      return indexA - indexB
    })

    setQuestions(sortedQuestions)
    setPhase('test')
    setTimerActive(true)
    setLoading(false)
  }

  function handleAnswer(questionId, answer) {
    setAnswers({ ...answers, [questionId]: answer })
  }

  async function handleSubmit(autoSubmit = false) {
    if (!autoSubmit && !confirm('Yakin ingin submit pretest?')) return

    setTimerActive(false)
    setLoading(true)

    const totalQuestions = questions.length
    const correctCount = questions.filter(function(q) {
      return answers[q.id] === q.correct_answer
    }).length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)

    const scoreBySubject = {}
    const pretestScores = {}
    
    questions.forEach(function(q) {
      if (!scoreBySubject[q.submateri]) {
        scoreBySubject[q.submateri] = { total: 0, correct: 0 }
      }
      scoreBySubject[q.submateri].total++
      if (answers[q.id] === q.correct_answer) {
        scoreBySubject[q.submateri].correct++
      }
    })

    Object.keys(scoreBySubject).forEach(sub => {
      const data = scoreBySubject[sub]
      pretestScores[sub] = Math.round((data.correct / data.total) * 100)
    })

    const levelInfo = getLevel(scorePercentage)

    await supabase
      .from('student_profiles')
      .update({
        pretest_completed: true,
        pretest_score: scorePercentage,
        pretest_scores: pretestScores,
        level: levelInfo.level,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    const { data: session } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_type: 'pretest',
        submateri: null,
        duration_minutes: 50,
        start_time: new Date(Date.now() - (50 * 60 - timeLeft) * 1000).toISOString(),
        end_time: new Date().toISOString(),
        is_completed: true,
        auto_submitted: autoSubmit,
        final_score: scorePercentage
      })
      .select()
      .single()

    if (session) {
      const answersToInsert = questions.map(function(q) {
        return {
          session_id: session.id,
          question_id: q.id,
          user_answer: answers[q.id] || null,
          is_correct: answers[q.id] === q.correct_answer,
          time_taken_seconds: 0
        }
      })
      await supabase.from('user_answers').insert(answersToInsert)
    }

    setResult({
      score: scorePercentage,
      correct: correctCount,
      total: totalQuestions,
      levelInfo: levelInfo,
      scoreBySubject: scoreBySubject,
      sessionId: session?.id
    })
    setPhase('result')
    setLoading(false)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }

  function getTimerColor() {
    if (timeLeft > 30 * 60) return 'text-green-600'
    if (timeLeft > 10 * 60) return 'text-yellow-600'
    return 'text-red-600 animate-pulse'
  }

  if (!user) return null

  // ============ PHASE: INTRO ============
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-10 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold mb-2">Initial Test</h1>
          <p className="text-gray-500 mb-8">Tes awal untuk mengetahui level kemampuanmu</p>

          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left space-y-3">
            <h3 className="font-bold text-lg mb-4">📋 Informasi Pretest:</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="font-semibold">Durasi: 50 Menit</p>
                <p className="text-sm text-gray-500">Timer berjalan otomatis setelah mulai</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="font-semibold">40 Soal</p>
                <p className="text-sm text-gray-500">Mix dari semua submateri UTBK</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-semibold">Materi: PU, PPU, PBM, PK, LBI, LBE, PM</p>
                <p className="text-sm text-gray-500">Mencakup semua submateri UTBK</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-semibold">Hasil: Klasifikasi Level</p>
                <p className="text-sm text-gray-500">Low / Medium / High / Smart</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ Perhatian: Pretest hanya bisa dikerjakan sekali. Pastikan koneksi internet stabil dan kamu siap sebelum memulai.
            </p>
          </div>

          <button
            onClick={startPretest}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Memuat soal...' : '🚀 Mulai Pretest Sekarang'}
          </button>
        </div>
      </div>
    )
  }

  // ============ PHASE: TEST ============
  if (phase === 'test') {
    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length
    const isLongText = currentQuestion?.question_text?.length > 500

    return (
      <div className="min-h-screen bg-gray-50">

        <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="font-bold text-lg">🎯 Initial Test</p>
            <p className="text-sm text-gray-500">
              Terjawab: {answeredCount}/{questions.length}
            </p>
          </div>
          <div className={'text-3xl font-bold ' + getTimerColor()}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          <button
            onClick={function() { handleSubmit(false) }}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Submit'}
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6">

          <div className="bg-white rounded-lg p-4 mb-4 shadow">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Soal {currentIndex + 1} dari {questions.length}</span>
              <span className="text-blue-600 font-medium">{currentQuestion?.submateri} - {SUBMATERI_NAMES[currentQuestion?.submateri]}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-4">
            
            <div className="mb-6">
              {isLongText ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-3">
                    <BookOpen size={18} />
                    <span>Reading Passage</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 max-h-[420px] overflow-y-auto">
                    <p className="text-base leading-loose text-gray-800 whitespace-pre-line font-serif">
                      {currentQuestion.question_text}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-medium leading-loose text-gray-800">
                  {currentQuestion?.question_text}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {['A', 'B', 'C', 'D', 'E'].map(function(opt) {
                const isSelected = answers[currentQuestion?.id] === opt
                return (
                  <button
                    key={opt}
                    onClick={function() { handleAnswer(currentQuestion.id, opt) }}
                    className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50')}
                  >
                    <span className={'font-bold mr-3 ' + (isSelected ? 'text-blue-600' : 'text-gray-500')}>
                      {opt}.
                    </span>
                    <span className="leading-relaxed">
                      {currentQuestion?.[`option_${opt.toLowerCase()}`]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button
              onClick={function() { setCurrentIndex(Math.max(0, currentIndex - 1)) }}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              ← Sebelumnya
            </button>
            <span className="text-gray-500 text-sm">{currentIndex + 1} / {questions.length}</span>
            <button
              onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
              disabled={currentIndex === questions.length - 1}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Selanjutnya →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="font-bold mb-4">Navigasi Soal</p>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['PU', 'PPU', 'PBM', 'PK', 'LBI', 'LBE', 'PM'].map(function(sub) {
                return (
                  <div key={sub} className="text-center text-xs font-bold text-gray-500 py-1">
                    {sub}
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {questions.map(function(q, idx) {
                const isAnswered = answers[q.id]
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={function() { setCurrentIndex(idx) }}
                    className={'aspect-square rounded-lg text-xs font-bold transition-all ' + (isCurrent ? 'bg-blue-600 text-white' : isAnswered ? 'bg-green-100 text-green-800 border-2 border-green-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-400 inline-block"></span>
                Terjawab
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-100 inline-block"></span>
                Belum
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
                Sekarang
              </span>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ============ PHASE: RESULT ============
  if (phase === 'result' && result) {
    const { score, correct, total, levelInfo, scoreBySubject, sessionId } = result

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">

          <div className={'rounded-2xl border-2 p-8 mb-6 text-center ' + levelInfo.bg}>
            <div className="text-6xl mb-3">{levelInfo.emoji}</div>
            <h1 className="text-3xl font-bold mb-2">Pretest Selesai!</h1>
            <p className={'text-6xl font-bold mb-2 ' + levelInfo.color}>{score}%</p>
            <p className="text-gray-600 mb-3">{correct} dari {total} soal benar</p>
            <div className="inline-block bg-white rounded-full px-6 py-2 shadow">
              <span className={'text-xl font-bold ' + levelInfo.color}>
                Level: {levelInfo.label} {levelInfo.emoji}
              </span>
            </div>
            <p className="text-gray-600 mt-4 text-sm">{levelInfo.desc}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-5">📊 Skor Per Submateri</h2>
            <div className="space-y-4">
              {Object.entries(scoreBySubject).map(function([sub, data]) {
                const pct = Math.round((data.correct / data.total) * 100)
                const barColor = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                return (
                  <div key={sub}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{sub} - {SUBMATERI_NAMES[sub]}</span>
                      <span className="text-sm font-bold">{data.correct}/{data.total} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={'h-3 rounded-full transition-all ' + barColor}
                        style={{ width: pct + '%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">🗺️ Rekomendasi Belajar</h2>
            {score < 41 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="font-bold text-red-700 mb-2">Level Low — Fokus Materi Dasar</p>
                <p className="text-gray-700 text-sm">Mulai dari modul materi dasar, kerjakan latihan soal per submateri secara bertahap. Jangan terburu-buru.</p>
              </div>
            )}
            {score >= 41 && score < 61 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="font-bold text-blue-700 mb-2">Level Medium — Tingkatkan Latihan</p>
                <p className="text-gray-700 text-sm">Perkuat submateri yang masih di bawah 50%. Kerjakan latihan soal rutin setiap hari minimal 30 soal.</p>
              </div>
            )}
            {score >= 61 && score < 81 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <p className="font-bold text-green-700 mb-2">Level High — Optimalkan Semua Materi</p>
                <p className="text-gray-700 text-sm">Hampir sempurna! Fokus pada submateri yang masih di bawah 70% dan tingkatkan kecepatan mengerjakan soal.</p>
              </div>
            )}
            {score >= 81 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <p className="font-bold text-yellow-700 mb-2">Level Smart — Pertahankan dan Tingkatkan</p>
                <p className="text-gray-700 text-sm">Kemampuan sangat baik! Fokus pada soal-soal sulit dan latihan manajemen waktu untuk hasil optimal.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {sessionId && (
              <button
                onClick={function() { router.push(`/review/${sessionId}`) }}
                className="w-full bg-purple-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-purple-700 transition-all"
              >
                📊 Lihat Review Lengkap
              </button>
            )}
            <button
              onClick={function() { router.push('/') }}
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition-all"
            >
              🚀 Mulai Belajar Sekarang!
            </button>
          </div>

        </div>
      </div>
    )
  }

  return null
}
