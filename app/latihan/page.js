'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

const SUBMATERI = [
  { code: 'PU', name: 'Penalaran Umum' },
  { code: 'PPU', name: 'Pengetahuan & Pemahaman Umum' },
  { code: 'PBM', name: 'Pemahaman Bacaan & Menulis' },
  { code: 'PK', name: 'Pengetahuan Kuantitatif' },
  { code: 'LBI', name: 'Literasi Bahasa Indonesia' },
  { code: 'LBE', name: 'Literasi Bahasa Inggris' },
  { code: 'PM', name: 'Penalaran Matematika' }
]

export default function Tryout() {
  const { user } = useAuth()
  const router = useRouter()

  const [stage, setStage] = useState(1) // 1: pilih paket, 2: tryout
  const [tryoutPackages, setTryoutPackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
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
    loadTryoutPackages()
  }, [user, router])

  async function checkPretest() {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('pretest_completed')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking pretest:', error)
      return
    }

    if (!data || !data.pretest_completed) {
      alert('Kamu harus menyelesaikan Initial Test terlebih dahulu!')
      router.push('/pretest')
      return
    }
  }

  async function loadTryoutPackages() {
    setLoading(true)

    const { data, error } = await supabase
      .from('questions')
      .select('tryout_number')
      .eq('is_tryout', true)

    if (error) {
      console.error('Error loading packages:', error)
      setLoading(false)
      return
    }

    // Count questions per package
    const packageCounts = {}
    data.forEach(q => {
      const num = q.tryout_number
      if (num) {
        packageCounts[num] = (packageCounts[num] || 0) + 1
      }
    })

    // Convert to array
    const packages = Object.keys(packageCounts)
      .map(num => ({
        number: parseInt(num),
        count: packageCounts[num]
      }))
      .sort((a, b) => a.number - b.number)

    setTryoutPackages(packages)
    setLoading(false)
  }

  async function startTryout(packageNum) {
    setLoading(true)

    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_tryout', true)
      .eq('tryout_number', packageNum)
      .order('id')

    if (error || !questionsData || questionsData.length === 0) {
      alert('Error memuat soal: ' + (error?.message || 'Soal tidak ditemukan'))
      setLoading(false)
      return
    }

    // Sort by submateri
    const sortOrder = ['PU', 'PPU', 'PBM', 'PK', 'LBI', 'LBE', 'PM']
    const sortedQuestions = questionsData.sort(function(a, b) {
      return sortOrder.indexOf(a.submateri) - sortOrder.indexOf(b.submateri)
    })

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_type: 'tryout',
        submateri: null,
        duration_minutes: 120,
        start_time: new Date().toISOString(),
        tryout_number: packageNum
      })
      .select()
      .single()

    if (sessionError) {
      alert('Error creating session: ' + sessionError.message)
      setLoading(false)
      return
    }

    setQuestions(sortedQuestions)
    setSessionId(session.id)
    setSelectedPackage(packageNum)
    setIsActive(true)
    setStartTime(Date.now())
    setStage(2)
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

    // Calculate score
    const totalQuestions = questions.length
    const correctCount = questions.filter(q => answers[q.id]?.answer === q.correct_answer).length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)

    // Get target passing grade
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('target_passing_grade')
      .eq('user_id', user.id)
      .single()

    const targetGrade = profile?.target_passing_grade || 700

    // Update session
    await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        is_completed: true,
        auto_submitted: autoSubmit,
        final_score: scorePercentage
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

    // Update profile
    await supabase
      .from('student_profiles')
      .update({
        current_score: scorePercentage,
        needs_drilling: scorePercentage < targetGrade
      })
      .eq('user_id', user.id)

    setLoading(false)

    // Redirect based on score
    if (scorePercentage < targetGrade) {
      router.push(`/drilling?session=${sessionId}`)
    } else {
      router.push(`/review/${sessionId}`)
    }
  }

  if (!user) return null

  // ========================================
  // STAGE 1: PILIH PAKET TRYOUT
  // ========================================
  if (stage === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-700 p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-12">
              <div className="text-7xl mb-4">🎯</div>
              <h1 className="text-5xl font-bold text-white mb-4">Tryout UTBK 2026</h1>
              <p className="text-xl text-purple-100">Simulasi ujian lengkap dengan semua submateri</p>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 Detail Tryout:</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">⏱️</span>
                  <div>
                    <p className="font-semibold text-lg">Durasi: 120 menit (2 jam)</p>
                    <p className="text-sm text-gray-500">Auto-submit saat waktu habis</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📝</span>
                  <div>
                    <p className="font-semibold text-lg">Jumlah soal: 60 soal</p>
                    <p className="text-sm text-gray-500">Semua submateri UTBK</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📚</span>
                  <div>
                    <p className="font-semibold text-lg">Materi: Semua submateri (PU, PPU, PBM, PK, LBI, LBE, PM)</p>
                    <p className="text-sm text-gray-500">Simulasi ujian sebenarnya</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚫</span>
                  <div>
                    <p className="font-semibold text-lg">Tidak bisa pause atau keluar setelah mulai</p>
                    <p className="text-sm text-gray-500">Kerjakan sampai selesai</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <p className="font-semibold text-lg">Drilling otomatis jika belum capai passing grade</p>
                    <p className="text-sm text-gray-500">Sistem akan otomatis masuk mode drilling untuk soal yang salah</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Paket Selection */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">🎯 Pilih Paket Tryout</h2>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Memuat paket tryout...</p>
                </div>
              ) : tryoutPackages.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-lg">Belum ada paket tryout tersedia.</p>
                  <p className="text-sm text-gray-400 mt-2">Silakan tambahkan soal tryout di database.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tryoutPackages.map(function(pkg) {
                    return (
                      <button
                        key={pkg.number}
                        onClick={function() { startTryout(pkg.number) }}
                        disabled={loading}
                        className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-50"
                      >
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-3xl font-bold mb-2">TO {pkg.number}</h3>
                        <p className="text-purple-100 text-lg">{pkg.count} soal</p>
                        <p className="text-purple-200 text-sm mt-2">120 menit</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="mt-8 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
              <p className="text-yellow-800 font-medium text-center">
                ⚠️ Pastikan koneksi internet stabil dan siapkan alat tulis. Tryout tidak bisa di-pause setelah dimulai!
              </p>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ========================================
  // STAGE 2: TRYOUT TEST (SIDEBAR LAYOUT)
  // ========================================
  if (stage === 2) {
    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length

    return (
      <div>
        <Navbar />
        <Timer
          durationMinutes={120}
          onTimeUp={function() { submitAnswers(true) }}
          isActive={isActive}
        />

        <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
          <div className="max-w-7xl mx-auto">

            {/* Progress Bar - Full Width */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Tryout {selectedPackage} — Soal {currentIndex + 1}/{questions.length}
                </span>
                <span className="text-sm text-gray-600">
                  Terjawab: {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
                />
              </div>
            </div>

            {/* Main Content: Question (Left) + Navigation Sidebar (Right) */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              
              {/* ========== LEFT SIDE: Question Card ========== */}
              <div className="space-y-6">
                
                {/* Question Card */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <div className="mb-4">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {currentQuestion?.submateri}
                    </span>
                  </div>
                  <h2 className="text-xl font-medium mb-6 leading-relaxed whitespace-pre-line">
                    {currentQuestion?.question_text}
                  </h2>
                  
                  {/* Options */}
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D', 'E'].map(function(opt) {
                      const isSelected = answers[currentQuestion?.id]?.answer === opt
                      return (
                        <button
                          key={opt}
                          onClick={function() { handleAnswer(currentQuestion.id, opt) }}
                          className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300')}
                        >
                          <span className="font-bold mr-3">{opt}.</span>
                          {currentQuestion?.[`option_${opt.toLowerCase()}`]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={function() { setCurrentIndex(Math.max(0, currentIndex - 1)) }}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                  >
                    <ChevronLeft size={20} />
                    Sebelumnya
                  </button>
                  
                  {currentIndex === questions.length - 1 ? (
                    <button
                      onClick={function() { submitAnswers(false) }}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <Send size={20} />
                      {loading ? 'Menyimpan...' : 'Submit Jawaban'}
                    </button>
                  ) : (
                    <button
                      onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Selanjutnya
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>

              </div>

              {/* ========== RIGHT SIDE: Navigation Sidebar (Sticky) ========== */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold mb-4 text-gray-800 text-lg">Navigasi Soal</h3>
                  
                  {/* Question Grid */}
                  <div className="grid grid-cols-5 gap-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {questions.map(function(q, idx) {
                      const isAnswered = answers[q.id]
                      const isCurrent = idx === currentIndex
                      
                      let btnClass = 'aspect-square rounded-lg font-bold text-xs transition-all '
                      
                      if (isCurrent) {
                        btnClass += 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-md'
                      } else if (isAnswered) {
                        btnClass += 'bg-green-100 text-green-800 border-2 border-green-500'
                      } else {
                        btnClass += 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                      
                      return (
                        <button
                          key={q.id}
                          onClick={function() { setCurrentIndex(idx) }}
                          className={btnClass}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-500"></div>
                      <span className="text-gray-600">Terjawab</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-100"></div>
                      <span className="text-gray-600">Belum dijawab</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-600"></div>
                      <span className="text-gray-600">Soal sekarang</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
