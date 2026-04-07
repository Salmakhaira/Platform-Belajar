'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'
import { ChevronLeft, ChevronRight, Send, Sparkles, TrendingUp, Target, Lock, CheckCircle } from 'lucide-react'

const QUESTION_TYPE_NAMES = {
  'silogisme': 'Silogisme',
  'modus_ponens_tollens': 'Modus Ponens & Tollens',
  'analogi_logika': 'Analogi & Logika',
  'fungsi': 'Fungsi Matematika',
  'turunan': 'Turunan',
  'geometri': 'Geometri',
  'aljabar': 'Aljabar',
  'ejaan': 'Ejaan & Penulisan',
  'pleonasme': 'Pleonasme',
  'kata_baku': 'Kata Baku',
  'kalimat_efektif': 'Kalimat Efektif',
  'conditional': 'Conditional Sentences',
  'tenses': 'Tenses',
  'grammar': 'Grammar',
  'diskon_persen': 'Diskon & Persentase',
  'probabilitas': 'Probabilitas',
  'statistika': 'Statistika',
  'aritmatika': 'Aritmatika',
  'sejarah': 'Sejarah Indonesia',
  'ekonomi': 'Ekonomi',
  'pengetahuan_umum': 'Pengetahuan Umum',
  'paragraf': 'Struktur Paragraf',
  'majas': 'Majas & Gaya Bahasa',
  'pemahaman_teks': 'Pemahaman Teks'
}

