'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { CheckCircle, XCircle, Clock, ArrowLeft, BookOpen, Lightbulb } from 'lucide-react'

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

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchReviewData()
  }, [user, sessionId])

  const fetchReviewData = async () => {
    setLoading(true)

    // Fetch session info
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !sessionData) {
      alert('Session tidak ditemukan!')
      router.push('/latihan')
      return
    }

    setSession(sessionData)

    // Fetch answers with question details + tips_tricks
    const { data: answersData, error: answersError } = await supabase
      .from('user_answers')
      .select(`
        *,
        questions (
          id,
          submateri,
          packet,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          option_e,
          correct_answer,
          explanation,
          tips_tricks,
          difficulty
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (answersError) {
      console.error('Error fetching answers:', answersError)
      setLoading(false)
      return
    }

    setAnswers(answersData || [])
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

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={20} />
              Kembali
            </button>
            <div>
              <h1 className="text-2xl font-bold">Review Jawaban</h1>
              <p className="text-gray-500 text-sm">
                {session?.session_type === 'tryout' ? 'Tryout UTBK 2026' :
                 session?.session_type === 'growup' ? 'Grow Up Session' :
                 `Latihan ${session?.submateri} - ${SUBMATERI_NAMES[session?.submateri] || ''}`}
              </p>
            </div>
          </div>

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
                      No. {idx + 1}
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

                <p className="text-gray-800 font-medium mb-4 leading-relaxed">
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

                {/* Explanation */}
                {answer.questions?.explanation && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-3">
                    <div className="flex items-start gap-3">
                      <BookOpen className="text-blue-600 mt-1 shrink-0" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800 mb-2">📖 Pembahasan:</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {answer.questions.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tips & Tricks */}
                {answer.questions?.tips_tricks && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="text-yellow-600 mt-1 shrink-0" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-800 mb-2">💡 Tips & Tricks:</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {answer.questions.tips_tricks}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8 justify-center">
            <button
              onClick={() => router.push('/latihan')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              📝 Latihan Lagi
            </button>
            <button
              onClick={() => router.push('/progress')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              📊 Lihat Progress
            </button>
            <button
              onClick={() => router.push('/growup')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              🚀 Grow Up
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}