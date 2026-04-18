'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { CheckCircle, XCircle, Clock, ArrowLeft, BookOpen, Lightbulb, TrendingUp, TrendingDown, Minus, Award, BarChart3 } from 'lucide-react'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

export default function ReviewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tryoutCount, setTryoutCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchReviewData()
  }, [user, sessionId])
  
  const fetchReviewData = async () => {
    setLoading(true)

    // Fetch session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !sessionData) {
      alert('Session tidak ditemukan!')
      router.push('/')
      return
    }

    setSession(sessionData)

    // Fetch user_answers
    const { data: rawAnswers, error: rawError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (rawError) {
      console.error('Error fetching answers:', rawError)
      setDebugInfo({ step: 'user_answers fetch failed', error: rawError.message })
      setLoading(false)
      return
    }

    // Debug: check question_id dari rawAnswers
    const sampleIds = (rawAnswers || []).slice(0, 3).map(a => a.question_id)
    const allNullIds = sampleIds.every(id => !id)

    // Fetch questions berdasarkan question_id dari user_answers
    let questionsMap = {}
    let questionsError = null
    let questionsFound = 0

    if (rawAnswers && rawAnswers.length > 0) {
      const questionIds = [...new Set(rawAnswers.map(a => a.question_id).filter(Boolean))]

      if (questionIds.length > 0) {
        const { data: questionsData, error: qError } = await supabase
          .from('questions')
          .select('id, submateri, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, difficulty')
          .in('id', questionIds)

        if (qError) {
          console.error('Error fetching questions:', qError)
          questionsError = qError.message
        } else {
          questionsData?.forEach(q => { questionsMap[String(q.id)] = q })
          questionsFound = questionsData?.length || 0
        }
      }
    }

    // Set debug info so we can diagnose the issue
    setDebugInfo({
      totalAnswers: rawAnswers?.length || 0,
      sampleQuestionIds: sampleIds,
      allIdsNull: allNullIds,
      questionsFound,
      questionsError,
      sessionType: sessionData.session_type,
      tryoutNumber: sessionData.tryout_number
    })

    const mergedAnswers = (rawAnswers || []).map(a => ({
      ...a,
      questions: questionsMap[String(a.question_id)] || null
    }))

    setAnswers(mergedAnswers)

    if (sessionData.session_type === 'tryout') {
      const { data: profileData } = await supabase
        .from('student_profiles')
        .select('tryout_completed_count')
        .eq('user_id', user.id)
        .single()

      setTryoutCount(profileData?.tryout_completed_count || 0)
    }

    setLoading(false)
  }

  if (!user) return null

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat review jawaban...</p>
          </div>
        </div>
      </div>
    )
  }

  const totalQuestions = answers.length
  const correctCount = answers.filter(a => a.is_correct).length
  const wrongCount = answers.filter(a => !a.is_correct && a.user_answer).length
  const unansweredCount = answers.filter(a => !a.user_answer).length
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  // Get UTBK scores from session if available
  const hasUTBKScore = session?.score_detail?.normalizedScore !== undefined
  const utbkScore = session?.score_detail || {}
  
  // Calculate per-submateri breakdown
  const submateriScores = {}
  answers.forEach(a => {
    const sub = a.questions?.submateri
    if (!sub) return
    
    if (!submateriScores[sub]) {
      submateriScores[sub] = { total: 0, correct: 0, wrong: 0, unanswered: 0 }
    }
    submateriScores[sub].total++
    if (a.is_correct) {
      submateriScores[sub].correct++
    } else if (a.user_answer) {
      submateriScores[sub].wrong++
    } else {
      submateriScores[sub].unanswered++
    }
  })

  // Convert to array and add percentages
  const submateriAnalysis = Object.entries(submateriScores).map(([sub, data]) => {
    const percentage = Math.round((data.correct / data.total) * 100)
    let status = 'LEMAH'
    let statusColor = 'red'
    let icon = TrendingDown
    
    if (percentage >= 70) {
      status = 'KUAT'
      statusColor = 'green'
      icon = TrendingUp
    } else if (percentage >= 50) {
      status = 'SEDANG'
      statusColor = 'yellow'
      icon = Minus
    }
    
    return {
      submateri: sub,
      name: SUBMATERI_NAMES[sub] || sub,
      correct: data.correct,
      wrong: data.wrong,
      unanswered: data.unanswered,
      total: data.total,
      percentage,
      status,
      statusColor,
      icon
    }
  }).sort((a, b) => a.submateri.localeCompare(b.submateri))

  const weakSubmateri = submateriAnalysis.filter(s => s.percentage < 50)
  const mediumSubmateri = submateriAnalysis.filter(s => s.percentage >= 50 && s.percentage < 70)
  const strongSubmateri = submateriAnalysis.filter(s => s.percentage >= 70)

  const isPretest = session?.session_type === 'pretest'
  const isTryout = session?.session_type === 'tryout'
  const isLatihan = session?.session_type === 'latihan'

  const filteredAnswers = answers.filter(a => {
    if (filter === 'correct') return a.is_correct
    if (filter === 'wrong') return !a.is_correct && a.user_answer
    if (filter === 'unanswered') return !a.user_answer
    return true
  })

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getOptionStyle = (answer, optionLetter) => {
    if (!answer.questions) return 'bg-gray-50 border border-gray-200 text-gray-600'
    const isCorrect = answer.questions.correct_answer === optionLetter
    const isUserAnswer = answer.user_answer === optionLetter

    if (isCorrect && isUserAnswer) {
      return 'bg-green-100 border-2 border-green-500 text-green-800'
    }
    if (isCorrect) {
      return 'bg-green-50 border-2 border-green-400 text-green-700'
    }
    if (isUserAnswer && !isCorrect) {
      return 'bg-red-100 border-2 border-red-500 text-red-800'
    }
    return 'bg-gray-50 border border-gray-200 text-gray-600'
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={20} />
              Kembali
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {isPretest ? '📊 Hasil Initial Test' : 
                 isTryout ? '🎯 Hasil Tryout' : 
                 '📝 Review Jawaban'}
              </h1>
              <p className="text-gray-500 text-sm">
                {isTryout ? `Tryout ${session?.tryout_number || ''} - UTBK 2026` :
                 isPretest ? 'Initial Test - Diagnostic Assessment' :
                 `Latihan ${session?.submateri} - ${SUBMATERI_NAMES[session?.submateri] || ''}`}
              </p>
            </div>
          </div>

          {/* UTBK Score Card (For Tryout) */}
          {isTryout && hasUTBKScore && (
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Award size={40} />
                <div>
                  <h2 className="text-3xl font-bold">Skor UTBK (IRT)</h2>
                  <p className="text-purple-100">Sistem Penilaian: Berdasarkan tingkat kesulitan soal</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-purple-700 bg-opacity-60 rounded-xl p-6 text-center">
                  <p className="text-purple-100 text-sm mb-2">Skor Normalized</p>
                  <p className="text-6xl font-bold mb-2 text-white">{utbkScore.normalizedScore ?? 0}</p>
                  <p className="text-purple-200 text-sm">Skala 0-1000</p>
                </div>
                <div className="bg-purple-700 bg-opacity-60 rounded-lg p-4 text-center">
                  <p className="text-purple-100 text-sm mb-2">Skor Mentah</p>
                  <p className="text-6xl font-bold mb-2 text-white">{utbkScore.rawScore ?? 0}</p>
                  <p className="text-purple-200 text-sm">
                    dari {utbkScore.maxPossibleScore ?? 0} maks
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-700 bg-opacity-60 rounded-lg p-4 text-center">
                  <p className="text-4xl font-bold text-white">{utbkScore.correct ?? 0}</p>
                  <p className="text-purple-100 text-sm mt-1">Benar</p>
                  <p className="text-purple-200 text-xs">Dapat poin</p>
                </div>
                <div className="bg-purple-700 bg-opacity-60 rounded-lg p-4 text-center">
                  <p className="text-4xl font-bold text-white">{utbkScore.wrong ?? 0}</p>
                  <p className="text-purple-100 text-sm mt-1">Salah</p>
                  <p className="text-purple-200 text-xs">0 poin (tidak minus)</p>
                </div>
                <div className="bg-purple-700 bg-opacity-60 rounded-lg p-4 text-center">
                  <p className="text-4xl font-bold text-white">{utbkScore.unanswered ?? 0}</p>
                  <p className="text-purple-100 text-sm mt-1">Kosong</p>
                  <p className="text-purple-200 text-xs">0 poin</p>
                </div>
              </div>

                <div className="mt-6 bg-purple-700 bg-opacity-10 rounded-lg p-4">
                  <p className="text-sm text-purple-100">
                    💡 <strong>Sistem IRT:</strong> Soal sulit bernilai lebih tinggi. 
                    Jawaban salah tidak mengurangi poin!
                  </p>
                </div>
              </div>
            )}
          
          {/* Regular Score Summary (For Non-Tryout or if no UTBK score) */}
          {(!isTryout || !hasUTBKScore) && (
            <div className={`rounded-2xl border-2 p-8 mb-8 ${getScoreBg(scorePercentage)}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className={`text-5xl font-bold ${getScoreColor(scorePercentage)}`}>
                    {scorePercentage}%
                  </p>
                  <p className="text-gray-600 mt-1">Skor Akhir</p>
                </div>
                <div>
                  <p className="text-5xl font-bold text-green-600">{correctCount}</p>
                  <p className="text-gray-600 mt-1">Benar</p>
                </div>
                <div>
                  <p className="text-5xl font-bold text-red-600">{wrongCount}</p>
                  <p className="text-gray-600 mt-1">Salah</p>
                </div>
                <div>
                  <p className="text-5xl font-bold text-gray-400">{unansweredCount}</p>
                  <p className="text-gray-600 mt-1">Tidak Dijawab</p>
                </div>
              </div>

              <div className="text-center mt-6">
                {scorePercentage >= 80 && (
                  <p className="text-green-700 font-bold text-lg">🎉 Excellent! Pertahankan terus!</p>
                )}
                {scorePercentage >= 60 && scorePercentage < 80 && (
                  <p className="text-yellow-700 font-bold text-lg">👍 Bagus! Masih bisa ditingkatkan lagi!</p>
                )}
                {scorePercentage < 60 && (
                  <p className="text-red-700 font-bold text-lg">💪 Jangan menyerah! Pelajari pembahasannya!</p>
                )}
              </div>
            </div>
          )}

          {/* Link to Analysis (if completed 3 tryouts) */}
          {isTryout && tryoutCount >= 3 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BarChart3 size={40} />
                  <div>
                    <h3 className="text-xl font-bold mb-1">🎉 Analisis Kemampuan Tersedia!</h3>
                    <p className="text-green-100 text-sm">
                      Kamu sudah menyelesaikan {tryoutCount} tryout. Lihat analisis lengkap!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/analysis')}
                  className="bg-white text-green-600 px-6 py-3 rounded-lg font-bold hover:bg-green-50 transition-all"
                >
                  Lihat Analisis →
                </button>
              </div>
            </div>
          )}

          {/* Per-Submateri Analysis */}
          {(isPretest || isTryout) && submateriAnalysis.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">📊</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Analisis per Submateri</h2>
                  <p className="text-sm text-gray-600">Identifikasi kekuatan dan kelemahan kamu</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {submateriAnalysis.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.submateri}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                        item.statusColor === 'green' ? 'bg-green-50 border-green-200' :
                        item.statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Icon
                          size={24}
                          className={
                            item.statusColor === 'green' ? 'text-green-600' :
                            item.statusColor === 'yellow' ? 'text-yellow-600' :
                            'text-red-600'
                          }
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{item.submateri}</h3>
                          <p className="text-sm text-gray-600">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {item.correct}/{item.total} benar
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <p className={`text-3xl font-bold ${
                          item.statusColor === 'green' ? 'text-green-600' :
                          item.statusColor === 'yellow' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.percentage}%
                        </p>
                        <p className={`text-sm font-semibold ${
                          item.statusColor === 'green' ? 'text-green-600' :
                          item.statusColor === 'yellow' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.status}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <span className="text-lg">Rekomendasi Belajar</span>
                </h3>

                {strongSubmateri.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-green-700 mb-2">✅ Kekuatan Kamu:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-6">
                      {strongSubmateri.map(s => (
                        <li key={s.submateri}>
                          <strong>{s.submateri}</strong> ({s.percentage}%) - Pertahankan dengan latihan rutin
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {mediumSubmateri.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-yellow-700 mb-2">⚠️ Perlu Ditingkatkan:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-6">
                      {mediumSubmateri.map(s => (
                        <li key={s.submateri}>
                          <strong>{s.submateri}</strong> ({s.percentage}%) - Fokus latihan lebih banyak
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {weakSubmateri.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-red-700 mb-2">🎯 Prioritas Belajar:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-6">
                      {weakSubmateri.map(s => (
                        <li key={s.submateri}>
                          <strong>{s.submateri}</strong> ({s.percentage}%) - Butuh latihan intensif & review materi
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    💪 Langkah Selanjutnya: Fokus latihan di submateri yang lemah untuk hasil maksimal!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              Semua ({totalQuestions})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'correct' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              ✅ Benar ({correctCount})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'wrong' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              ❌ Salah ({wrongCount})
            </button>
            {unansweredCount > 0 && (
              <button
                onClick={() => setFilter('unanswered')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'unanswered' ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                ⬜ Tidak Dijawab ({unansweredCount})
              </button>
            )}
          </div>

          {/* DEBUG PANEL - Remove after fixing */}
          {debugInfo && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-6 font-mono text-xs">
              <p className="font-bold text-yellow-800 mb-2">🔍 Debug Info (hapus setelah selesai):</p>
              <p>Total Answers: <strong>{debugInfo.totalAnswers}</strong></p>
              <p>Session Type: <strong>{debugInfo.sessionType}</strong> | Tryout Number: <strong>{String(debugInfo.tryoutNumber)}</strong></p>
              <p>Sample question_id[0..2]: <strong>{JSON.stringify(debugInfo.sampleQuestionIds)}</strong></p>
              <p>Semua question_id null?: <strong>{String(debugInfo.allIdsNull)}</strong></p>
              <p>Questions ditemukan di DB: <strong>{debugInfo.questionsFound}</strong></p>
              {debugInfo.questionsError && <p className="text-red-600">Questions Error: <strong>{debugInfo.questionsError}</strong></p>}
            </div>
          )}

          {/* Questions Review */}
          <div className="space-y-6">
            {filteredAnswers.map((answer, idx) => (
              <div
                key={answer.id}
                className={`bg-white rounded-xl shadow p-6 border-l-4 ${
                  answer.is_correct ? 'border-green-500' : !answer.user_answer ? 'border-gray-400' : 'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      No. {answers.indexOf(answer) + 1}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {answer.questions?.submateri}
                    </span>
                    {answer.questions?.difficulty && (
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        answer.questions.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        answer.questions.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {answer.questions.difficulty === 'easy' ? 'Mudah' :
                         answer.questions.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {answer.is_correct ? (
                      <CheckCircle className="text-green-500" size={28} />
                    ) : !answer.user_answer ? (
                      <span className="text-gray-400 text-sm">Tidak dijawab</span>
                    ) : (
                      <XCircle className="text-red-500" size={28} />
                    )}
                    {answer.time_taken_seconds > 0 && (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock size={14} />
                        {answer.time_taken_seconds}s
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-800 font-medium mb-4 leading-relaxed whitespace-pre-line">
                  {answer.questions?.question_text}
                </p>

                <div className="space-y-2 mb-4">
                  {['A', 'B', 'C', 'D', 'E'].map(option => (
                    <div
                      key={option}
                      className={`p-3 rounded-lg text-sm ${getOptionStyle(answer, option)}`}
                    >
                      <span className="font-bold mr-2">{option}.</span>
                      {answer.questions?.[`option_${option.toLowerCase()}`]}
                      {answer.questions?.correct_answer === option && (
                        <span className="ml-2 font-bold text-green-600">✓ Jawaban Benar</span>
                      )}
                      {answer.user_answer === option && !answer.is_correct && (
                        <span className="ml-2 font-bold text-red-600">✗ Jawaban Kamu</span>
                      )}
                    </div>
                  ))}
                </div>

                {answer.questions?.explanation && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                      <BookOpen className="text-blue-600 mt-1 shrink-0" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800 mb-2">📖 Pembahasan:</p>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                          {answer.questions.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 justify-center flex-wrap">
            {isLatihan && (
              <button
                onClick={() => router.push('/latihan')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
              >
                📝 Latihan Lagi
              </button>
            )}
            {isTryout && (
              <button
                onClick={() => router.push('/tryout')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-md hover:shadow-lg transition-all"
              >
                🎯 Tryout Lagi
              </button>
            )}
            {isPretest && (
              <>
                <button
                  onClick={() => router.push('/latihan')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  📚 Mulai Latihan
                </button>
                <button
                  onClick={() => router.push('/tryout')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  🎯 Mulai Tryout
                </button>
              </>
            )}
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-md hover:shadow-lg transition-all"
            >
              🏠 Dashboard
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