export default function Rehabilitasi() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [stage, setStage] = useState(1) // 1: analysis, 2: select type, 3: drilling
  const [weakTypes, setWeakTypes] = useState([])
  const [rehabProgress, setRehabProgress] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [analyzing, setAnalyzing] = useState(true)

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
      return
    }

    analyzeWeakness()
  }

  async function analyzeWeakness() {
    setAnalyzing(true)

    // Analisis question types yang sering salah
    const { data: wrongAnswers } = await supabase
      .from('user_answers')
      .select(`
        is_correct,
        questions (question_type, submateri)
      `)
      .eq('session_id', supabase.from('sessions').select('id').eq('user_id', user.id))

    // Group by question_type dan hitung accuracy
    const typeStats = {}
    
    const { data: allAnswers } = await supabase
      .from('user_answers')
      .select(`
        is_correct,
        session_id,
        questions (question_type, submateri)
      `)

    if (allAnswers) {
      // Filter hanya jawaban user ini
      const { data: userSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)

      const sessionIds = userSessions?.map(s => s.id) || []
      const userAnswers = allAnswers.filter(a => sessionIds.includes(a.session_id))

      userAnswers.forEach(function(a) {
        const type = a.questions?.question_type
        if (!type) return

        if (!typeStats[type]) {
          typeStats[type] = { total: 0, correct: 0, submateri: a.questions.submateri }
        }
        typeStats[type].total++
        if (a.is_correct) typeStats[type].correct++
      })
    }

    // Filter yang accuracy < 70% dan minimal 3 soal
    const weakList = Object.entries(typeStats)
      .filter(function([type, stats]) {
        const accuracy = (stats.correct / stats.total) * 100
        return stats.total >= 3 && accuracy < 70
      })
      .map(function([type, stats]) {
        return {
          question_type: type,
          total: stats.total,
          correct: stats.correct,
          accuracy: Math.round((stats.correct / stats.total) * 100),
          submateri: stats.submateri
        }
      })
      .sort(function(a, b) { return a.accuracy - b.accuracy })

    setWeakTypes(weakList)

    // Fetch rehab progress
    const { data: progress } = await supabase
      .from('rehab_progress')
      .select('*')
      .eq('user_id', user.id)

    setRehabProgress(progress || [])
    setAnalyzing(false)
    setStage(weakList.length > 0 ? 2 : 1)
  }

  async function startRehab(questionType) {
    setLoading(true)

    // Fetch soal untuk question_type ini
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('question_type', questionType)
      .eq('is_pretest', false)
      .limit(20)

    if (error || !questionsData || questionsData.length === 0) {
      alert('Belum ada soal untuk tipe ini.')
      setLoading(false)
      return
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_type: 'growup',
        submateri: `REHAB_${questionType}`,
        duration_minutes: 45,
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
    setSelectedType(questionType)
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

    // Calculate score
    const correctCount = answersToInsert.filter(function(a) { return a.is_correct }).length
    const totalQuestions = questions.length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)

    // Update rehab progress
    await supabase
      .from('rehab_progress')
      .upsert({
        user_id: user.id,
        question_type: selectedType,
        is_completed: true,
        score: scorePercentage,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        completed_at: new Date().toISOString()
      })

    setLoading(false)
    router.push(`/review/${sessionId}`)
  }

  if (!user) return null

  if (analyzing) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="animate-spin mx-auto mb-4 text-green-600" size={48} />
            <p className="text-gray-600 text-lg">Menganalisis pola kesalahan...</p>
          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 1: No Weak Types ==========
  if (stage === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold mb-4">Luar Biasa!</h1>
              <p className="text-gray-600 mb-6">
                Kamu belum memiliki tipe soal yang perlu direhabilitasi atau belum cukup data latihan.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Kerjakan minimal 3 soal per tipe untuk mendapatkan analisis yang akurat.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={function() { router.push('/latihan') }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                >
                  Mulai Latihan
                </button>
                <button
                  onClick={function() { router.push('/tryout') }}
                  className="px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
                >
                  Tryout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 2: Select Question Type ==========
  if (stage === 2) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold mb-2">Rehabilitasi</h1>
              <p className="text-gray-600 text-lg">Drilling fokus pada tipe soal yang perlu ditingkatkan</p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg mb-8">
              <div className="flex items-start gap-4">
                <Target className="text-green-600 mt-1" size={32} />
                <div>
                  <h3 className="font-bold text-lg mb-2">Sistem Rehabilitasi</h3>
                  <p className="text-gray-700 mb-3">
                    Ditemukan <strong>{weakTypes.length} tipe soal</strong> yang perlu fokus lebih. 
                    Selesaikan semuanya dengan skor ≥70% untuk unlock Final Try Out!
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>⏱️ Durasi: 45 menit per tipe</li>
                    <li>📝 ~20 soal per tipe</li>
                    <li>🎯 Target: Skor ≥70% untuk setiap tipe</li>
                    <li>📊 Progress tersimpan otomatis</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {weakTypes.map(function(type) {
                const progress = rehabProgress.find(function(p) { return p.question_type === type.question_type })
                const isCompleted = progress?.is_completed && progress?.score >= 70
                
                return (
                  <div
                    key={type.question_type}
                    className={'bg-white rounded-xl shadow p-6 border-l-4 ' + (isCompleted ? 'border-green-500' : 'border-red-400')}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isCompleted ? (
                            <CheckCircle size={24} className="text-green-600" />
                          ) : (
                            <Target size={24} className="text-red-600" />
                          )}
                          <h3 className="font-bold text-lg">
                            {QUESTION_TYPE_NAMES[type.question_type] || type.question_type}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{type.submateri}</p>
                        
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-600 mb-1">Performa Saat Ini:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-red-600">{type.accuracy}%</span>
                            <span className="text-sm text-gray-500">{type.correct}/{type.total} benar</span>
                          </div>
                        </div>

                        {progress && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600 mb-1">Hasil Rehabilitasi:</p>
                            <div className="flex items-center justify-between">
                              <span className={'text-2xl font-bold ' + (progress.score >= 70 ? 'text-green-600' : 'text-yellow-600')}>
                                {progress.score}%
                              </span>
                              <span className="text-sm text-gray-500">
                                {progress.correct_answers}/{progress.total_questions} benar
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={function() { startRehab(type.question_type) }}
                      disabled={loading}
                      className={'w-full py-3 rounded-xl font-medium transition-all ' + (isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-600 text-white hover:bg-red-700')}
                    >
                      {isCompleted ? '✅ Ulangi Drilling' : '🎯 Mulai Drilling'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Check if all completed */}
            {rehabProgress.length > 0 && rehabProgress.every(function(p) { return p.score >= 70 }) && (
              <div className="mt-8 bg-linear-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-2xl p-8 text-white text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold mb-3">Final Try Out Unlocked!</h2>
                <p className="mb-6 text-lg">
                  Selamat! Kamu sudah menyelesaikan semua rehabilitasi dengan skor ≥70%.
                  Sekarang saatnya Final Try Out!
                </p>
                <button
                  onClick={function() { router.push('/final-tryout') }}
                  className="bg-white text-orange-600 px-8 py-4 rounded-xl text-xl font-bold hover:bg-gray-100 transition-all shadow-lg"
                >
                  🎯 Mulai Final Try Out
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 3: Drilling ==========
  if (stage === 3) {
    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length

    return (
      <div>
        <Navbar />
        <Timer
          durationMinutes={45}
          onTimeUp={function() { submitAnswers(true) }}
          isActive={isActive}
        />

        <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
          <div className="max-w-4xl mx-auto">

            <div className="bg-white rounded-lg p-4 mb-6 shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Drilling: {QUESTION_TYPE_NAMES[selectedType]} — Soal {currentIndex + 1}/{questions.length}
                </span>
                <span className="text-sm text-gray-600">
                  Terjawab: {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="mb-6">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currentQuestion?.submateri} — {QUESTION_TYPE_NAMES[selectedType]}
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
                      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300')}
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
                  {loading ? 'Menyimpan...' : 'Submit'}
                </button>
              ) : (
                <button
                  onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                      className={'aspect-square rounded-lg font-bold text-sm transition-all ' + (isCurrent ? 'bg-green-600 text-white' : isAnswered ? 'bg-green-100 text-green-800 border-2 border-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
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