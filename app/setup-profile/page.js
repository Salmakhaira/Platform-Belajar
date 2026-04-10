'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupProfile() {
  const { user } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(true)

  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [graduationYear, setGraduationYear] = useState('2026')
  const [targetPassingGrade, setTargetPassingGrade] = useState(null)

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkExistingProfile()
  }, [user])

  async function checkExistingProfile() {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data && data.target_passing_grade) {
      if (data.pretest_completed) {
        router.push('/')
      } else {
        router.push('/pretest')
      }
      return
    }
    setCheckingProfile(false)
  }

  async function handleSubmit() {
    if (!fullName || !school) {
      alert('Nama dan sekolah wajib diisi!')
      return
    }

    if (!targetPassingGrade) {
      alert('Pilih target passing grade!')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('student_profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        school: school,
        graduation_year: parseInt(graduationYear),
        target_passing_grade: targetPassingGrade,
        current_score: 0,
        needs_drilling: false,
        pretest_completed: false,
        updated_at: new Date().toISOString()
      })

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/pretest')
  }

  if (!user || checkingProfile) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">Setup Profil</h1>
          <p className="text-gray-500 mt-2">Mulai perjalanan menuju PTN impianmu</p>
        </div>

        <div className="space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Data Diri</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={function(e) { setFullName(e.target.value) }}
                placeholder="Masukkan nama lengkap"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asal Sekolah <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={school}
                onChange={function(e) { setSchool(e.target.value) }}
                placeholder="Contoh: SMA Negeri 1 Jakarta"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tahun Lulus
              </label>
              <select
                value={graduationYear}
                onChange={function(e) { setGraduationYear(e.target.value) }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">🎯 Pilih Target</h2>
            <p className="text-sm text-gray-600 mb-4">
              Pilih passing grade PTN/Jurusan yang kamu targetkan
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <button
                onClick={function() { setTargetPassingGrade(700) }}
                className={
                  'border-2 rounded-xl p-6 text-left transition-all hover:shadow-lg ' +
                  (targetPassingGrade === 700 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300')
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Target 1</h3>
                    <p className="text-xs text-gray-500 mt-1">PTN/Jurusan Pilihan Pertama</p>
                  </div>
                  {targetPassingGrade === 700 && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-blue-600">700</span>
                    <span className="text-gray-500 text-sm">Passing Grade</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Kamu akan latihan hingga mencapai atau melewati score ini
                  </p>
                </div>
              </button>

              <button
                onClick={function() { setTargetPassingGrade(712) }}
                className={
                  'border-2 rounded-xl p-6 text-left transition-all hover:shadow-lg ' +
                  (targetPassingGrade === 712 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300')
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Target 2</h3>
                    <p className="text-xs text-gray-500 mt-1">PTN/Jurusan Alternatif</p>
                  </div>
                  {targetPassingGrade === 712 && (
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-purple-600">712</span>
                    <span className="text-gray-500 text-sm">Passing Grade</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Target lebih tinggi untuk challenge diri sendiri
                  </p>
                </div>
              </button>

            </div>
          </div>

          {targetPassingGrade && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                <span>✅</span>
                <span>
                  Target dipilih: <strong>{targetPassingGrade}</strong> — 
                  Sistem akan guide kamu dengan drilling soal hingga mencapai target ini!
                </span>
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !targetPassingGrade}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Menyimpan...' : 'Mulai Pretest! 🚀'}
          </button>

        </div>

      </div>
    </div>
  )
}
