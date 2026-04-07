'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'
import { ChevronLeft, ChevronRight, Send, Trophy, Lock } from 'lucide-react'

export default function FinalTryout() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [eligible, setEligible] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkEligibility()
  }, [user, router])

  async function checkEligibility() {
    setChecking(true)

    // Check if already completed
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('final_tryout_completed')
      .eq('user_id', user.id)
      .single()

    if (profile?.final_tryout_completed) {
      router.push('/rapor')
      return
    }

    // Check eligibility
    const { data, error } = await supabase
      .rpc('is_eligible_for_final_tryout', { p_user_id: user.id })

    if (error) {
      console.error('Error checking eligibility:', error)
      setEligible(false)
    } else {
      setEligible(data || false)
    }

    setChecking(false)
  }

  async function startFinalTryout() {
    setLoading(true)
    
    // Ambil 60 soal terbaik (mix dari semua batch)
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_pretest', false)
      .order('id')
      .limit(60)

    if (error || !questionsData || questionsData.length === 0) {
      alert('Error memuat soal: ' + (error?.message || 'Soal tidak ditemukan'))
      setLoading(false)
      return
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_type: 'latihan',
        submateri: 'FINAL_TRYOUT',
        duration_minutes: 180,
        start_time: new Date().toISOString()
      })
      .select()
      .single()

    if (sessionError) {
      alert('Error creating session: ' + sessionError.message)
      setLoading(false)
      return
    }

    setQuestions(questionsData)
    setSessionId(session.id)
    setIsActive(true)
    setStartTime(Date.now())
    setHasStarted(true)
    setLoading(false)
  }

  function handleAnswer(questionId, answer) {
    setAnswers({
      ...answers,
      [questionId]: {
        answer,
        timeTaken: Math.floor((Date.now() - startTime) / 1000)
      }
    })
  }

  async function submitAnswers(autoSubmit = false) {
    if (!autoSubmit && !confirm('Yakin ingin submit Final Try Out? Ini adalah tes akhir kamu!')) return

    if (autoSubmit) {
      alert('Waktu habis! Jawaban akan otomatis terkirim.')
    }

    setIsActive(false)
    setLoading(true)

    await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        is_completed: true,
        auto_submitted: autoSubmit
      })
      .eq('id', sessionId)

    const answersToInsert = questions.map(function(q) {
      return {
        session_id: sessionId,
        question_id: q.id,
        user_answer: answers[q.id]?.answer || null,
        is_correct: answers[q.id]?.answer === q.correct_answer,
        time_taken_seconds: answers[q.id]?.timeTaken || 0
      }
    })

    await supabase.from('user_answers').insert(answersToInsert)

    // Calculate final score
    const correctCount = answersToInsert.filter(function(a) { return a.is_correct }).length
    const totalQuestions = questions.length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)

    // Update student profile
    await supabase
      .from('student_profiles')
      .update({
        final_tryout_completed: true,
        final_tryout_score: scorePercentage,
        final_tryout_date: new Date().toISOString()
      })
      .eq('user_id', user.id)

    setLoading(false)
    router.push('/rapor')
  }

  if (!user) return null

  if (checking) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-600"></div>
        </div>
      </div>
    )
  }

  if (!eligible && !hasStarted) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <Lock size={64} className="mx-auto mb-6 text-gray-400" />
              <h1 className="text-3xl font-bold mb-4">Final Try Out Terkunci</h1>
              <p className="text-gray-600 mb-6">
                Kamu harus menyelesaikan semua rehabilitasi dengan skor ≥70% terlebih dahulu.
              </p>
              <button
                onClick={function() { router.push('/growup') }}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
              >
                Kembali ke Rehabilitasi
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hasStarted) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-linear-to-br from-yellow-50 to-orange-50 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-12">
              <div className="text-center mb-8">
                <Trophy size={80} className="mx-auto mb-4 text-yellow-500" />
                <h1 className="text-4xl font-bold mb-2 text-yellow-600">Final Try Out</h1>
                <p className="text-gray-600 text-lg">Post-test untuk mengukur progresmu!</p>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-lg mb-4">🏆 Informasi Final Try Out:</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="font-semibold">Durasi: 180 menit (3 jam)</p>
                      <p className="text-sm text-gray-500">Timer berjalan otomatis setelah mulai</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">📝</span>
                    <div>
                      <p className="font-semibold">60 Soal Komprehensif</p>
                      <p className="text-sm text-gray-500">Semua submateri UTBK</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="font-semibold">Perbandingan dengan Pretest</p>
                      <p className="text-sm text-gray-500">Lihat seberapa jauh kamu berkembang</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🎯</span>
                    <div>
                      <p className="font-semibold">Prediksi Kelulusan</p>
                      <p className="text-sm text-gray-500">Bandingkan skor dengan passing grade jurusanmu</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-8">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Penting: Final Try Out hanya bisa dikerjakan SEKALI. Pastikan kamu siap dan koneksi internet stabil!
                </p>
              </div>

              <button
                onClick={startFinalTryout}
                disabled={loading}
                className="w-full bg-linear-to-r from-yellow-500 to-orange-500 text-white py-5 rounded-xl text-xl font-bold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 shadow-lg transition-all"
              >
                {loading ? 'Memuat soal...' : '🏆 Mulai Final Try Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz screen
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <div>
      <Navbar />
      <Timer
        durationMinutes={180}
        onTimeUp={function() { submitAnswers(true) }}
        isActive={isActive}
      />

      <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="bg-white rounded-lg p-4 mb-6 shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                🏆 Final Try Out — Soal {currentIndex + 1}/{questions.length}
              </span>
              <span className="text-sm text-gray-600">
                Terjawab: {answeredCount}/{questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {currentQuestion?.submateri} — Final Try Out
              </span>
            </div>
            <h2 className="text-xl font-medium mb-6 leading-relaxed">
              {currentQuestion?.question_text}
            </h2>
            <div className="space-y-3">
              {['A', 'B', 'C', 'D', 'E'].map(function(opt) {
                const isSelected = answers[currentQuestion?.id]?.answer === opt
                return (
                  <button
                    key={opt}
                    onClick={function() { handleAnswer(currentQuestion.id, opt) }}
                    className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (isSelected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300')}
                  >
                    <span className="font-bold mr-3">{opt}.</span>
                    {currentQuestion?.[`option_${opt.toLowerCase()}`]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button
              onClick={function() { setCurrentIndex(Math.max(0, currentIndex - 1)) }}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              Sebelumnya
            </button>
            {currentIndex === questions.length - 1 ? (
              <button
                onClick={function() { submitAnswers(false) }}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Send size={20} />
                {loading ? 'Menyimpan...' : 'Submit Final Try Out'}
              </button>
            ) : (
              <button
                onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Selanjutnya
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="font-bold mb-4">Navigasi Soal</h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map(function(q, idx) {
                const isAnswered = answers[q.id]
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={function() { setCurrentIndex(idx) }}
                    className={'aspect-square rounded-lg font-bold text-sm transition-all ' + (isCurrent ? 'bg-yellow-600 text-white' : isAnswered ? 'bg-green-100 text-green-800 border-2 border-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}