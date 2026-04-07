'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Trophy, TrendingUp, Target, Award, Calendar, CheckCircle } from 'lucide-react'

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

export default function Rapor() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    fetchRapor()
  }, [user])

  async function fetchRapor() {
    setLoading(true)

    // Fetch profile
    const { data: profileData } = await supabase
      .from('student_profiles')
      .select(`
        *,
        choice1:choice_1_major_id (
          id, name, passing_grade, faculty,
          universities (name, short_name)
        ),
        choice2:choice_2_major_id (
          id, name, passing_grade, faculty,
          universities (name, short_name)
        ),
        choice3:choice_3_major_id (
          id, name, passing_grade, faculty,
          universities (name, short_name)
        )
      `)
      .eq('user_id', user.id)
      .single()

    setProfile(profileData)

    if (!profileData?.final_tryout_completed) {
      router.push('/final-tryout')
      return
    }

    // Fetch all sessions stats
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, session_type, created_at')
      .eq('user_id', user.id)
      .eq('is_completed', true)

    const totalSessions = sessions?.length || 0
    const latihanCount = sessions?.filter(s => s.session_type === 'latihan').length || 0
    const tryoutCount = sessions?.filter(s => s.session_type === 'tryout').length || 0

    // Fetch user_progress for per-submateri stats
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)

    setStats({
      totalSessions,
      latihanCount,
      tryoutCount,
      progress: progress || []
    })

    setLoading(false)
  }

  function getLevelBadge(level) {
    if (level === 'smart') return { label: 'Smart ⭐', color: 'bg-yellow-100 text-yellow-700' }
    if (level === 'high') return { label: 'High 🟢', color: 'bg-green-100 text-green-700' }
    if (level === 'medium') return { label: 'Medium 🟡', color: 'bg-blue-100 text-blue-700' }
    if (level === 'low') return { label: 'Low 🔴', color: 'bg-red-100 text-red-700' }
    return { label: 'Unknown', color: 'bg-gray-100 text-gray-600' }
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

  const pretestScore = profile?.pretest_score || 0
  const finalScore = profile?.final_tryout_score || 0
  const improvement = finalScore - pretestScore
  const levelBadge = getLevelBadge(profile?.level)

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <Trophy size={64} className="mx-auto mb-4 text-yellow-500" />
            <h1 className="text-4xl font-bold mb-2">🎓 Rapor Evaluasi</h1>
            <p className="text-gray-600 text-lg">Perjalanan belajarmu di AIRoadToPTN</p>
          </div>

          {/* Main Score Comparison */}
          <div className="bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-white mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">📊 Perbandingan Skor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/20 rounded-xl p-6 text-center backdrop-blur">
                <p className="text-sm mb-2 opacity-90">Pretest (Awal)</p>
                <p className="text-5xl font-bold">{pretestScore}%</p>
                <p className="text-xs mt-2 opacity-75">{levelBadge.label}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-6 text-center backdrop-blur flex items-center justify-center">
                <div>
                  <TrendingUp size={48} className="mx-auto mb-2" />
                  <p className="text-4xl font-bold">
                    {improvement > 0 ? '+' : ''}{improvement}%
                  </p>
                  <p className="text-sm mt-2">Peningkatan</p>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-6 text-center backdrop-blur">
                <p className="text-sm mb-2 opacity-90">Final Try Out</p>
                <p className="text-5xl font-bold">{finalScore}%</p>
                <p className="text-xs mt-2 opacity-75">
                  {new Date(profile?.final_tryout_date).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              {improvement >= 20 && (
                <p className="text-xl font-bold">🎉 Luar biasa! Peningkatan sangat signifikan!</p>
              )}
              {improvement >= 10 && improvement < 20 && (
                <p className="text-xl font-bold">👏 Bagus! Progress yang solid!</p>
              )}
              {improvement > 0 && improvement < 10 && (
                <p className="text-xl font-bold">✨ Ada peningkatan! Terus berlatih!</p>
              )}
              {improvement <= 0 && (
                <p className="text-xl font-bold">💪 Tetap semangat! Fokus pada materi yang lemah!</p>
              )}
            </div>
          </div>

          {/* Aktivitas Belajar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={24} className="text-blue-600" />
                <h3 className="font-bold">Total Sesi</h3>
              </div>
              <p className="text-4xl font-bold text-blue-600">{stats?.totalSessions || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Sesi belajar diselesaikan</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={24} className="text-green-600" />
                <h3 className="font-bold">Latihan</h3>
              </div>
              <p className="text-4xl font-bold text-green-600">{stats?.latihanCount || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Sesi latihan per submateri</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <Target size={24} className="text-purple-600" />
                <h3 className="font-bold">Try Out</h3>
              </div>
              <p className="text-4xl font-bold text-purple-600">{stats?.tryoutCount || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Simulasi ujian lengkap</p>
            </div>
          </div>

          {/* Progress per Submateri */}
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">📚 Progress per Submateri</h2>
            <div className="space-y-4">
              {Object.entries(SUBMATERI_NAMES).map(function([code, name]) {
                const subProgress = stats?.progress?.find(p => p.submateri === code)
                const accuracy = subProgress?.accuracy_percentage || 0
                const barColor = accuracy >= 70 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                
                return (
                  <div key={code}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{code} - {name}</span>
                      <span className="font-bold">
                        {subProgress ? `${parseFloat(accuracy).toFixed(0)}%` : 'Belum ada data'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={'h-3 rounded-full transition-all ' + barColor}
                        style={{ width: accuracy + '%' }}
                      />
                    </div>
                    {subProgress && (
                      <p className="text-xs text-gray-500 mt-1">
                        {subProgress.correct_answers}/{subProgress.total_questions} benar
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Passing Grade Comparison */}
          {profile && (profile.choice1 || profile.choice2 || profile.choice3) && (
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-6">🎯 Perbandingan dengan Passing Grade</h2>
              <div className="space-y-4">
                {[profile.choice1, profile.choice2, profile.choice3].filter(Boolean).map(function(choice, idx) {
                  if (!choice) return null
                  const gap = finalScore - (choice.passing_grade || 0)
                  
                  return (
                    <div key={idx} className={'p-5 rounded-xl border-2 ' + (gap >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                              Pilihan {idx + 1}
                            </span>
                            {gap >= 0 && <CheckCircle size={20} className="text-green-600" />}
                          </div>
                          <p className="font-bold text-lg">{choice.name}</p>
                          <p className="text-sm text-gray-600">
                            {choice.universities?.name} • {choice.faculty}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Passing Grade: <span className="font-semibold">{choice.passing_grade}%</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={'text-3xl font-bold ' + (gap >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                          </p>
                          <p className="text-xs mt-1">
                            {gap >= 0 ? (
                              <span className="text-green-600 font-semibold">✅ Sudah melampaui!</span>
                            ) : (
                              <span className="text-red-600 font-semibold">⚠️ Masih kurang {Math.abs(gap).toFixed(1)}%</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rekomendasi */}
          <div className="bg-linear-to-r from-green-500 to-blue-500 rounded-xl shadow-lg p-8 text-white text-center">
            <Award size={56} className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Rekomendasi Selanjutnya</h2>
            {finalScore >= 80 ? (
              <div>
                <p className="text-lg mb-4">
                  Selamat! Kemampuanmu sudah sangat baik. Fokus pada:
                </p>
                <ul className="space-y-2 text-left max-w-2xl mx-auto">
                  <li>✅ Latihan soal-soal HOTS (Higher Order Thinking Skills)</li>
                  <li>✅ Manajemen waktu saat mengerjakan soal</li>
                  <li>✅ Review materi yang masih di bawah 80%</li>
                </ul>
              </div>
            ) : finalScore >= 60 ? (
              <div>
                <p className="text-lg mb-4">
                  Kamu di jalur yang benar! Tingkatkan dengan:
                </p>
                <ul className="space-y-2 text-left max-w-2xl mx-auto">
                  <li>🎯 Fokus pada submateri dengan skor &lt; 70%</li>
                  <li>🎯 Kerjakan lebih banyak latihan soal</li>
                  <li>🎯 Gunakan fitur Rehabilitasi untuk drilling</li>
                </ul>
              </div>
            ) : (
              <div>
                <p className="text-lg mb-4">
                  Jangan menyerah! Tingkatkan kemampuan dengan:
                </p>
                <ul className="space-y-2 text-left max-w-2xl mx-auto">
                  <li>💪 Review materi dasar dari Library</li>
                  <li>💪 Kerjakan latihan rutin setiap hari</li>
                  <li>💪 Fokus satu submateri sampai tuntas</li>
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mt-8">
            <button
              onClick={function() { router.push('/latihan') }}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              📝 Latihan Lagi
            </button>
            <button
              onClick={function() { router.push('/tryout') }}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              🎯 Try Out
            </button>
            <button
              onClick={function() { router.push('/profile') }}
              className="px-8 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700"
            >
              👤 Lihat Profil
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}