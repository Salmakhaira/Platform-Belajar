'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupProfile() {
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(1) // 1: data diri, 2: pilih jurusan
  const [loading, setLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(true)

  // Step 1: Data diri
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [graduationYear, setGraduationYear] = useState('2026')

  // Step 2: Pilih jurusan
  const [universities, setUniversities] = useState([])
  const [majors, setMajors] = useState([])
  const [choice1, setChoice1] = useState({ university: '', major: '' })
  const [choice2, setChoice2] = useState({ university: '', major: '' })
  const [choice3, setChoice3] = useState({ university: '', major: '' })
  const [majors1, setMajors1] = useState([])
  const [majors2, setMajors2] = useState([])
  const [majors3, setMajors3] = useState([])

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    checkExistingProfile()
    fetchUniversities()
  }, [user])

  async function checkExistingProfile() {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data && data.choice_1_major_id) {
      // Profil sudah ada, redirect ke dashboard
      router.push('/')
      return
    }
    setCheckingProfile(false)
  }

  async function fetchUniversities() {
    const { data } = await supabase
      .from('universities')
      .select('*')
      .order('name')
    setUniversities(data || [])
  }

  async function fetchMajors(universityId, choiceNum) {
    const { data } = await supabase
      .from('majors')
      .select('*')
      .eq('university_id', universityId)
      .order('name')

    if (choiceNum === 1) setMajors1(data || [])
    if (choiceNum === 2) setMajors2(data || [])
    if (choiceNum === 3) setMajors3(data || [])
  }

  function handleUniversityChange(value, choiceNum) {
    if (choiceNum === 1) {
      setChoice1({ university: value, major: '' })
      fetchMajors(value, 1)
    }
    if (choiceNum === 2) {
      setChoice2({ university: value, major: '' })
      fetchMajors(value, 2)
    }
    if (choiceNum === 3) {
      setChoice3({ university: value, major: '' })
      fetchMajors(value, 3)
    }
  }

  async function handleSubmit() {
    if (!choice1.major) {
      alert('Pilihan 1 wajib diisi!')
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
        choice_1_major_id: choice1.major || null,
        choice_2_major_id: choice2.major || null,
        choice_3_major_id: choice3.major || null,
        updated_at: new Date().toISOString()
      })

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/pretest') // Langsung ke pretest setelah setup
  }

  if (!user || checkingProfile) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">AIRoadToPTN</h1>
          <p className="text-gray-500 mt-2">Setup profil untuk memulai perjalananmu</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={'flex items-center gap-2 ' + (step >= 1 ? 'text-blue-600' : 'text-gray-400')}>
            <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + (step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200')}>
              1
            </div>
            <span className="text-sm font-medium">Data Diri</span>
          </div>
          <div className={'w-16 h-1 rounded ' + (step >= 2 ? 'bg-blue-600' : 'bg-gray-200')}></div>
          <div className={'flex items-center gap-2 ' + (step >= 2 ? 'text-blue-600' : 'text-gray-400')}>
            <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + (step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200')}>
              2
            </div>
            <span className="text-sm font-medium">Pilih Jurusan</span>
          </div>
        </div>

        {/* STEP 1: Data Diri */}
        {step === 1 && (
          <div className="space-y-5">
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

            <button
              onClick={function() {
                if (!fullName || !school) {
                  alert('Nama dan sekolah wajib diisi!')
                  return
                }
                setStep(2)
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all"
            >
              Lanjut →
            </button>
          </div>
        )}

        {/* STEP 2: Pilih Jurusan */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-blue-800 text-sm font-medium">
                💡 Pilih maksimal 3 jurusan yang kamu inginkan. Pilihan 1 wajib diisi.
              </p>
            </div>

            {/* Pilihan 1 */}
            <ChoiceInput
              label="Pilihan 1"
              required={true}
              badge="bg-blue-600"
              universities={universities}
              majors={majors1}
              choice={choice1}
              onUniversityChange={function(v) { handleUniversityChange(v, 1) }}
              onMajorChange={function(v) { setChoice1({ ...choice1, major: v }) }}
              majorList={majors1}
            />

            {/* Pilihan 2 */}
            <ChoiceInput
              label="Pilihan 2"
              required={false}
              badge="bg-purple-500"
              universities={universities}
              majors={majors2}
              choice={choice2}
              onUniversityChange={function(v) { handleUniversityChange(v, 2) }}
              onMajorChange={function(v) { setChoice2({ ...choice2, major: v }) }}
              majorList={majors2}
            />

            {/* Pilihan 3 */}
            <ChoiceInput
              label="Pilihan 3"
              required={false}
              badge="bg-green-500"
              universities={universities}
              majors={majors3}
              choice={choice3}
              onUniversityChange={function(v) { handleUniversityChange(v, 3) }}
              onMajorChange={function(v) { setChoice3({ ...choice3, major: v }) }}
              majorList={majors3}
            />

            <div className="flex gap-3">
              <button
                onClick={function() { setStep(1) }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                ← Kembali
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-2 bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Menyimpan...' : 'Mulai Pretest! 🚀'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function ChoiceInput(props) {
  const majorList = props.majorList || []

  return (
    <div className="border-2 border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={'text-white text-xs font-bold px-3 py-1 rounded-full ' + props.badge}>
          {props.label}
        </span>
        {props.required ? (
          <span className="text-red-500 text-xs">* Wajib</span>
        ) : (
          <span className="text-gray-400 text-xs">Opsional</span>
        )}
      </div>

      <div className="space-y-3">
        <select
          value={props.choice.university}
          onChange={function(e) { props.onUniversityChange(e.target.value) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
        >
          <option value="">-- Pilih Universitas --</option>
          {props.universities.map(function(u) {
            return <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
          })}
        </select>

        {props.choice.university && (
          <select
            value={props.choice.major}
            onChange={function(e) { props.onMajorChange(e.target.value) }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
          >
            <option value="">-- Pilih Jurusan --</option>
            {majorList.map(function(m) {
              return (
                <option key={m.id} value={m.id}>
                  {m.name} - PG: {m.passing_grade}%
                </option>
              )
            })}
          </select>
        )}
      </div>
    </div>
  )
}