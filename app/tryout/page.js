'use client'
import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

function TryoutContent() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
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

  const startTryout = async () => {
    setLoading(true)
    
    // Ambil soal tryout (is_tryout = true)
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_tryout', true)
      .eq('is_pretest', false)
      .order('id')
      .limit(60)

    if (error) {
      alert('Error loading questions: ' + error.message)
      setLoading(false)
      return
    }

    if (!questionsData || questionsData.length === 0) {
      alert('Belum ada soal untuk tryout.')
      setLoading(false)
      return
    }

    // Dapatkan tryout number berikutnya
    const { data: tryoutNum, error: rpcError } = await supabase
      .rpc('get_next_tryout_number', { p_user_id: user.id })

    if (rpcError) {
      console.error('Error getting tryout number:', rpcError)
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_type: 'tryout',
        submateri: null,
        duration_minutes: 120,
        start_time: new Date().toISOString(),
        tryout_number: tryoutNum || 1
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

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: {
        answer,
        timeTaken: Math.floor((Date.now() - startTime) / 1000)
      }
    })
  }

  const submitAnswers = async (autoSubmit = false) => {
    if (!autoSubmit && !confirm('Yakin ingin submit jawaban tryout?')) {
      return
    }

    if (autoSubmit) {
      alert('Waktu habis! Jawaban akan otomatis terkirim.')
    }

    setIsActive(false)
    setLoading(true)

    // Calculate score
    const totalQuestions = questions.length
    const correctCount = questions.filter(q => 
      answers[q.id]?.answer === q.correct_answer
    ).length
    const finalScore = Math.round((correctCount / totalQuestions) * 100)

    // Update session
    await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        is_completed: true,
        auto_submitted: autoSubmit,
        final_score: finalScore
      })
      .eq('id', sessionId)

    // Insert answers
    const answersToInsert = questions.map(q => ({
      session_id: sessionId,
      question_id: q.id,
      user_answer: answers[q.id]?.answer || null,
      is_correct: answers[q.id]?.answer === q.correct_answer,
      time_taken_seconds: answers[q.id]?.timeTaken || 0
    }))

    await supabase.from('user_answers').insert(answersToInsert)

    // Get user's target passing grade
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('target_passing_grade')
      .eq('user_id', user.id)
      .single()

    const targetPassingGrade = profile?.target_passing_grade || 700

    // Check if needs drilling
    const needsDrilling = finalScore < targetPassingGrade

    // Update profile with current score & drilling status
    await supabase
      .from('student_profiles')
      .update({
        current_score: finalScore,
        needs_drilling: needsDrilling
      })
      .eq('user_id', user.id)

    setLoading(false)

    // Redirect based on result
    if (needsDrilling) {
      // Score below target → Go to drilling
      router.push(`/drilling?session=${sessionId}&score=${finalScore}&target=${targetPassingGrade}`)
    } else {
      // Score meets or exceeds target → Success!
      router.push(`/success?score=${finalScore}&target=${targetPassingGrade}`)
    }
  }

  if (!user) return null

  if (!hasStarted) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h1 className="text-4xl font-bold mb-4 text-purple-600">Tryout UTBK 2026</h1>
            <p className="text-gray-600 mb-8 text-lg">
              Simulasi ujian lengkap dengan semua submateri
            </p>
            
            <div className="bg-purple-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-bold mb-4 text-lg">📋 Detail Tryout:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>⏱️ Durasi: <strong>120 menit (2 jam)</strong></li>
                <li>📝 Jumlah soal: <strong>60 soal</strong></li>
                <li>📚 Materi: <strong>Semua submateri (PU, PPU, PBM, PK, LBI, LBE, PM)</strong></li>
                <li>🚫 Tidak bisa pause atau keluar setelah mulai</li>
                <li>✅ Auto-submit saat waktu habis</li>
                <li>🎯 Drilling otomatis jika belum capai passing grade</li>
              </ul>
            </div>

            <button
              onClick={startTryout}
              disabled={loading}
              className="bg-purple-600 text-white px-12 py-4 rounded-xl text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 shadow-lg transform hover:scale-105 transition-all"
            >
              {loading ? 'Memuat...' : 'Mulai Tryout Sekarang'}
            </button>
            
            <p className="text-sm text-gray-500 mt-6">
              Pastikan koneksi internet stabil dan siapkan alat tulis
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div>
      <Navbar />
      <Timer 
        durationMinutes={120} 
        onTimeUp={() => submitAnswers(true)}
        isActive={isActive}
      />
      
      <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="bg-white rounded-lg p-4 mb-6 shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Soal {currentIndex + 1} dari {questions.length}</span>
              <span className="text-sm text-gray-600">
                Terjawab: {Object.keys(answers).length}/{questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                {currentQuestion?.submateri}
              </span>
            </div>

            <h2 className="text-xl font-medium mb-6 leading-relaxed">
              {currentQuestion?.question_text}
            </h2>

            <div className="space-y-3">
              {['A', 'B', 'C', 'D', 'E'].map(option => (
                <button
                  key={option}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id]?.answer === option
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <span className="font-bold mr-3">{option}.</span>
                  {currentQuestion[`option_${option.toLowerCase()}`]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              Sebelumnya
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => submitAnswers(false)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Send size={20} />
                {loading ? 'Menyimpan...' : 'Submit Tryout'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Selanjutnya
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 mt-6 shadow">
            <h3 className="font-bold mb-4">Navigasi Soal</h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded-lg font-bold text-sm ${
                    idx === currentIndex
                      ? 'bg-purple-600 text-white'
                      : answers[q.id]
                      ? 'bg-green-100 text-green-800 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function Tryout() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
      </div>
    }>
      <TryoutContent />
    </Suspense>
  )
}
