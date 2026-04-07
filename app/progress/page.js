'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const SUBMATERI_NAMES = {
  PU: 'Penalaran Umum',
  PPU: 'Pengetahuan & Pemahaman Umum',
  PBM: 'Pemahaman Bacaan & Menulis',
  PK: 'Pengetahuan Kuantitatif',
  LBI: 'Literasi Bahasa Indonesia',
  LBE: 'Literasi Bahasa Inggris',
  PM: 'Penalaran Matematika'
}

export default function Progress() {
  const { user } = useAuth()
  const router = useRouter()
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalSessions, setTotalSessions] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchProgress()
  }, [user, router])

  const fetchProgress = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching progress:', error)
      setLoading(false)
      return
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_completed', true)

    if (!sessionsError) {
      setTotalSessions(sessions.length)
    }

    setProgressData(data || [])
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
            <p className="text-gray-600">Memuat data progress...</p>
          </div>
        </div>
      </div>
    )
  }

  const chartLabels = ['PU', 'PPU', 'PBM', 'PK', 'LBI', 'LBE', 'PM']
  const chartDataValues = chartLabels.map(submateri => {
    const found = progressData.find(p => p.submateri === submateri)
    return found ? parseFloat(found.accuracy_percentage) : 0
  })

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Akurasi (%)',
      data: chartDataValues,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(59, 130, 246)'
    }]
  }

  const chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  }

  const weakSubjects = progressData
    .filter(p => parseFloat(p.accuracy_percentage) < 70)
    .sort((a, b) => parseFloat(a.accuracy_percentage) - parseFloat(b.accuracy_percentage))

  const strongSubjects = progressData
    .filter(p => parseFloat(p.accuracy_percentage) >= 70)
    .sort((a, b) => parseFloat(b.accuracy_percentage) - parseFloat(a.accuracy_percentage))

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Progress Belajar</h1>
            <p className="text-gray-600">Tracking kemajuan dan analisis kekuatan kamu</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="text-2xl font-bold text-blue-600">{totalSessions}</h3>
              <p className="text-gray-600">Total Sesi Latihan</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="text-2xl font-bold text-green-600">{strongSubjects.length}</h3>
              <p className="text-gray-600">Materi Dikuasai (≥70%)</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-2">📈</div>
              <h3 className="text-2xl font-bold text-orange-600">{weakSubjects.length}</h3>
              <p className="text-gray-600">Perlu Ditingkatkan (&lt;70%)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-center">Sebaran Kekuatan UTBK</h2>
              {progressData.length > 0 ? (
                <div className="max-w-md mx-auto">
                  <Radar data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Belum ada data progress</p>
                  <p className="text-sm text-gray-400">Mulai latihan untuk melihat progress kamu!</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {weakSubjects.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                  <h3 className="font-bold text-lg mb-4 text-red-800">Perlu Fokus Lebih</h3>
                  <div className="space-y-3">
                    {weakSubjects.map(subject => (
                      <div key={subject.submateri} className="flex justify-between items-center bg-white p-3 rounded">
                        <div>
                          <p className="font-medium">{subject.submateri}</p>
                          <p className="text-sm text-gray-600">{SUBMATERI_NAMES[subject.submateri]}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            {parseFloat(subject.accuracy_percentage).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {subject.correct_answers}/{subject.total_questions} benar
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {strongSubjects.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                  <h3 className="font-bold text-lg mb-4 text-green-800">Materi Dikuasai</h3>
                  <div className="space-y-3">
                    {strongSubjects.map(subject => (
                      <div key={subject.submateri} className="flex justify-between items-center bg-white p-3 rounded">
                        <div>
                          <p className="font-medium">{subject.submateri}</p>
                          <p className="text-sm text-gray-600">{SUBMATERI_NAMES[subject.submateri]}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {parseFloat(subject.accuracy_percentage).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {subject.correct_answers}/{subject.total_questions} benar
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {progressData.length === 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg text-center">
                  <p className="text-blue-800 font-medium mb-2">Mulai Latihan Sekarang!</p>
                  <p className="text-blue-600 text-sm">Kerjakan latihan soal untuk melihat progress dan rekomendasi belajar</p>
                </div>
              )}
            </div>
          </div>

          {progressData.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg mb-4">Detail Progress Per Submateri</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Submateri</th>
                      <th className="px-4 py-3 text-center">Total Soal</th>
                      <th className="px-4 py-3 text-center">Benar</th>
                      <th className="px-4 py-3 text-center">Akurasi</th>
                      <th className="px-4 py-3 text-center">Avg Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressData.map(subject => (
                      <tr key={subject.submateri} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{subject.submateri}</div>
                          <div className="text-sm text-gray-500">{SUBMATERI_NAMES[subject.submateri]}</div>
                        </td>
                        <td className="px-4 py-3 text-center">{subject.total_questions}</td>
                        <td className="px-4 py-3 text-center">{subject.correct_answers}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            parseFloat(subject.accuracy_percentage) >= 70 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {parseFloat(subject.accuracy_percentage).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {parseFloat(subject.avg_time_per_question).toFixed(1)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}