'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Timer from '@/components/Timer'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

function calculateDuration(questionCount) {
  return Math.round(questionCount * 1.18)
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours} jam ${mins} menit` : `${minutes} menit`
}

export default function TryoutPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [stage, setStage] = useState(1)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [durationMinutes, setDurationMinutes] = useState(120)

  const [availablePackages, setAvailablePackages] = useState([])
  const [packageQuestionCounts, setPackageQuestionCounts] = useState({})

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchAvailablePackages()
  }, [user, router])

  async function fetchAvailablePackages() {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('tryout_number')
        .eq('is_tryout', true)
        .order('tryout_number')

      if (error) {
        console.error('Error fetching packages:', error)
        return
      }

      const uniquePackages = [...new Set(data.map(q => q.tryout_number))].sort((a, b) => a - b)
      setAvailablePackages(uniquePackages)

      // Fetch question counts for all packages
      const counts = {}
      for (const packageNum of uniquePackages) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('is_tryout', true)
          .eq('tryout_number', packageNum)
        counts[packageNum] = count || 0
      }
      setPackageQuestionCounts(counts)
    } catch (error) {
      console.error('Error in fetchAvailablePackages:', error)
    }
  }

  async function startTryout(packageNum) {
    setLoading(true)

    console.log('=== START TRYOUT DEBUG ===')
    console.log('User:', user?.id)
    console.log('Package:', packageNum)

    try {
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('is_tryout', true)
        .eq('tryout_number', packageNum)
        .order('id')

      console.log('Questions fetched:', questionsData?.length)

      if (questionsError) {
        console.error('Questions fetch error:', questionsError)
        alert('Error memuat soal: ' + questionsError.message)
        setLoading(false)
        return
      }

      if (!questionsData || questionsData.length === 0) {
        alert('Tidak ada soal untuk paket ini!')
        setLoading(false)
        return
      }

      // Sort by submateri
      const sortOrder = ['PU', 'PPU', 'PBM', 'PK', 'LBI', 'LBE', 'PM']
      const sortedQuestions = questionsData.sort((a, b) => {
        return sortOrder.indexOf(a.submateri) - sortOrder.indexOf(b.submateri)
      })

      // Calculate duration
      const questionCount = sortedQuestions.length
      const calculatedDuration = calculateDuration(questionCount)

      console.log('Question count:', questionCount)
      console.log('Calculated duration:', calculatedDuration, 'minutes')

      // Create session
      const sessionData = {
        user_id: user.id,
        session_type: 'tryout',
        submateri: null,
        duration_minutes: calculatedDuration,
        start_time: new Date().toISOString(),
        tryout_number: packageNum,
        is_completed: false,
        final_score: 0
      }

      console.log('Creating session with data:', sessionData)

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        alert('Error membuat session: ' + sessionError.message)
        setLoading(false)
        return
      }

      if (!session) {
        alert('Error: Session tidak terbuat!')
        setLoading(false)
        return
      }

      console.log('Session created successfully:', session.id)

      // Set state
      setQuestions(sortedQuestions)
      setSessionId(session.id)
      setSelectedPackage(packageNum)
      setDurationMinutes(calculatedDuration)
      setIsActive(true)
      setStartTime(Date.now())
      setAnswers({})
      setCurrentIndex(0)
      setStage(2)
      setLoading(false)

      console.log('Tryout started, moving to stage 2')

    } catch (error) {
      console.error('Error in startTryout:', error)
      alert('Error: ' + error.message)
      setLoading(false)
    }
  }

  function handleAnswer(questionId, answer) {
    console.log('Answer recorded:', {
      questionId,
      answer,
      timeTaken: Math.floor((Date.now() - startTime) / 1000)
    })
    
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

    console.log('=== DEBUG SUBMIT ===')
    console.log('Total Questions:', questions.length)
    console.log('Answers:', answers)

    try {
      // Import IRT scoring functions
      const { calculateIRTScore, calculatePerSubmateri } = await import('@/lib/utbkScoring')
      
      // Calculate IRT-based scores
      const scoreResult = calculateIRTScore(questions, answers)
      const submateriScores = calculatePerSubmateri(questions, answers)

      console.log('IRT Score Result:', scoreResult)
      console.log('Submateri Scores:', submateriScores)

      // Validate score result
      if (!scoreResult || scoreResult.normalizedScore === undefined) {
        throw new Error('Invalid score calculation result')
      }

      // Update session with IRT scores
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          end_time: new Date().toISOString(),
          is_completed: true,
          auto_submitted: autoSubmit,
          final_score: scoreResult.normalizedScore,
          score_detail: {
            scoringMethod: 'IRT',
            rawScore: scoreResult.rawScore,
            maxPossibleScore: scoreResult.maxPossibleScore,
            normalizedScore: scoreResult.normalizedScore,
            correct: scoreResult.correct,
            wrong: scoreResult.wrong,
            unanswered: scoreResult.unanswered,
            percentage: scoreResult.percentage,
            submateriScores: submateriScores
          }
        })
        .eq('id', sessionId)

      if (sessionError) {
        console.error('Session update error:', sessionError)
        throw sessionError
      }

      console.log('Session updated successfully')

      // Insert answers
      const answersToInsert = questions.map(q => ({
        session_id: sessionId,
        question_id: q.id,
        user_answer: answers[q.id]?.answer || null,
        is_correct: answers[q.id]?.answer === q.correct_answer,
        time_taken_seconds: answers[q.id]?.timeTaken || 0
      }))

      const { error: answersError } = await supabase
        .from('user_answers')
        .insert(answersToInsert)

      if (answersError) {
        console.error('Answers insert error:', answersError)
        throw answersError
      }

      console.log('Answers inserted successfully')

      // Update profile
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('tryout_completed_count, latest_tryout_scores')
        .eq('user_id', user.id)
        .single()

      const newCount = (profile?.tryout_completed_count || 0) + 1
      
      let latestScores = profile?.latest_tryout_scores || []
      latestScores.push({
        sessionId: sessionId,
        tryoutNumber: selectedPackage,
        normalizedScore: scoreResult.normalizedScore,
        percentage: scoreResult.percentage,
        submateriScores: submateriScores,
        date: new Date().toISOString()
      })
      
      // Keep only last 3 tryout scores
      if (latestScores.length > 3) {
        latestScores = latestScores.slice(-3)
      }

      await supabase
        .from('student_profiles')
        .update({
          current_score: scoreResult.normalizedScore,
          tryout_completed_count: newCount,
          latest_tryout_scores: latestScores
        })
        .eq('user_id', user.id)

      console.log('Profile updated successfully')

      setLoading(false)

      // Redirect based on tryout count
      if (newCount >= 3) {
        router.push('/analysis?highlight=true')
      } else {
        router.push(`/review/${sessionId}`)
      }
      
    } catch (error) {
      console.error('Submit error:', error)
      alert('Error menyimpan jawaban: ' + error.message)
      setLoading(false)
      setIsActive(true) // Re-enable timer if submit failed
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Stage 1: Package Selection
  if (stage === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-gray-800">🎯 Try Out UTBK 2026</h1>
              <p className="text-gray-600 text-lg">Pilih paket try out yang ingin kamu kerjakan</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePackages.map(packageNum => {
                const questionCount = packageQuestionCounts[packageNum] || 0
                const duration = questionCount ? calculateDuration(questionCount) : 120
                const durationText = formatDuration(duration)

                return (
                  <div
                    key={packageNum}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 cursor-pointer border-2 border-transparent hover:border-purple-500"
                    onClick={() => startTryout(packageNum)}
                  >
                    <div className="text-center">
                      <div className="text-6xl mb-4">📦</div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        Paket {packageNum}
                      </h3>
                      <p className="text-gray-600 mb-4">Try Out UTBK 2026</p>
                      
                      <div className="bg-purple-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-1">Total Soal</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {questionCount || '...'}
                        </p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-600 mb-1">⏱️ Durasi</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {durationText}
                        </p>
                      </div>

                      <button
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          startTryout(packageNum)
                        }}
                      >
                        Mulai Tryout
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {availablePackages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">Belum ada paket try out tersedia</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Stage 2: Questions
  if (stage === 2 && questions.length > 0) {
    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length
    const progress = Math.round((answeredCount / questions.length) * 100)

    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-6 px-4">
          <div className="max-w-7xl mx-auto">
            
            {/* Timer & Progress */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {answeredCount} / {questions.length}
                  </p>
                </div>
                <Timer
                  durationMinutes={durationMinutes}
                  isActive={isActive}
                  onTimeUp={() => submitAnswers(true)}
                />
                <button
                  onClick={() => submitAnswers(false)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold"
                >
                  Submit
                </button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              
              {/* Question Card */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-bold">
                    No. {currentIndex + 1}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
                    {currentQuestion.submateri} - {SUBMATERI_NAMES[currentQuestion.submateri]}
                  </span>
                </div>

                <p className="text-lg text-gray-800 mb-6 leading-relaxed whitespace-pre-line">
                  {currentQuestion.question_text}
                </p>

                <div className="space-y-3">
                  {['A', 'B', 'C', 'D', 'E'].map(option => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        answers[currentQuestion.id]?.answer === option
                          ? 'bg-purple-100 border-purple-500 text-purple-800'
                          : 'bg-gray-50 border-gray-200 hover:border-purple-300 text-gray-700'
                      }`}
                    >
                      <span className="font-bold mr-3">{option}.</span>
                      {currentQuestion[`option_${option.toLowerCase()}`]}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === questions.length - 1}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>

              {/* Navigation Grid */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Navigasi Soal</h3>
                  <div className="grid grid-cols-5 gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {questions.map((q, idx) => {
                      const isAnswered = answers[q.id]?.answer
                      const isCurrent = idx === currentIndex
                      
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                            isCurrent
                              ? 'bg-purple-600 text-white ring-4 ring-purple-200'
                              : isAnswered
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-purple-600 rounded"></div>
                      <span className="text-gray-600">Soal saat ini</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded"></div>
                      <span className="text-gray-600">Sudah dijawab</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 rounded"></div>
                      <span className="text-gray-600">Belum dijawab</span>
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
