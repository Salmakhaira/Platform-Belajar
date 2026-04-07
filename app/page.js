'use client'
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { BookOpen, Target, TrendingUp, BarChart } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Kalau loading auth, jangan render apa-apa dulu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-linear-to-br from-blue-100 to-purple-100">
        
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20 text-center">
          <div className="text-5xl md:text-6xl mb-4">🎓</div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-blue-900">
            Platform Study Road to PTN
          </h1>
          <p className="text-base md:text-xl lg:text-2xl mb-6 md:mb-8 text-gray-700 max-w-2xl mx-auto px-4">
            Persiapan UTBK Lengkap untuk Ami dungdung
          </p>
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              <button
                onClick={() => router.push('/register')}
                className="bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl text-base md:text-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
              >
                Mulai Belajar Sekarang
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-white text-blue-600 border-2 border-blue-600 px-6 md:px-8 py-3 md:py-4 rounded-xl text-base md:text-xl font-bold hover:bg-blue-50 transition-all"
              >
                Sudah Punya Akun
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/latihan')}
              className="bg-blue-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl text-lg md:text-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
            >
              Mulai Belajar Sekarang →
            </button>
          )}
        </div>

        {/* Features Grid */}
        <div className="bg-white py-12 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-8 md:mb-12 text-gray-800">
              Fitur Lengkap
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
              
              <FeatureCard
                icon={<BookOpen size={40} className="text-blue-600" />}
                title="Latihan Soal"
                description="30 menit per submateri dengan timer otomatis"
                onClick={() => user ? router.push('/latihan') : router.push('/register')}
              />

              <FeatureCard
                icon={<Target size={40} className="text-red-500" />}
                title="Tryout"
                description="Simulasi ujian lengkap dengan analisis hasil"
                onClick={() => user ? router.push('/tryout') : router.push('/register')}
              />

              <FeatureCard
                icon={<BarChart size={40} className="text-green-600" />}
                title="Progress"
                description="Tracking kemajuan dan rekomendasi belajar"
                onClick={() => user ? router.push('/progress') : router.push('/register')}
              />

              <FeatureCard
                icon={<TrendingUp size={40} className="text-purple-600" />}
                title="Grow Up"
                description="Rehabilitasi fokus pada materi lemah"
                onClick={() => user ? router.push('/growup') : router.push('/register')}
              />

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all text-left border-2 border-gray-100 hover:border-blue-300 w-full"
    >
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg md:text-xl font-bold mb-2 text-center text-gray-800">
        {title}
      </h3>
      <p className="text-sm md:text-base text-gray-600 text-center">
        {description}
      </p>
    </button>
  )
}