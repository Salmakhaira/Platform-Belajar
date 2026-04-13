'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ChevronLeft, ChevronRight, Check, X, BookOpen, RefreshCw, Home } from 'lucide-react'

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

  const [stage, setStage] = useState(1) // 1: pilih submateri, 2: pilih paket, 3: latihan, 4: hasil
  const [selectedSubmateri, setSelectedSubmateri] = useState(null)
  const [paketOptions, setPaketOptions] = useState([])
  const [selectedPaket, setSelectedPaket] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState({}) // Track which questions have been checked
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalResult, setFinalResult] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkPretest()
  }, [user, router])

  // Timer untuk tracking waktu (bukan hard limit)
  useEffect(function() {
    if (stage === 3 && startTime) {
      const interval = setInterval(function() {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return function() { clearInterval(interval) }
    }
  }, [stage, startTime])

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

    const { data, error } = await supabase
      .from('questions')
      .select('paket_number')
      .eq('submateri', code)
      .eq('is_pretest', false)
      .eq('is_tryout', false)

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

    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('submateri', selectedSubmateri)
      .eq('paket_number', paketNum)
      .eq('is_pretest', false)
      .eq('is_tryout', false)
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
        duration_minutes: 20,
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
    setStartTime(Date.now())
    setAnswers({})
    setChecked({})
    setStage(3)
    setLoading(false)
  }

  function handleAnswer(questionId, answer) {
    setAnswers({
      ...answers,
      [questionId]: answer
    })
    // Reset checked status when changing answer
    const newChecked = { ...checked }
    delete newChecked[questionId]
    setChecked(newChecked)
  }

  function checkAnswer(questionId) {
    setChecked({
      ...checked,
      [questionId]: true
    })
  }

  async function finishPractice() {
    setLoading(true)

    // Calculate score
    const totalQuestions = questions.length
    const correctCount = questions.filter(function(q) {
      return answers[q.id] === q.correct_answer
    }).length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)

    // Update session
    await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        is_completed: true,
        final_score: scorePercentage
      })
      .eq('id', sessionId)

    // Insert answers
    const answersToInsert = questions.map(function(q) {
      return {
        session_id: sessionId,
        question_id: q.id,
        user_answer: answers[q.id] || null,
        is_correct: answers[q.id] === q.correct_answer,
        time_taken_seconds: 0
      }
    })

    await supabase.from('user_answers').insert(answersToInsert)

    setFinalResult({
      score: scorePercentage,
      correct: correctCount,
      total: totalQuestions,
      timeSpent: elapsedSeconds
    })

    setStage(4)
    setLoading(false)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }

  function resetAndRetry() {
    setStage(2)
    setCurrentIndex(0)
    setAnswers({})
    setChecked({})
    setElapsedSeconds(0)
    setFinalResult(null)
  }

  if (!user) return null

  // ========== STAGE 1: Pilih Submateri ==========
  if (stage === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-bold mb-3 text-gray-800">Latihan Soal</h1>
              <p className="text-gray-600 text-lg">Pilih submateri untuk memulai latihan</p>
              <div className="mt-4 inline-block bg-blue-100 px-6 py-2 rounded-full">
                <p className="text-sm text-blue-800">
                  ⏱️ <strong>Mode Belajar:</strong> Tanpa tekanan waktu • Pembahasan langsung tersedia
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUBMATERI.map(function(sub) {
                return (
                  <button
                    key={sub.code}
                    onClick={function() { selectSubmateri(sub.code) }}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl border-2 border-gray-100 hover:border-blue-400 transition-all text-left transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow">
                        {sub.code}
                      </span>
                      <ChevronRight size={24} className="text-blue-400" />
                    </div>
                    <p className="font-semibold text-gray-800 text-lg">{sub.name}</p>
                    <p className="text-sm text-gray-500 mt-2">Latihan per paket • 15-20 soal</p>
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={function() { setStage(1) }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-all"
            >
              <ChevronLeft size={20} />
              Kembali
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-full text-xl font-bold shadow-md">
                  {selectedSubmateri}
                </span>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{submateriData?.name}</h1>
                  <p className="text-gray-500 mt-1">Pilih paket untuk memulai latihan</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Memuat paket...</p>
                </div>
              ) : paketOptions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-lg">Belum ada soal untuk submateri ini.</p>
                  <p className="text-sm text-gray-400 mt-2">Silakan tambahkan soal terlebih dahulu di database.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paketOptions.map(function(paket) {
                    return (
                      <button
                        key={paket.number}
                        onClick={function() { startPaket(paket.number) }}
                        disabled={loading}
                        className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:shadow-lg transition-all text-left disabled:opacity-50 transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-2xl font-bold text-blue-600">
                            📦 Paket {paket.number}
                          </h3>
                          <ChevronRight size={32} className="text-blue-400" />
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                            {paket.count} soal
                          </span>
                          <span className="text-sm">•</span>
                          <span className="text-sm">~20 menit</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-start gap-4">
                <BookOpen size={28} className="flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-2">💡 Tips Latihan:</p>
                  <ul className="space-y-1 text-sm text-blue-100">
                    <li>• Kerjakan dengan santai, fokus pada pemahaman</li>
                    <li>• Cek pembahasan setelah jawab untuk belajar</li>
                    <li>• Kamu bisa mengulang paket yang sama kapan saja</li>
                    <li>• Tidak ada drilling, ini murni untuk belajar!</li>
                  </ul>
                </div>
              </div>
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
    const checkedCount = Object.keys(checked).length
    const isAnswered = !!answers[currentQuestion?.id]
    const isChecked = !!checked[currentQuestion?.id]
    const isCorrect = answers[currentQuestion?.id] === currentQuestion?.correct_answer
    const allChecked = checkedCount === questions.length

    return (
      <div>
        <Navbar />
        
        {/* Sticky Header with Timer */}
        <div className="bg-white shadow-md px-6 py-3 sticky top-0 z-10 border-b-2 border-blue-100">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-gray-800">
                {selectedSubmateri} — Paket {selectedPaket}
              </p>
              <p className="text-sm text-gray-500">
                Mode Latihan • {questions.length} soal
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                ⏱️ {formatTime(elapsedSeconds)}
              </p>
              <p className="text-xs text-gray-500">Waktu belajar</p>
            </div>
          </div>
        </div>

        <div className="min-h-screen bg-gray-50 pb-8 px-4 pt-6">
          <div className="max-w-4xl mx-auto">

            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Soal {currentIndex + 1} dari {questions.length}
                </span>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">Dijawab: {answeredCount}/{questions.length}</span>
                  <span className="text-blue-600">Dicek: {checkedCount}/{questions.length}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: ((currentIndex + 1) / questions.length * 100) + '%' }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-4">
              
              {/* Question Text */}
              <div className="mb-6">
                {(() => {
                  const text = currentQuestion?.question_text || ''
                  const hasImage = text.includes('![') && text.includes('](https://')
                  
                  if (hasImage) {
                    const parts = []
                    let lastIndex = 0
                    const imageRegex = /!\[([^\]]*)\]\((https:\/\/[^)]+)\)/g
                    let match
                    
                    while ((match = imageRegex.exec(text)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push({
                          type: 'text',
                          content: text.substring(lastIndex, match.index)
                        })
                      }
                      
                      parts.push({
                        type: 'image',
                        alt: match[1] || 'Gambar soal',
                        url: match[2]
                      })
                      
                      lastIndex = match.index + match[0].length
                    }
                    
                    if (lastIndex < text.length) {
                      parts.push({
                        type: 'text',
                        content: text.substring(lastIndex)
                      })
                    }
                    
                    return (
                      <div className="space-y-4">
                        {parts.map((part, idx) => {
                          if (part.type === 'image') {
                            return (
                              <div key={idx} className="flex justify-center my-6">
                                <img 
                                  src={part.url}
                                  alt={part.alt}
                                  className="max-w-full max-h-96 rounded-lg border-2 border-gray-300 shadow-md"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    console.error('Failed to load image:', part.url)
                                  }}
                                />
                              </div>
                            )
                          }
                          
                          return part.content.trim() ? (
                            <p key={idx} className="text-lg font-medium leading-loose text-gray-800 whitespace-pre-line">
                              {part.content}
                            </p>
                          ) : null
                        })}
                      </div>
                    )
                  }
                  
                  const isLongText = text.length > 500
                  
                  if (isLongText) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-3">
                          <BookOpen size={18} />
                          <span>Reading Passage</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 max-h-[420px] overflow-y-auto">
                          <p className="text-base leading-loose text-gray-800 whitespace-pre-line font-serif">
                            {text}
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <p className="text-lg font-medium leading-loose text-gray-800 whitespace-pre-line">
                      {text}
                    </p>
                  )
                })()}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {['A', 'B', 'C', 'D', 'E'].map(function(opt) {
                  const isSelected = answers[currentQuestion?.id] === opt
                  const isCorrectAnswer = opt === currentQuestion?.correct_answer
                  
                  let buttonClass = 'w-full text-left p-4 rounded-xl border-2 transition-all '
                  
                  if (isChecked) {
                    // After checking: show correct/wrong
                    if (isCorrectAnswer) {
                      buttonClass += 'border-green-500 bg-green-50'
                    } else if (isSelected && !isCorrectAnswer) {
                      buttonClass += 'border-red-500 bg-red-50'
                    } else {
                      buttonClass += 'border-gray-200 bg-gray-50'
                    }
                  } else {
                    // Before checking: show selection only
                    if (isSelected) {
                      buttonClass += 'border-blue-500 bg-blue-50'
                    } else {
                      buttonClass += 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }
                  }
                  
                  return (
                    <button
                      key={opt}
                      onClick={function() { 
                        if (!isChecked) {
                          handleAnswer(currentQuestion.id, opt)
                        }
                      }}
                      disabled={isChecked}
                      className={buttonClass}
                    >
                      <div className="flex items-center gap-3">
                        <span className={'font-bold text-lg ' + (
                          isChecked && isCorrectAnswer ? 'text-green-600' :
                          isChecked && isSelected && !isCorrectAnswer ? 'text-red-600' :
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        )}>
                          {opt}.
                        </span>
                        <span className="leading-relaxed flex-1">
                          {currentQuestion?.[`option_${opt.toLowerCase()}`]}
                        </span>
                        {isChecked && isCorrectAnswer && (
                          <Check size={24} className="text-green-600 flex-shrink-0" />
                        )}
                        {isChecked && isSelected && !isCorrectAnswer && (
                          <X size={24} className="text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Check Answer Button */}
              {isAnswered && !isChecked && (
                <div className="mt-6">
                  <button
                    onClick={function() { checkAnswer(currentQuestion.id) }}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    ✓ Cek Jawaban
                  </button>
                </div>
              )}

              {/* Pembahasan (After Checking) */}
              {isChecked && (
                <div className={'mt-6 p-6 rounded-xl border-2 ' + (isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')}>
                  <div className="flex items-center gap-3 mb-4">
                    {isCorrect ? (
                      <>
                        <Check size={28} className="text-green-600 flex-shrink-0" />
                        <p className="text-green-800 font-bold text-lg">Jawaban Benar! 🎉</p>
                      </>
                    ) : (
                      <>
                        <X size={28} className="text-red-600 flex-shrink-0" />
                        <p className="text-red-800 font-bold text-lg">Jawaban Salah</p>
                      </>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Jawaban yang benar:</strong> {currentQuestion?.correct_answer}
                    </p>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">📖 Pembahasan:</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {currentQuestion?.pembahasan || 'Pembahasan belum tersedia.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={function() { setCurrentIndex(Math.max(0, currentIndex - 1)) }}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow hover:shadow-md transition-all"
              >
                <ChevronLeft size={20} />
                Sebelumnya
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={finishPractice}
                  disabled={!allChecked || loading}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? 'Menyimpan...' : 'Selesai Latihan'}
                  {!loading && <Check size={20} />}
                </button>
              ) : (
                <button
                  onClick={function() { setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1)) }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Selanjutnya
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Question Navigator */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="font-bold mb-4 text-gray-800">Navigasi Soal</h3>
              <div className="grid grid-cols-10 gap-2">
                {questions.map(function(q, idx) {
                  const isAnswered = answers[q.id]
                  const isChecked = checked[q.id]
                  const isCurrent = idx === currentIndex
                  const isCorrect = answers[q.id] === q.correct_answer
                  
                  let btnClass = 'aspect-square rounded-lg font-bold text-sm transition-all '
                  
                  if (isCurrent) {
                    btnClass += 'bg-blue-600 text-white ring-4 ring-blue-300'
                  } else if (isChecked && isCorrect) {
                    btnClass += 'bg-green-500 text-white'
                  } else if (isChecked && !isCorrect) {
                    btnClass += 'bg-red-500 text-white'
                  } else if (isAnswered) {
                    btnClass += 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
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
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-green-500"></span>
                  Benar
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-500"></span>
                  Salah
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-400"></span>
                  Dijawab
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-gray-100"></span>
                  Belum
                </span>
              </div>
            </div>

            {!allChecked && (
              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <p className="text-yellow-800 text-sm">
                  💡 <strong>Tip:</strong> Cek semua jawaban untuk melihat pembahasan dan menyelesaikan latihan!
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ========== STAGE 4: Hasil Latihan ==========
  if (stage === 4 && finalResult) {
    const { score, correct, total, timeSpent } = finalResult
    const submateriData = SUBMATERI.find(function(s) { return s.code === selectedSubmateri })

    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
          <div className="max-w-3xl mx-auto">

            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-10 mb-6 text-center">
              <div className="text-7xl mb-4">
                {score >= 80 ? '🎉' : score >= 60 ? '😊' : '💪'}
              </div>
              <h1 className="text-3xl font-bold mb-3 text-gray-800">Latihan Selesai!</h1>
              <p className="text-gray-600 mb-6">
                {submateriData?.name} — Paket {selectedPaket}
              </p>
              
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-8 mb-6">
                <p className="text-6xl font-bold mb-2">{score}%</p>
                <p className="text-xl">{correct} dari {total} soal benar</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{correct}</p>
                  <p className="text-sm text-gray-600">Benar</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{total - correct}</p>
                  <p className="text-sm text-gray-600">Salah</p>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  ⏱️ Waktu belajar: <strong>{formatTime(timeSpent)}</strong>
                </p>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Evaluasi</h2>
              {score >= 80 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="font-bold text-green-800 mb-2">Excellent! 🌟</p>
                  <p className="text-gray-700 text-sm">
                    Pemahaman kamu sangat baik! Lanjutkan ke paket berikutnya atau coba submateri lain.
                  </p>
                </div>
              )}
              {score >= 60 && score < 80 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="font-bold text-blue-800 mb-2">Good Job! 👍</p>
                  <p className="text-gray-700 text-sm">
                    Kamu sudah paham konsepnya. Review pembahasan soal yang salah untuk hasil lebih maksimal!
                  </p>
                </div>
              )}
              {score < 60 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                  <p className="font-bold text-yellow-800 mb-2">Keep Learning! 💪</p>
                  <p className="text-gray-700 text-sm">
                    Jangan khawatir! Coba ulangi paket ini dan pelajari pembahasan dengan teliti. Practice makes perfect!
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={function() { router.push(`/review/${sessionId}`) }}
                className="w-full bg-purple-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                📖 Review Lengkap dengan Pembahasan
              </button>
              
              <button
                onClick={resetAndRetry}
                className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Coba Paket Lain
              </button>
              
              <button
                onClick={function() { router.push('/') }}
                className="w-full bg-gray-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Home size={20} />
                Kembali ke Dashboard
              </button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  return null
}
