'use client'
import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

function WholeAnalysisContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTryout = parseInt(searchParams.get('tryout') || '3')

  const [loading, setLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    fetchAnalysis()
  }, [user])

  async function fetchAnalysis() {
    setLoading(true)

    const { data: profileData } = await supabase
      .from('student_profiles')
      .select(`
        *,
        choice1:choice_1_major_id (
          id, name, passing_grade,
          universities (name, short_name)
        ),
        choice2:choice_2_major_id (
          id, name, passing_grade,
          universities (name, short_name)
        ),
        choice3:choice_3_major_id (
          id, name, passing_grade,
          universities (name, short_name)
        )
      `)
      .eq('user_id', user.id)
      .single()

    setProfile(profileData)

    const { data: sessions } = await supabase
      .from('sessions')
      .select(`
        id,
        tryout_number,
        created_at,
        user_answers (
          is_correct,
          questions (submateri)
        )
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'tryout')
      .eq('is_completed', true)
      .order('tryout_number', { ascending: false })
      .limit(3)

    if (!sessions || sessions.length === 0) {
      setLoading(false)
      return
    }

    const tryoutScores = sessions.reverse().map(function(s) {
      const total = s.user_answers.length
      const correct = s.user_answers.filter(function(a) { return a.is_correct }).length
      const score = total > 0 ? Math.round((correct / total) * 100) : 0

      const scoreBySubject = {}
      s.user_answers.forEach(function(a) {
        const sub = a.questions?.submateri
        if (!sub) return
        if (!scoreBySubject[sub]) {
          scoreBySubject[sub] = { total: 0, correct: 0 }
        }
        scoreBySubject[sub].total++
        if (a.is_correct) scoreBySubject[sub].correct++
      })

      return {
        number: s.tryout_number,
        date: new Date(s.created_at).toLocaleDateString('id-ID'),
        overallScore: score,
        scoreBySubject: scoreBySubject
      }
    })

    const avgScore = Math.round(
      tryoutScores.reduce(function(sum, t) { return sum + t.overallScore }, 0) / tryoutScores.length
    )

    const firstScore = tryoutScores[0]?.overallScore || 0
    const lastScore = tryoutScores[tryoutScores.length - 1]?.overallScore || 0
    const trend = lastScore - firstScore

    const submateriAvg = {}
    Object.keys(SUBMATERI_NAMES).forEach(function(sub) {
      const scores = tryoutScores.map(function(t) {
        const data = t.scoreBySubject[sub]
        return data ? Math.round((data.correct / data.total) * 100) : 0
      })
      submateriAvg[sub] = scores.reduce(function(a, b) { return a + b }, 0) / scores.length
    })

    const sortedSub = Object.entries(submateriAvg).sort(function(a, b) { return b[1] - a[1] })
    const bestSubmateri = sortedSub[0]
    const worstSubmateri = sortedSub[sortedSub.length - 1]

    setAnalysisData({
      tryoutScores,
      avgScore,
      trend,
      bestSubmateri,
      worstSubmateri,
      submateriAvg
    })

    setLoading(false)
  }

  if (!user) return null

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto text-center py-16">
            <p className="text-6xl mb-4">📊</p>
            <h1 className="text-2xl font-bold mb-4">Belum Ada Data Tryout</h1>
            <p className="text-gray-600 mb-6">Kerjakan minimal 3 tryout untuk melihat whole analysis</p>
            <button
              onClick={function() { router.push('/tryout') }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Mulai Tryout
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { tryoutScores, avgScore, trend, bestSubmateri, worstSubmateri, submateriAvg } = analysisData

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">📊 Whole Analysis</h1>
            <p className="text-gray-600">Analisis komprehensif {tryoutScores.length} tryout terakhir</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-gray-500 mb-2">Rata-rata Skor</p>
              <p className="text-5xl font-bold text-blue-600">{avgScore}%</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-gray-500 mb-2">Tren</p>
              <div className="flex items-center justify-center gap-2">
                {trend >= 0 ? (
                  <TrendingUp size={32} className="text-green-600" />
                ) : (
                  <TrendingDown size={32} className="text-red-600" />
                )}
                <p className={'text-5xl font-bold ' + (trend >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {trend > 0 ? '+' : ''}{trend}%
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-gray-500 mb-2">Total Tryout</p>
              <p className="text-5xl font-bold text-purple-600">{currentTryout}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">📈 Riwayat Tryout</h2>
            <div className="space-y-3">
              {tryoutScores.map(function(t) {
                return (
                  <div key={t.number} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-bold">Tryout #{t.number}</p>
                      <p className="text-sm text-gray-500">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">{t.overallScore}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Award size={24} className="text-green-600" />
                <h3 className="font-bold text-lg">Materi Terkuat</h3>
              </div>
              <p className="text-2xl font-bold text-green-700">{bestSubmateri[0]}</p>
              <p className="text-gray-600">{SUBMATERI_NAMES[bestSubmateri[0]]}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {Math.round(bestSubmateri[1])}%
              </p>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Target size={24} className="text-red-600" />
                <h3 className="font-bold text-lg">Perlu Fokus Lebih</h3>
              </div>
              <p className="text-2xl font-bold text-red-700">{worstSubmateri[0]}</p>
              <p className="text-gray-600">{SUBMATERI_NAMES[worstSubmateri[0]]}</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {Math.round(worstSubmateri[1])}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">📚 Rata-rata per Submateri</h2>
            <div className="space-y-4">
              {Object.entries(submateriAvg).map(function([sub, avg]) {
                const barColor = avg >= 70 ? 'bg-green-500' : avg >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                return (
                  <div key={sub}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{sub} - {SUBMATERI_NAMES[sub]}</span>
                      <span className="font-bold">{Math.round(avg)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={'h-3 rounded-full transition-all ' + barColor} style={{ width: avg + '%' }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {profile && (profile.choice1 || profile.choice2 || profile.choice3) && (
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">🎯 Jarak ke Passing Grade</h2>
              <div className="space-y-4">
                {[profile.choice1, profile.choice2, profile.choice3].filter(Boolean).map(function(choice, idx) {
                  if (!choice) return null
                  const gap = avgScore - (choice.passing_grade || 0)
                  return (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">{choice.name}</p>
                          <p className="text-sm text-gray-500">
                            {choice.universities?.name} • PG: {choice.passing_grade}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={'text-2xl font-bold ' + (gap >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {gap >= 0 ? '✅ Sudah capai!' : '⚠️ Masih kurang'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={function() { router.push('/tryout') }}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              🎯 Tryout Lagi
            </button>
            <button
              onClick={function() { router.push('/growup') }}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
            >
              🚀 Grow Up (Fokus Materi Lemah)
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function WholeAnalysis() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    }>
      <WholeAnalysisContent />
    </Suspense>
  )
}