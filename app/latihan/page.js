'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

const SUBMATERI = [
  { code: 'PU', name: 'Penalaran Umum', color: 'blue' },
  { code: 'PPU', name: 'Pengetahuan & Pemahaman Umum', color: 'green' },
  { code: 'PBM', name: 'Pemahaman Bacaan & Menulis', color: 'yellow' },
  { code: 'PK', name: 'Pengetahuan Kuantitatif', color: 'red' },
  { code: 'LBI', name: 'Literasi Bahasa Indonesia', color: 'orange' },
  { code: 'LBE', name: 'Literasi Bahasa Inggris', color: 'purple' },
  { code: 'PM', name: 'Penalaran Matematika', color: 'pink' }
]

export default function Latihan() {
  const { user } = useAuth()
  const router = useRouter()

  const [stage, setStage] = useState(1) // 1: pilih submateri, 2: pilih paket, 3: latihan
  const [selectedSubmateri, setSelectedSubmateri] = useState(null)
  const [paketOptions, setPaketOptions] = useState([])
  const [selectedPaket, setSelectedPaket] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkPretest()
  }, [user, router])

  async function checkPretest() {
    const { data } = await supabase
      .from('student_profiles')
      .select('pretest_completed')
      .eq('user_id', user.id)
      .single()

    if (!data || !data.pretest_completed) {
      alert('Kamu harus menyelesaikan Initial Test terlebih dahulu!')
      router.push('/pretest')
    }
  }

  async function selectSubmateri(code) {
    setSelectedSubmateri(code)
    setLoading(true)

    // Get available paket for this submateri
    const { data, error } = await supabase
      .from('questions')
      .select('paket_number')
      .eq('submateri', code)
      .eq('is_pretest', false)

    if (error) {
      console.error('Error fetching paket:', error)
      setLoading(false)
      return
    }

    // Count soal per paket
    const paketCounts = {}
    data.forEach(q => {
      const num = q.paket_number
      paketCounts[num] = (paketCounts[num] || 0) + 1
    })

    // Convert to array and sort
    const paketList = Object.keys(paketCounts)
      .map(num => ({
        number: parseInt(num),
        count: paketCounts[num]
      }))
      .sort((a, b) => a.number - b.number)

    setPaketOptions(paketList)
    setStage(2)
    setLoading(false)
  }

  async function startPaket(paketNum) {
    setLoading(true)

    // Fetch questions from this paket
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('submateri', selectedSubmateri)
      .eq('paket_number', paketNum)
      .eq('is_pretest', false)
      .order('id')

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
        submateri: selectedSubmateri,
        duration_minutes: 30,
        start_time: new Date().toISOString(),
        paket_number: paketNum
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
    setSelectedPaket(paketNum)
    setIsActive(true)
    setStartTime(Date.now())
    setStage(3)
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
    if (!autoSubmit && !confirm('Yakin ingin submit jawaban?')) return

    if (autoSubmit) {
      alert('Waktu habis! Jawaban akan otomatis terkirim.')
    }

    setIsActive(false)
    setLoading(true)

    // Update session
    await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        is_completed: true,
        auto_submitted: autoSubmit
      })
      .eq('id', sessionId)

    // Insert answers
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

    setLoading(false)
    router.push(`/review/${sessionId}`)
  }

  if (!user) return null

  // ========== STAGE 1: Pilih Submateri ==========
  if (stage === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">📝 Latihan Soal</h1>
            <p className="text-gray-600 mb-8">Pilih submateri untuk memulai latihan</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUBMATERI.map(function(sub) {
                return (
                  <button
                    key={sub.code}
                    onClick={function() { selectSubmateri(sub.code) }}
                    className="bg-white p-6 rounded-xl shadow hover:shadow-lg border-2 border-gray-100 hover:border-blue-300 transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        {sub.code}
                      </span>
                      <ChevronRight size={24} className="text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-800">{sub.name}</p>
                    <p className="text-sm text-gray-500 mt-2">Latihan soal per paket</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 2: Pilih Paket ==========
  if (stage === 2) {
    const submateriData = SUBMATERI.find(function(s) { return s.code === selectedSubmateri })

    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={function() { setStage(1) }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
              <ChevronLeft size={20} />
              Kembali ke pilih submateri
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-lg font-bold">
                  {selectedSubmateri}
                </span>
                <div>
                  <h1 className="text-2xl font-bold">{submateriData?.name}</h1>
                  <p className="text-gray-500">Pilih paket untuk memulai latihan</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Memuat paket...</p>
                </div>
              ) : paketOptions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada soal untuk submateri ini.</p>
                  <p className="text-sm text-gray-400 mt-2">Silakan tambahkan soal terlebih dahulu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paketOptions.map(function(paket) {
                    return (
                      <button
                        key={paket.number}
                        onClick={function() { startPaket(paket.number) }}
                        disabled={loading}
                        className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold text-blue-600">
                            📦 Paket {paket.number}
                          </h3>
                          <ChevronRight size={28} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600">
                          {paket.count} soal • ~30 menit
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-blue-800 text-sm">
                💡 <strong>Tips:</strong> Setiap paket berisi {paketOptions[0]?.count || '~50'} soal dengan durasi 30 menit. Kerjakan dengan fokus!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 3: Latihan Soal ==========
  if (stage === 3) {
    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length

    return (
      <div>
        <Navbar />
        <Timer
          durationMinutes={30}
          onTimeUp={function() { submitAnswers(true) }}
          isActive={isActive}
        />

        <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
          <div className="max-w-4xl mx-auto">

            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {selectedSubmateri} — Paket {selectedPaket} — Soal {currentIndex + 1}/{questions.length}
                </span>
                <span className="text-sm text-gray-600">
                  Terjawab: {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
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
                      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300')}
                    >
                      <span className="font-bold mr-3">{opt}.</span>
                      {currentQuestion?.[`option_${opt.toLowerCase()}`]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={function() { setCurrentIndex(Math.max(0, currentIndex - 1)) }}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {loading ? 'Menyimpan...' : 'Submit'}
                </button>
              ) : (
                <button
                  onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Selanjutnya
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Question Navigator */}
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
                      className={'aspect-square rounded-lg font-bold text-sm transition-all ' + (isCurrent ? 'bg-blue-600 text-white' : isAnswered ? 'bg-green-100 text-green-800 border-2 border-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
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

  return null
}