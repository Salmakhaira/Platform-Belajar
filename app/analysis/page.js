'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { TrendingUp, TrendingDown, Minus, Award, Target, BookOpen, BarChart3, Home } from 'lucide-react'

const SUBMATERI_NAMES = {
  'PU': 'Penalaran Umum',
  'PPU': 'Pengetahuan & Pemahaman Umum',
  'PBM': 'Pemahaman Bacaan & Menulis',
  'PK': 'Pengetahuan Kuantitatif',
  'LBI': 'Literasi Bahasa Indonesia',
  'LBE': 'Literasi Bahasa Inggris',
  'PM': 'Penalaran Matematika'
}

export default function Analysis() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isHighlight = searchParams.get('highlight') === 'true'

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    loadAnalysis()
  }, [user, router])

  async function loadAnalysis() {
    setLoading(true)

    const { data: profileData, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !profileData) {
      console.error('Error loading profile:', error)
      setLoading(false)
      return
    }

    setProfile(profileData)

    // Analyze if we have 3+ tryouts
    if (profileData.tryout_completed_count >= 3 && profileData.latest_tryout_scores) {
      const { analyzeTryoutProgress } = await import('@/lib/utbkScoring')
      const analysisResult = analyzeTryoutProgress(profileData.latest_tryout_scores)
      setAnalysis(analysisResult)
    }

    setLoading(false)
  }

  if (!user) return null

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat analisis...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile || profile.tryout_completed_count < 3) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h1 className="text-3xl font-bold mb-4 text-gray-800">Analisis Kemampuan</h1>
              <p className="text-gray-600 mb-6">
                Kamu sudah menyelesaikan <strong>{profile?.tryout_completed_count || 0}</strong> dari <strong>3 tryout</strong> yang diperlukan untuk analisis.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                <p className="text-blue-800 text-sm">
                  💡 Selesaikan minimal 3 tryout untuk mendapatkan analisis kemampuan yang komprehensif!
                </p>
              </div>
              <button
                onClick={function() { router.push('/tryout') }}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Kerjakan Tryout
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Has analysis
  const tryoutScores = profile.latest_tryout_scores || []
  const trend = analysis?.trend || 'stable'
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
        <div className="max-w-6xl mx-auto">

          {/* Highlight Alert - Shown after completing 3rd tryout */}
          {isHighlight && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-8 mb-8 animate-pulse">
              <div className="flex items-center gap-4">
                <Award size={48} />
                <div>
                  <h2 className="text-2xl font-bold mb-2">🎉 Selamat! Analisis Siap!</h2>
                  <p className="text-green-100">
                    Kamu telah menyelesaikan 3 tryout. Berikut adalah analisis kemampuan kamu!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 text-gray-800">📊 Analisis Kemampuan</h1>
            <p className="text-gray-600">Berdasarkan 3 tryout terakhir kamu</p>
          </div>

          {/* Score Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Target size={32} className="mx-auto mb-3 text-indigo-600" />
              <p className="text-sm text-gray-600 mb-2">Rata-rata Skor</p>
              <p className="text-4xl font-bold text-indigo-600">{analysis.avgScore}</p>
              <p className="text-xs text-gray-500 mt-1">Skala 0-1000</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <TrendIcon size={32} className={'mx-auto mb-3 ' + (
                trend === 'improving' ? 'text-green-600' :
                trend === 'declining' ? 'text-red-600' : 'text-gray-600'
              )} />
              <p className="text-sm text-gray-600 mb-2">Tren Performa</p>
              <p className={'text-2xl font-bold ' + (
                trend === 'improving' ? 'text-green-600' :
                trend === 'declining' ? 'text-red-600' : 'text-gray-600'
              )}>
                {trend === 'improving' ? '📈 Meningkat' : 
                 trend === 'declining' ? '📉 Menurun' : '➡️ Stabil'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analysis.improvement > 0 ? '+' : ''}{analysis.improvement} poin
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <BarChart3 size={32} className="mx-auto mb-3 text-purple-600" />
              <p className="text-sm text-gray-600 mb-2">Konsistensi</p>
              <p className="text-2xl font-bold text-purple-600">
                {analysis.consistency === 'consistent' ? '⭐ Konsisten' :
                 analysis.consistency === 'moderate' ? '⚡ Cukup' : '⚠️ Fluktuatif'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Std Dev: {analysis.stdDev}</p>
            </div>
          </div>

          {/* Score History */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📈 Riwayat Skor</h2>
            <div className="space-y-4">
              {tryoutScores.map((tryout, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-600">#{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Tryout {tryout.tryoutNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tryout.date).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-indigo-600">{tryout.normalizedScore}</p>
                    <p className="text-sm text-gray-500">{tryout.percentage}% benar</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submateri Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📚 Analisis Per Submateri</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.keys(analysis.submateriAnalysis || {}).map(submateri => {
                const data = analysis.submateriAnalysis[submateri]
                const category = data.category
                
                let bgColor = 'bg-gray-100'
                let textColor = 'text-gray-700'
                let icon = '📊'
                
                if (category === 'strong') {
                  bgColor = 'bg-green-100'
                  textColor = 'text-green-800'
                  icon = '💪'
                } else if (category === 'good') {
                  bgColor = 'bg-blue-100'
                  textColor = 'text-blue-800'
                  icon = '👍'
                } else if (category === 'needs_improvement') {
                  bgColor = 'bg-yellow-100'
                  textColor = 'text-yellow-800'
                  icon = '⚠️'
                } else if (category === 'weak') {
                  bgColor = 'bg-red-100'
                  textColor = 'text-red-800'
                  icon = '⚡'
                }
                
                return (
                  <div key={submateri} className={`${bgColor} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`font-semibold ${textColor}`}>
                        {icon} {SUBMATERI_NAMES[submateri] || submateri}
                      </p>
                      <span className={`text-2xl font-bold ${textColor}`}>
                        {data.avgPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          category === 'strong' ? 'bg-green-600' :
                          category === 'good' ? 'bg-blue-600' :
                          category === 'needs_improvement' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${data.avgPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <BookOpen size={32} />
              Rekomendasi Belajar
            </h2>
            <div className="space-y-4">
              {(analysis.recommendations || []).map((rec, idx) => (
                <div key={idx} className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                  <p className="font-medium">
                    {rec.type === 'overall' && '🎯 '}
                    {rec.type === 'trend' && '📈 '}
                    {rec.type === 'focus' && '🔍 '}
                    {rec.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={function() { router.push('/tryout') }}
              className="bg-indigo-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              🎯 Kerjakan Tryout Lagi
            </button>
            <button
              onClick={function() { router.push('/') }}
              className="bg-gray-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
