'use client'
import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

function DrillingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [wrongQuestions, setWrongQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [targetScore, setTargetScore] = useState(700)
  const [currentScore, setCurrentScore] = useState(0)

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/tryout')
      return
    }
    fetchWrongQuestions()
  }, [user, sessionId])

  async function fetchWrongQuestions() {
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('target_passing_grade, current_score')
      .eq('user_id', user.id)
      .single()

    setTargetScore(profile?.target_passing_grade || 700)
    setCurrentScore(profile?.current_score || 0)

    const { data: wrongAnswers } = await supabase
      .from('user_answers')
      .select(`
        question_id,
        questions (*)
      `)
      .eq('session_id', sessionId)
      .eq('is_correct', false)

    setWrongQuestions(wrongAnswers?.map(a => a.questions) || [])
    setLoading(false)
  }

  const handleAnswer = (questionId, answer, correctAnswer) => {
    setAnswers({
      ...answers,
      [questionId]: {
        answer,
        isCorrect: answer === correctAnswer
      }
    })
  }

  const submitDrilling = async () => {
    if (!confirm('Submit drilling? Jawaban yang benar akan update score kamu.')) {
      return
    }

    setLoading(true)

    for (const [questionId, answer] of Object.entries(answers)) {
      await supabase
        .from('user_answers')
        .update({
          user_answer: answer.answer,
          is_correct: answer.isCorrect
        })
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
    }

    const { data: allAnswers } = await supabase
      .from('user_answers')
      .select('is_correct')
      .eq('session_id', sessionId)

    const newCorrectCount = allAnswers.filter(a => a.is_correct).length
    const newScore = Math.round((newCorrectCount / allAnswers.length) * 100)

    await supabase
      .from('sessions')
      .update({ final_score: newScore })
      .eq('id', sessionId)

    const needsDrilling = newScore < targetScore

    await supabase
      .from('student_profiles')
      .update({
        current_score: newScore,
        needs_drilling: needsDrilling
      })
      .eq('user_id', user.id)

    setLoading(false)

    if (newScore >= targetScore) {
      alert(`🎉 Selamat! Score naik jadi ${newScore}! Sudah melewati target ${targetScore}!`)
      router.push(`/review/${sessionId}`)
    } else {
      alert(`Score naik jadi ${newScore}, tapi masih di bawah target ${targetScore}. Coba Try Out lagi!`)
      router.push('/tryout')
    }
  }

  if (!user || loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
        </div>
      </div>
    )
  }

  if (wrongQuestions.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold mb-4">Sempurna!</h1>
            <p className="text-gray-600 mb-6">
              Tidak ada soal yang salah. Kamu sudah lulus!
            </p>
            <button
              onClick={() => router.push('/tryout')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = wrongQuestions[currentIndex]

  return (
    <div>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="bg-orange-50 border-2 border-orange-500 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-orange-900 mb-2">
                  🎯 Drilling Mode
                </h2>
                <p className="text-orange-700">
                  Kerjakan ulang soal yang salah untuk tingkatkan score kamu!
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-600">Score Sekarang</p>
                <p className="text-4xl font-bold text-orange-900">{currentScore}</p>
                <p className="text-sm text-orange-600">Target: {targetScore}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Soal {currentIndex + 1} dari {wrongQuestions.length} soal yang salah
              </span>
              <span className="text-sm text-gray-600">
                Diperbaiki: {Object.keys(answers).length}/{wrongQuestions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / wrongQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
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
                  onClick={() => handleAnswer(currentQuestion.id, option, currentQuestion.correct_answer)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id]?.answer === option
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <span className="font-bold mr-3">{option}.</span>
                  {currentQuestion[`option_${option.toLowerCase()}`]}
                </button>
              ))}
            </div>

            {currentQuestion?.explanation && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h3 className="font-bold text-blue-900 mb-2">💡 Pembahasan:</h3>
                <p className="text-blue-800">{currentQuestion.explanation}</p>
              </div>
            )}
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

            {currentIndex === wrongQuestions.length - 1 ? (
              <button
                onClick={submitDrilling}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Send size={20} />
                {loading ? 'Menyimpan...' : 'Submit Drilling'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(Math.min(wrongQuestions.length - 1, currentIndex + 1))}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Selanjutnya
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 mt-6 shadow">
            <h3 className="font-bold mb-4">Navigasi Soal Salah</h3>
            <div className="grid grid-cols-10 gap-2">
              {wrongQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded-lg font-bold text-sm ${
                    idx === currentIndex
                      ? 'bg-orange-600 text-white'
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

export default function Drilling() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
      </div>
    }>
      <DrillingContent />
    </Suspense>
  )
}
